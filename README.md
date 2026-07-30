# Cert Manager

Веб-приложение для учёта и контроля сроков действия сертификатов сотрудников.

## Что нужно на сервере (без Docker)

| Компонент | Статус | Назначение |
|-----------|--------|------------|
| **Node.js 20 LTS** | установить | Runtime приложения |
| **PostgreSQL** | уже есть | База данных |
| **RustFS** | установить | S3-хранилище файлов (порт 9000) |
| **AUTH-сервис** | по сети | AD-авторизация (`schedule-ad-blocker`) |

SMTP настраивается в интерфейсе приложения, не в `.env`.

---

## 1. Подготовка сервера

### Node.js

Скачать и установить [Node.js 20 LTS](https://nodejs.org/) (Windows x64).

### PostgreSQL — создать базу

В pgAdmin или `psql`:

```sql
CREATE DATABASE cert_manager;
```

Строка подключения для `.env`:

```
postgresql://postgres:ПАРОЛЬ@localhost:5432/cert_manager?schema=public
```

### RustFS

1. Установить через скачанный установщик
2. Настроить диск, нажать **Start Service**
3. Консоль: `http://127.0.0.1:9001` (или `:7001` в Windows-установщике)
4. Логин по умолчанию: `rustfsadmin` / `rustfsadmin`

Бакет `certificates` создаётся **автоматически** при первом запуске приложения.

### `.env` на сервере

```env
NODE_ENV=production
AUTH_URL=http://IP-AD-СЕРВЕРА:3005/graphql
AD_EMAIL_DOMAIN=local.corp
DB_URL=postgresql://postgres:ПАРОЛЬ@localhost:5432/cert_manager?schema=public
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=rustfsadmin
MINIO_SECRET_KEY=rustfsadmin
MINIO_BUCKET=certificates
MINIO_USE_SSL=false
```

Шаблон: [.env.example](.env.example)

---

## 2. Два способа деплоя

### Способ A — собрать на сервере (проще)

Скопируйте **весь проект** на сервер (git clone, zip, общая папка — без `node_modules` и `.next`):

```powershell
cd C:\apps\cert-manager
copy .env.example .env
# отредактировать .env

powershell -ExecutionPolicy Bypass -File .\scripts\setup-server.ps1
npm run start
```

Приложение: **http://localhost:3003**

---

### Способ B — собрать на своём ПК, перенести на сервер

**На машине разработки:**

```powershell
cd g:\react\cert-manager
npm run deploy:pack
```

Появятся:
- папка `release/`
- архив `cert-manager-release.zip`

**На сервере:**

```powershell
# распаковать cert-manager-release.zip в C:\apps\cert-manager
cd C:\apps\cert-manager
copy .env.example .env
# отредактировать .env (DB, AUTH_URL, RustFS)

powershell -ExecutionPolicy Bypass -File .\server-start.ps1
```

Скрипт применит миграции и запустит `node standalone-start.cjs` (поднимает Next server и через `/api/health` стартует cron).

> На сервере нужен только **Node.js**, исходники TypeScript не требуются.
>
> Важно: не запускайте просто `node server.js` — в Next.js 16 standalone тогда cron может не подняться до первого захода в UI. Используйте `standalone-start.cjs` или `server-start.ps1`.

---

## 3. Запуск в фоне (Windows)

### PM2 (рекомендуется)

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

cd C:\apps\cert-manager
pm2 start standalone-start.cjs --name cert-manager
pm2 save
```

Для варианта A (полный проект):

```powershell
pm2 start npm --name cert-manager -- run start
pm2 save
```

### Другой порт

```powershell
$env:PORT = "8080"
node standalone-start.cjs
```

---

## 4. Локальная разработка

```powershell
npm install
npx prisma migrate deploy
npm run dev
```

---

## Проверка после запуска

В консоли:

```
✅ MINIO bucket initialized
✅ Cron jobs started
```

| Сервис | Адрес |
|--------|-------|
| Приложение | http://localhost:3003 |
| RustFS Console | http://127.0.0.1:9001 |
| PostgreSQL | localhost:5432 |

---

## Частые проблемы

**Не могу войти** — с сервера должен открываться `AUTH_URL`.

**Ошибка БД** — проверьте пароль в `DB_URL`, база `cert_manager` создана, служба PostgreSQL запущена.

**RustFS недоступен** — служба RustFS запущена, порт 9000, ключи `rustfsadmin` в `.env`.

**После обновления кода** — заново `npm run deploy:pack` или на сервере `git pull && npm ci && npm run build && pm2 restart cert-manager`.

---

## Полезные команды

```powershell
npm run dev           # разработка
npm run build         # сборка
npm run start         # запуск (из корня проекта)
npm run deploy:pack   # упаковать release для сервера
npm run deploy:setup  # первичная настройка на сервере
npm run db:migrate    # миграции БД
```
