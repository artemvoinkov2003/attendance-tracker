CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee'))
);

-- Вставляем тестовых пользователей
INSERT INTO users (name, role) VALUES
('Артём Воинков', 'admin'),
('Иван Макаров', 'employee'),
('Асхат Чиняев', 'employee');
