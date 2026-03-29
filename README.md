# Attendance Tracker 📋

[![Go Version](https://img.shields.io/badge/Go-1.22-blue)](https://golang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Веб-приложение для учёта опозданий и отсутствий сотрудников. Сотрудники фиксируют события, администратор проверяет и подтверждает записи, формирует отчёты.

## 📌 Основные возможности

- Две роли: admin (полный доступ) и employee (только свои записи)
- Учёт опозданий и отсутствий с указанием причины
- Модерация записей: подтверждение/отклонение администратором
- Фильтрация записей по сотруднику, типу, статусу и периоду
- Отчёты с агрегированной статистикой
- Адаптивный интерфейс без перезагрузки страницы (SPA)

## 🛠 Технологии

- Backend: Go 1.22 + database/sql
- Frontend: чистый JavaScript (ES6+), HTML5, CSS3 (Tailwind CSS + кастомные стили)
- Database: PostgreSQL 16
- Миграции: SQL-скрипты в папке /migrations
- Контейнеризация: Docker, docker-compose

## 🚀 Запуск проекта

## 1. Установите PostgreSQL
Скачайте и установите PostgreSQL с [официального сайта](https://www.postgresql.org/download/).  
В процессе установки запомните или задайте пароль для пользователя postgres.

## 2. Создайте базу данных
Откройте pgAdmin4 или командную строку psql и выполните:
```sql
CREATE DATABASE attendance_db;
```

## 3. Примените миграции

Выполните SQL-скрипты из папки migrations в созданной базе (например, через Query Tool в pgAdmin4):

- 000001_create_users_table.up.sql
- 000002_create_attendance_records_table.up.sql

## 4. ⚙️Настройте переменные окружения

## Скопируйте файл .env.example в .env и укажите свои параметры подключения к БД:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=ваш_пароль
DB_NAME=attendance_db
PORT=8080
```

## 5. Запустите приложение

```bash
go run cmd/app/main.go
```

## 🧪 Тестовые пользователи

| Имя | Роль |
|-----|------|
| Артём Воинков | admin |
| Иван Макаров | employee |
| Асхат Чиняев | employee |

## 📡 API Endpoints

| Метод | URL | Описание | Доступ |
|-------|-----|----------|--------|
| GET | /api/users | Список всех пользователей | Все |
| POST | /api/attendance-records | Создать запись | Employee |
| GET | /api/attendance-records/my | Мои записи | Employee |
| PUT | /api/attendance-records/{id} | Редактировать запись (только pending) | Employee |
| DELETE | /api/attendance-records/{id} | Удалить запись (только pending) | Employee |
| GET | /api/attendance-records | Все записи с фильтрами | Admin |
| POST | /api/attendance-records/{id}/approve | Подтвердить запись | Admin |
| POST | /api/attendance-records/{id}/reject | Отклонить запись | Admin |

## 🔧 Структура проекта

```text
attendance-tracker/
├── cmd/app/main.go            # Точка входа
├── internal/
│   ├── db/                    # Подключение к БД
│   └── models/                # Модели и работа с БД
├── migrations/                # SQL-миграции
├── static/
│   ├── css/                   # Стили
│   └── js/                    # Клиентская логика (SPA)
├── templates/                 # Единственный HTML-шаблон (base.html)
├── .env.example
├── go.mod
├── README.md
├── CHECKLIST.md
└── api-examples.http
```
