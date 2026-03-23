package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "strconv"
    "time"

    "attendance-tracker/internal/db"
    "attendance-tracker/internal/models"

    "github.com/gorilla/mux"
    "github.com/joho/godotenv"
)

// Глобальное подключение к БД
var dbConn *sql.DB

// ---------- Вспомогательные функции для JSON-ответов ----------
type errorResponse struct {
    Error string `json:"error"`
}

func respondWithJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("Error encoding JSON response: %v", err)
    }
}

func respondWithError(w http.ResponseWriter, status int, message string) {
    respondWithJSON(w, status, errorResponse{Error: message})
}

// ---------- Middleware ----------

// authMiddleware читает заголовок X-User-Id и добавляет пользователя в контекст
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userIDHeader := r.Header.Get("X-User-Id")
        if userIDHeader == "" {
            respondWithError(w, http.StatusUnauthorized, "missing X-User-Id header")
            return
        }
        userID, err := strconv.Atoi(userIDHeader)
        if err != nil {
            respondWithError(w, http.StatusUnauthorized, "invalid user id")
            return
        }
        user, err := models.GetUserByID(dbConn, userID)
        if err != nil {
            respondWithError(w, http.StatusUnauthorized, "user not found")
            return
        }
        ctx := context.WithValue(r.Context(), "user", user)
        next.ServeHTTP(w, r.WithContext(ctx))
    }
}

// getUserFromContext извлекает пользователя из контекста запроса
func getUserFromContext(r *http.Request) *models.User {
    val := r.Context().Value("user")
    if val == nil {
        return nil
    }
    return val.(*models.User)
}

// ---------- Обработчик для отдачи base.html (точка входа SPA) ----------
func indexHandler(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "templates/base.html")
}

// ---------- API обработчики ----------

// GET /api/users – возвращает список всех пользователей (без аутентификации)
func apiUsersHandler(w http.ResponseWriter, r *http.Request) {
    users, err := models.GetUsers(dbConn)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to fetch users")
        return
    }
    respondWithJSON(w, http.StatusOK, users)
}

// POST /api/attendance-records – создание записи (employee)
func apiCreateRecordHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil {
        respondWithError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    if user.Role != "employee" {
        respondWithError(w, http.StatusForbidden, "only employees can create records")
        return
    }

    var req struct {
        Type   string `json:"type"`
        Date   string `json:"date"`
        Reason string `json:"reason"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    // Валидация
    if req.Type == "" || req.Date == "" || req.Reason == "" {
        respondWithError(w, http.StatusBadRequest, "all fields are required")
        return
    }
    if req.Type != "late" && req.Type != "absence" {
        respondWithError(w, http.StatusBadRequest, "type must be 'late' or 'absence'")
        return
    }
    if req.Date > time.Now().Format("2006-01-02") {
        respondWithError(w, http.StatusBadRequest, "date cannot be in the future")
        return
    }

    record := &models.AttendanceRecord{
        UserID: user.ID,
        Type:   req.Type,
        Date:   req.Date,
        Reason: req.Reason,
    }
    if err := models.CreateRecord(dbConn, record); err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to create record")
        return
    }
    respondWithJSON(w, http.StatusCreated, record)
}

// GET /api/attendance-records/my – записи текущего пользователя
func apiGetMyRecordsHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil {
        respondWithError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    records, err := models.GetRecordsByUser(dbConn, user.ID)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to fetch records")
        return
    }
    respondWithJSON(w, http.StatusOK, records)
}

// PUT /api/attendance-records/{id} – редактирование записи (employee, только pending)
func apiUpdateRecordHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil || user.Role != "employee" {
        respondWithError(w, http.StatusForbidden, "only employees can update records")
        return
    }

    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid record id")
        return
    }

    existing, err := models.GetRecordByID(dbConn, id)
    if err != nil {
        respondWithError(w, http.StatusNotFound, "record not found")
        return
    }
    if existing.UserID != user.ID {
        respondWithError(w, http.StatusForbidden, "you can only edit your own records")
        return
    }
    if existing.Status != "pending" {
        respondWithError(w, http.StatusForbidden, "only pending records can be edited")
        return
    }

    var req struct {
        Type   string `json:"type"`
        Date   string `json:"date"`
        Reason string `json:"reason"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    if req.Type == "" || req.Date == "" || req.Reason == "" {
        respondWithError(w, http.StatusBadRequest, "all fields are required")
        return
    }
    if req.Type != "late" && req.Type != "absence" {
        respondWithError(w, http.StatusBadRequest, "type must be 'late' or 'absence'")
        return
    }
    if req.Date > time.Now().Format("2006-01-02") {
        respondWithError(w, http.StatusBadRequest, "date cannot be in the future")
        return
    }

    updated := &models.AttendanceRecord{
        Type:   req.Type,
        Date:   req.Date,
        Reason: req.Reason,
    }
    if err := models.UpdateRecord(dbConn, id, updated); err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to update record")
        return
    }
    // Получаем обновлённую запись для ответа
    record, _ := models.GetRecordByID(dbConn, id)
    respondWithJSON(w, http.StatusOK, record)
}

// DELETE /api/attendance-records/{id} – удаление записи (employee, только pending)
func apiDeleteRecordHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil || user.Role != "employee" {
        respondWithError(w, http.StatusForbidden, "only employees can delete records")
        return
    }

    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid record id")
        return
    }

    existing, err := models.GetRecordByID(dbConn, id)
    if err != nil {
        respondWithError(w, http.StatusNotFound, "record not found")
        return
    }
    if existing.UserID != user.ID {
        respondWithError(w, http.StatusForbidden, "you can only delete your own records")
        return
    }
    if existing.Status != "pending" {
        respondWithError(w, http.StatusForbidden, "only pending records can be deleted")
        return
    }

    if err := models.DeleteRecord(dbConn, id); err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to delete record")
        return
    }
    respondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GET /api/attendance-records – для admin с фильтрами (user_id, type, status, from, to)
func apiGetAllRecordsHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil || user.Role != "admin" {
        respondWithError(w, http.StatusForbidden, "only admins can view all records")
        return
    }

    filterUserID := r.URL.Query().Get("user_id")
    filterType := r.URL.Query().Get("type")
    filterStatus := r.URL.Query().Get("status")
    filterFrom := r.URL.Query().Get("from")
    filterTo := r.URL.Query().Get("to")

    records, err := models.GetAllRecords(dbConn, filterUserID, filterType, filterStatus, filterFrom, filterTo)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to fetch records")
        return
    }
    respondWithJSON(w, http.StatusOK, records)
}

// POST /api/attendance-records/{id}/approve – approve (admin)
func apiApproveRecordHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil || user.Role != "admin" {
        respondWithError(w, http.StatusForbidden, "only admins can approve records")
        return
    }

    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid record id")
        return
    }

    if err := models.ApproveRecord(dbConn, id); err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to approve record")
        return
    }
    respondWithJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

// POST /api/attendance-records/{id}/reject – reject (admin)
func apiRejectRecordHandler(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r)
    if user == nil || user.Role != "admin" {
        respondWithError(w, http.StatusForbidden, "only admins can reject records")
        return
    }

    vars := mux.Vars(r)
    id, err := strconv.Atoi(vars["id"])
    if err != nil {
        respondWithError(w, http.StatusBadRequest, "invalid record id")
        return
    }

    if err := models.RejectRecord(dbConn, id); err != nil {
        respondWithError(w, http.StatusInternalServerError, "failed to reject record")
        return
    }
    respondWithJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

// ---------- Основная функция ----------
func main() {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    var err error
    dbConn, err = db.Connect()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer dbConn.Close()

    r := mux.NewRouter()

    // ----- Статика -----
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

    // ----- Главная страница (SPA) -----
    r.HandleFunc("/", indexHandler).Methods("GET")

    // ----- Публичное API -----
    r.HandleFunc("/api/users", apiUsersHandler).Methods("GET")

    // ----- Защищённое API (требуется X-User-Id) -----
    api := r.PathPrefix("/api").Subrouter()
    api.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authMiddleware(next.ServeHTTP).ServeHTTP(w, r)
        })
    })
    // Приводим authMiddleware к http.Handler
    api.HandleFunc("/attendance-records", apiCreateRecordHandler).Methods("POST")
    api.HandleFunc("/attendance-records/my", apiGetMyRecordsHandler).Methods("GET")
    api.HandleFunc("/attendance-records/{id}", apiUpdateRecordHandler).Methods("PUT")
    api.HandleFunc("/attendance-records/{id}", apiDeleteRecordHandler).Methods("DELETE")
    api.HandleFunc("/attendance-records", apiGetAllRecordsHandler).Methods("GET")
    api.HandleFunc("/attendance-records/{id}/approve", apiApproveRecordHandler).Methods("POST")
    api.HandleFunc("/attendance-records/{id}/reject", apiRejectRecordHandler).Methods("POST")

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("Server starting on :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, r))
}