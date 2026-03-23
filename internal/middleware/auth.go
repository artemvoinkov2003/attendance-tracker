package middleware

import (
    "context"
    "database/sql"
    "encoding/json"
    "net/http"
    "strconv"

    "attendance-tracker/internal/models"
)

// AuthMiddleware создает middleware для аутентификации через заголовок X-User-Id
func AuthMiddleware(db *sql.DB) func(http.HandlerFunc) http.HandlerFunc {
    return func(next http.HandlerFunc) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            // Получаем заголовок
            userIDHeader := r.Header.Get("X-User-Id")
            if userIDHeader == "" {
                respondWithError(w, http.StatusUnauthorized, "missing X-User-Id header")
                return
            }

            // Преобразуем в int
            userID, err := strconv.Atoi(userIDHeader)
            if err != nil {
                respondWithError(w, http.StatusUnauthorized, "invalid user id format")
                return
            }

            // Получаем пользователя из БД
            user, err := models.GetUserByID(db, userID)
            if err != nil {
                respondWithError(w, http.StatusUnauthorized, "user not found")
                return
            }

            // Добавляем пользователя в контекст
            ctx := context.WithValue(r.Context(), "user", user)
            next.ServeHTTP(w, r.WithContext(ctx))
        }
    }
}

// вспомогательная функция для отправки JSON-ошибки
func respondWithError(w http.ResponseWriter, status int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]string{"error": message})
}