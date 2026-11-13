# Локальное превью (без сервера)

Стенд для просмотра UI на dev-машине, когда прод-сервер/БД недоступны.
Продакшену ничего из этого не нужно — только `.env` сервера.

## Что поднимается

| Что | Где | Зачем |
|---|---|---|
| Приложение (next start) | http://localhost:3010 | сам интерфейс |
| Стаб AD-авторизации | localhost:3005 | вместо AUTH_URL — пускает с любым логином/паролем |
| PostgreSQL (docker) | localhost:54320 | база данных (контейнер `cert-manager-db`) |
| MinIO (docker) | localhost:9100 | хранилище файлов (контейнер `cert-manager-minio`) |

Порты 5432/9000/3003 на машине заняты другими проектами, поэтому превью живёт на 54320/9100/3010.

## Команды

```powershell
# первый раз: создать контейнеры и залить данные (см. ниже), затем:
node scripts/local-preview/preview.mjs start

# остановить всё:
node scripts/local-preview/preview.mjs stop
```

## Первый запуск (один раз)

Контейнеры создаются из значений `.env` (пароль БД и ключи MinIO берутся оттуда):

```bash
# 1. База (postgres:16-alpine)
docker run -d --name cert-manager-db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=<пароль из DB_URL> \
  -e POSTGRES_DB=cert_manager -p 54320:5432 postgres:16-alpine

# 2. Хранилище (quay.io/minio/minio)
docker run -d --name cert-manager-minio \
  -e MINIO_ROOT_USER=<MINIO_ACCESS_KEY> -e MINIO_ROOT_PASSWORD=<MINIO_SECRET_KEY> \
  -p 9100:9000 quay.io/minio/minio:latest server /data --console-address ":9001"

# 3. Миграции + демо-данные
npx prisma migrate deploy
node -e "..." # см. seed.ts — переменные окружения поверх .env
FORCE_RESEED=1 npx tsx scripts/local-preview/seed.ts
```

`seed.ts` создаёт 16 сотрудников и 25 сертификатов во всех статусах
(активные, истекающие, критичные, истёкшие, отозванные) с файлами в MinIO,
чтобы скачивание работало. Повторный запуск безопасен: без `FORCE_RESEED=1`
он ничего не перезаписывает; сидирование разрешено только в базу на порту 54320.

## Нюансы

- Вход: любой логин/пароль (стаб не проверяет AD). Сессия — 2 часа.
- Email-уведомления в превью не отправляются (SMTP не настроен), cron-проверка
  при старте делает catch-up и пишет запись в журнал «Система».
- Важно: превью собирает свой `.env` поверх основного — прод-`.env` остаётся нетронутым.
