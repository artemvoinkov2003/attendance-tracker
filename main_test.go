package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"github.com/gorilla/mux"
	"attendance-tracker/internal/db"
	"attendance-tracker/internal/models"	
	"github.com/stretchr/testify/assert"
)

// setupTestDB подключается к тестовой БД и очищает таблицы
func setupTestDB(t *testing.T) {
	// Устанавливаем переменные окружения для тестовой БД
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_USER", "postgres")
	os.Setenv("DB_PASSWORD", "root") // замените на реальный пароль
	os.Setenv("DB_NAME", "attendance_test")

	var err error
	dbConn, err = db.Connect()
	if err != nil {
		t.Fatalf("Failed to connect to test DB: %v", err)
	}

	// Очищаем таблицы перед тестами
	_, err = dbConn.Exec("TRUNCATE TABLE attendance_records RESTART IDENTITY CASCADE")
	if err != nil {
		t.Fatalf("Failed to truncate attendance_records: %v", err)
	}
	_, err = dbConn.Exec("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
	if err != nil {
		t.Fatalf("Failed to truncate users: %v", err)
	}

	// Вставляем тестовых пользователей
	_, err = dbConn.Exec(`
		INSERT INTO users (id, name, role) VALUES
		(1, 'Test Employee', 'employee'),
		(2, 'Test Admin', 'admin')
	`)
	if err != nil {
		t.Fatalf("Failed to insert test users: %v", err)
	}
}

// TestEmployeeCannotEditOthersRecord
func TestEmployeeCannotEditOthersRecord(t *testing.T) {
	setupTestDB(t)
	defer dbConn.Close()

	// Создаём запись от сотрудника 1
	record := &models.AttendanceRecord{
		UserID: 1,
		Type:   "late",
		Date:   "2026-03-20",
		Reason: "Test",
		Status: "pending",
	}
	err := models.CreateRecord(dbConn, record)
	assert.NoError(t, err)

	// Попытка отредактировать запись от сотрудника 2
	reqBody := map[string]string{"type": "absence", "date": "2026-03-20", "reason": "Edited"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/api/attendance-records/1", bytes.NewReader(body))
	req.Header.Set("X-User-Id", "2")
	rr := httptest.NewRecorder()

	// Создаём роутер и вызываем напрямую обработчик
	router := mux.NewRouter()
	router.HandleFunc("/api/attendance-records/{id}", authMiddleware(apiUpdateRecordHandler)).Methods("PUT")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "you can only edit your own records")
}

// TestRecordNotEditableAfterApproval
func TestRecordNotEditableAfterApproval(t *testing.T) {
	setupTestDB(t)
	defer dbConn.Close()

	// Создаём запись от сотрудника 1
	record := &models.AttendanceRecord{
		UserID: 1,
		Type:   "late",
		Date:   "2026-03-20",
		Reason: "Test",
		Status: "pending",
	}
	err := models.CreateRecord(dbConn, record)
	assert.NoError(t, err)

	// Админ подтверждает запись
	err = models.ApproveRecord(dbConn, record.ID)
	assert.NoError(t, err)

	// Попытка отредактировать запись от сотрудника 1
	reqBody := map[string]string{"type": "absence", "date": "2026-03-20", "reason": "Edited"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/api/attendance-records/1", bytes.NewReader(body))
	req.Header.Set("X-User-Id", "1")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/attendance-records/{id}", authMiddleware(apiUpdateRecordHandler)).Methods("PUT")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "only pending records can be edited")
}

// TestAdminCanApproveRecord
func TestAdminCanApproveRecord(t *testing.T) {
	setupTestDB(t)
	defer dbConn.Close()

	// Создаём запись от сотрудника 1
	record := &models.AttendanceRecord{
		UserID: 1,
		Type:   "late",
		Date:   "2026-03-20",
		Reason: "Test",
		Status: "pending",
	}
	err := models.CreateRecord(dbConn, record)
	assert.NoError(t, err)

	// Администратор (id 2) одобряет
	req := httptest.NewRequest("POST", "/api/attendance-records/1/approve", nil)
	req.Header.Set("X-User-Id", "2")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/attendance-records/{id}/approve", authMiddleware(apiApproveRecordHandler)).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	// Проверяем статус записи в БД
	updated, err := models.GetRecordByID(dbConn, record.ID)
	assert.NoError(t, err)
	assert.Equal(t, "approved", updated.Status)
}