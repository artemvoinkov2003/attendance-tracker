package models

import "database/sql"

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Role string `json:"role"` 
}

func GetUsers(db *sql.DB) ([]User, error) {
    rows, err := db.Query("SELECT id, name, role FROM users ORDER BY name")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Role); err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    return users, nil
}

func GetUserByID(db *sql.DB, id int) (*User, error) {
    var u User
    err := db.QueryRow("SELECT id, name, role FROM users WHERE id = $1", id).Scan(&u.ID, &u.Name, &u.Role)
    if err != nil {
        return nil, err
    }
    return &u, nil
}

