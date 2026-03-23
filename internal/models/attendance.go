package models

import (
    "database/sql"
    "fmt"      
    "time"
)

type AttendanceRecord struct {
    ID        int       `json:"id"`
    UserID    int       `json:"user_id"`
    Type      string    `json:"type"`       
    Date      string    `json:"date"`      
    Reason    string    `json:"reason"`
    Status    string    `json:"status"`     
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// Создание записи (employee)
func CreateRecord(db *sql.DB, record *AttendanceRecord) error {
    query := `
        INSERT INTO attendance_records (user_id, type, date, reason, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at, updated_at
    `
    return db.QueryRow(query, record.UserID, record.Type, record.Date, record.Reason, "pending").
        Scan(&record.ID, &record.CreatedAt, &record.UpdatedAt)
}

func GetRecordsByUser(db *sql.DB, userID int) ([]AttendanceRecord, error) {
    rows, err := db.Query(`
        SELECT id, user_id, type, date, reason, status, created_at, updated_at
        FROM attendance_records
        WHERE user_id = $1
        ORDER BY date DESC, created_at DESC
    `, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var records []AttendanceRecord
    for rows.Next() {
        var r AttendanceRecord
        err := rows.Scan(&r.ID, &r.UserID, &r.Type, &r.Date, &r.Reason, &r.Status, &r.CreatedAt, &r.UpdatedAt)
        if err != nil {
            return nil, err
        }
        records = append(records, r)
    }
    return records, nil
}

func GetRecordByID(db *sql.DB, id int) (*AttendanceRecord, error) {
    var r AttendanceRecord
    err := db.QueryRow(`
        SELECT id, user_id, type, date, reason, status, created_at, updated_at
        FROM attendance_records
        WHERE id = $1
    `, id).Scan(&r.ID, &r.UserID, &r.Type, &r.Date, &r.Reason, &r.Status, &r.CreatedAt, &r.UpdatedAt)
    if err != nil {
        return nil, err
    }
    return &r, nil
}

func UpdateRecord(db *sql.DB, id int, record *AttendanceRecord) error {
    query := `
        UPDATE attendance_records
        SET type = $1, date = $2, reason = $3, updated_at = NOW()
        WHERE id = $4 AND status = 'pending'
        RETURNING updated_at
    `
    return db.QueryRow(query, record.Type, record.Date, record.Reason, id).Scan(&record.UpdatedAt)
}

func DeleteRecord(db *sql.DB, id int) error {
    _, err := db.Exec("DELETE FROM attendance_records WHERE id = $1 AND status = 'pending'", id)
    return err
}

func GetAllRecords(db *sql.DB, userID, recordType, status, fromDate, toDate string) ([]AttendanceRecord, error) {
    baseQuery := `
        SELECT id, user_id, type, date, reason, status, created_at, updated_at
        FROM attendance_records
        WHERE 1=1
    `
    args := []interface{}{}
    argPos := 1

    if userID != "" {
        baseQuery += " AND user_id = $" + fmt.Sprint(argPos)
        args = append(args, userID)
        argPos++
    }
    if recordType != "" {
        baseQuery += " AND type = $" + fmt.Sprint(argPos)
        args = append(args, recordType)
        argPos++
    }
    if status != "" {
        baseQuery += " AND status = $" + fmt.Sprint(argPos)
        args = append(args, status)
        argPos++
    }
    if fromDate != "" {
        baseQuery += " AND date >= $" + fmt.Sprint(argPos)
        args = append(args, fromDate)
        argPos++
    }
    if toDate != "" {
        baseQuery += " AND date <= $" + fmt.Sprint(argPos)
        args = append(args, toDate)
        argPos++
    }
    baseQuery += " ORDER BY date DESC, created_at DESC"

    rows, err := db.Query(baseQuery, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var records []AttendanceRecord
    for rows.Next() {
        var r AttendanceRecord
        err := rows.Scan(&r.ID, &r.UserID, &r.Type, &r.Date, &r.Reason, &r.Status, &r.CreatedAt, &r.UpdatedAt)
        if err != nil {
            return nil, err
        }
        records = append(records, r)
    }
    return records, nil
}

func ApproveRecord(db *sql.DB, id int) error {
    _, err := db.Exec("UPDATE attendance_records SET status = 'approved', updated_at = NOW() WHERE id = $1", id)
    return err
}

func RejectRecord(db *sql.DB, id int) error {
    _, err := db.Exec("UPDATE attendance_records SET status = 'rejected', updated_at = NOW() WHERE id = $1", id)
    return err
}