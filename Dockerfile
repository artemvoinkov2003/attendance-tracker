# ---- Стадия сборки ----
FROM golang:1.22-alpine AS builder

# Устанавливаем необходимые системные пакеты (для совместимости с PostgreSQL)
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

# Копируем go.mod и go.sum для кэширования зависимостей
COPY go.mod go.sum ./
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем статический бинарник без отладочной информации
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o attendance-tracker ./main.go

# ---- Финальная стадия ----
FROM alpine:latest

# Устанавливаем ca-certificates (для HTTPS-запросов) и tzdata (для работы с временными зонами)
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Копируем собранный бинарник из стадии сборки
COPY --from=builder /app/attendance-tracker .

# Копируем статические файлы и шаблоны (необходимы для работы сервера)
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

# Открываем порт, который будет слушать приложение (по умолчанию 8080)
EXPOSE 8080

# Запускаем приложение
CMD ["./attendance-tracker"]
