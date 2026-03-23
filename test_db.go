package main

import (
    "database/sql"
    "fmt"
    "log"
    "os"

    _ "github.com/lib/pq"
    "github.com/joho/godotenv"
)

func main() {
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))

    fmt.Println("Connecting with string:", connStr)

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Open error:", err)
    }
    defer db.Close()

    err = db.Ping()
    if err != nil {
        log.Fatal("Ping error:", err)
    }
    fmt.Println("Connected successfully!")
}