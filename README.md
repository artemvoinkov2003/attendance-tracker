📋 Attendance Tracker






Веб-приложение для учёта опозданий и отсутствий сотрудников с системой модерации и отчётности.

✨ Возможности
👥 Роли пользователей
admin — полный доступ
employee — управление только своими записями
📝 Учёт посещаемости
фиксация опозданий и отсутствий
указание причины
🛡 Модерация записей
подтверждение или отклонение администратором
🔍 Фильтрация
по сотруднику
по типу
по статусу
по периоду
📊 Отчёты
агрегированная статистика
⚡ SPA-интерфейс
без перезагрузки страницы
🛠 Технологический стек
Слой	Технологии
Backend	Go 1.22 (database/sql)
Frontend	JavaScript (ES6+), HTML5, CSS3, Tailwind CSS
Database	PostgreSQL 16
Миграции	SQL (/migrations)
DevOps	Docker, docker-compose
🚀 Быстрый старт
1. Установка PostgreSQL

Скачайте и установите PostgreSQL:
https://www.postgresql.org/download/

Во время установки запомните пароль пользователя postgres

2. Создание базы данных
CREATE DATABASE attendance_db;
3. Применение миграций

Выполните SQL-файлы из папки /migrations:

000001_create_users_table.up.sql
000002_create_attendance_records_table.up.sql

Можно использовать:

pgAdmin (Query Tool)
или psql
4. Настройка окружения

Скопируйте .env.example → .env и заполните:

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=attendance_db
PORT=8080
5. Запуск приложения
go run cmd/app/main.go
🧪 Тестовые пользователи
Имя	Роль
Артём Воинков	admin
Иван Макаров	employee
Асхат Чиняев	employee
📡 API
Пользователи
Метод	Endpoint	Описание	Доступ
GET	/api/users	Получить всех пользователей	Все
Записи посещаемости
Метод	Endpoint	Описание	Доступ
POST	/api/attendance-records	Создать запись	Employee
GET	/api/attendance-records/my	Мои записи	Employee
PUT	/api/attendance-records/{id}	Редактировать (pending)	Employee
DELETE	/api/attendance-records/{id}	Удалить (pending)	Employee
Администрирование
Метод	Endpoint	Описание	Доступ
GET	/api/attendance-records	Все записи (с фильтрами)	Admin
POST	/api/attendance-records/{id}/approve	Подтвердить запись	Admin
POST	/api/attendance-records/{id}/reject	Отклонить запись	Admin
🏗 Структура проекта
attendance-tracker/
│
├── cmd/
│   └── app/
│       └── main.go          # Точка входа
│
├── internal/
│   ├── db/                 # Подключение к БД
│   └── models/             # Модели и логика
│
├── migrations/             # SQL миграции
│
├── static/
│   ├── css/                # Стили
│   └── js/                 # SPA логика
│
├── templates/              # HTML шаблоны
│   └── base.html
│
├── .env.example
├── go.mod
├── README.md
├── CHECKLIST.md
└── api-examples.http
📦 Дополнительно
📄 CHECKLIST.md — список задач
🌐 api-examples.http — примеры API-запросов
📜 Лицензия

Проект распространяется под лицензией MIT.
См. файл LICENSE.

💡 Автор

Pet-проект / учебный проект 🚀
