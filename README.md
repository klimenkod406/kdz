# Система заявок (Ticket System)

Система управления заявками для сотрудников с двухсерверной архитектурой.

**Последнее обновление:** 2026-04-03  
**Версия:** 1.0.0 (см. `package.json`)  
**Node.js:** проверено на 24.x (например v24.11.1)  
**Платформа:** в первую очередь Windows; установщик и серверы запускаются и из консоли на Linux/macOS

---

## 📋 Описание

Система состоит из двух серверов:

### Сервер 1 (Прием заявок)
- Прием заявок от сотрудников через веб-форму
- Временное хранение заявок (настраиваемый период)
- Автоматическая отправка заявок на Сервер 2 по расписанию (cron, интервал из `SYNC_INTERVAL_MINUTES`)
- Пометка заявок как отправленных после успешной доставки на Сервер 2
- Загрузка файлов (фото, видео, документы)

**Порт по умолчанию:** 3001

### Сервер 2 (Хранение и админ-панель)
- Постоянное хранение всех заявок
- Админ-панель для управления заявками
- Авторизация администраторов
- Изменение статусов, комментарии, история
- Система логирования (security.log, error.log)
- Скачивание файлов в виде ZIP-архива

**Порт по умолчанию:** 3002

---

## ✅ Состояние проекта

Актуальная проверка (синтаксис `node --check` для `server1`, `server2`, `shared`, `installer`; `npm install` в этих каталогах):

| Компонент | Статус |
|-----------|--------|
| Структура проекта | ✅ Полная |
| Синтаксис JavaScript | ✅ Проверка пройдена |
| Миграции базы данных | ✅ В репозитории |
| Конфигурация | ✅ `server1/.env.example`, `server2/.env.example` (имена БД — примеры; установщик по умолчанию задаёт `tickets_temp` / `tickets_permanent`) |
| Зависимости npm | ✅ Устанавливаются; см. предупреждения `npm audit` при необходимости |
| Установщик | ✅ `installer/setup.js` |
| Документация | ✅ Этот файл и `INSTALLER-GUIDE.md`, `START_HERE.md`, `LOGGING-SYSTEM.md` |

---

## 🚀 Быстрый старт

### Требования
- **Node.js 16+** (проверено: 24.14.1)
- **PostgreSQL 12+**

### ⚠️ Важно при скачивании с GitHub

**После скачивания репозитория:**

1. **Установите зависимости:**

   **Windows:**
   - Дважды кликните на `install-dependencies.bat`

   **Любая ОС:**
   ```bash
   cd installer
   npm install
   cd ..
   ```

2. **Запустите установщик:**

   **Windows:**
   - Дважды кликните на `Установить сервер.bat`

   **Любая ОС:**
   ```bash
   node installer/setup.js
   ```

3. **Следуйте инструкциям установщика:**
   - Выберите тип сервера (1 или 2)
   - Введите параметры PostgreSQL
   - Введите URL другого сервера (для синхронизации)
   - Настройте сетевые параметры

4. **Установщик автоматически:**
   - Удалит ненужные файлы (оставит только файлы для выбранного сервера)
   - Установит все зависимости
   - Проверит критические пакеты
   - Подключится к PostgreSQL
   - Создаст базу данных
   - Выполнит миграции
   - Создаст файл `.env`
   - Запустит сервер

> **Примечание:** После установки на каждом сервере останется только необходимая папка:
> - На Сервере 1: `server1/`, `shared/`, `installer/`
> - На Сервере 2: `server2/`, `shared/`, `installer/`

### 📄 Подробная документация по установке

Смотрите `INSTALLER-GUIDE.md` — полное руководство по установке.

---

## 📁 Структура проекта

```
kdz/
├── server1/                 # Сервер приема заявок
│   ├── src/
│   │   ├── config/         # Конфигурация БД (database.js)
│   │   ├── middleware/     # Загрузка файлов (upload.js)
│   │   ├── models/         # Ticket.js
│   │   ├── routes/         # tickets.js
│   │   ├── services/       # SyncService.js (синхронизация)
│   │   ├── views/          # index.html (форма заявки)
│   │   ├── index.js        # Точка входа
│   │   └── utils.js        # Утилиты
│   ├── database/
│   │   └── migrations/     # 001_init.sql
│   ├── uploads/            # Директория для файлов
│   ├── .env.example
│   └── package.json
├── server2/                 # Сервер хранения и админ-панель
│   ├── src/
│   │   ├── config/         # database.js
│   │   ├── middleware/     # upload.js
│   │   ├── models/         # Ticket.js, Admin.js
│   │   ├── routes/         # tickets.js, auth.js
│   │   ├── utils/          # logger.js (Winston)
│   │   ├── views/          # admin.html, login.html
│   │   ├── index.js        # Точка входа
│   │   └── utils.js        # Утилиты
│   ├── database/
│   │   └── migrations/     # 001_init.sql
│   ├── uploads/            # Директория для файлов
│   ├── logs/               # Логи (security.log, error.log...)
│   ├── .env.example
│   └── package.json
├── shared/                  # Общие константы и утилиты (TICKET_STATUS, formatDate, generateUUID)
│   └── index.js
├── installer/               # Установщик
│   ├── setup.js
│   ├── package.json
│   └── node_modules/
└── package.json
```

---

## 🔧 Конфигурация

### Сервер 1 (.env)

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `PORT` | Порт сервера | 3001 |
| `HOST` | Хост для прослушивания | 0.0.0.0 |
| `DB_HOST` | Хост PostgreSQL | localhost |
| `DB_PORT` | Порт PostgreSQL | 5432 |
| `DB_NAME` | Имя БД | tickets_temp |
| `DB_USER` | Пользователь БД | postgres |
| `DB_PASSWORD` | Пароль БД | — |
| `SERVER2_URL` | URL Сервера 2 | http://localhost:3002 |
| `SYNC_INTERVAL_MINUTES` | Интервал синхронизации (минуты, cron) | 5 |
| `SYNC_SECRET` | Общий секрет с Сервером 2 (мин. 16 символов), см. ниже | — |

В коде **нет** переменной `TEMP_STORAGE_MINUTES` — не используйте её в `.env` (устаревшее упоминание в старых инструкциях).

### Сервер 2 (.env)

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `PORT` | Порт сервера | 3002 |
| `HOST` | Хост для прослушивания | 0.0.0.0 |
| `DB_HOST` | Хост PostgreSQL | localhost |
| `DB_PORT` | Порт PostgreSQL | 5432 |
| `DB_NAME` | Имя БД | tickets_permanent |
| `DB_USER` | Пользователь БД | postgres |
| `DB_PASSWORD` | Пароль БД | — |
| `SESSION_SECRET` | Секрет сессий | автогенерация |
| `SYNC_SECRET` | Тот же секрет, что на Сервере 1 (мин. 16 символов) | — |
| `SESSION_COOKIE_SECURE` | `true` — cookie только по HTTPS | не задано |
| `ADMIN_USERNAME` | Логин администратора | admin |
| `ADMIN_PASSWORD` | Пароль администратора | admin123 |

Один и тот же **`SYNC_SECRET`** должен быть в `.env` на Серверах 1 и 2. Без него приём заявок на Сервере 1 работает, а синхронизация с Сервером 2 — нет.

---

## 🌐 Доступ в локальной сети

Оба сервера настроены на прослушивание всех сетевых интерфейсов (`0.0.0.0`).

### Для доступа с других устройств:

1. **Узнайте IP-адрес сервера** в локальной сети:
   - Windows: `ipconfig`
   - Linux/Mac: `ifconfig` или `ip addr`

2. **Используйте IP-адрес для доступа:**

   **Сервер 1 (форма подачи заявок):**
   ```
   http://<IP-сервера-1>:3001
   ```

   **Сервер 2 (админ-панель):**
   ```
   http://<IP-сервера-2>:3002/admin
   ```

3. **Откройте порты в фаерволе** (если требуется):
   ```powershell
   # Windows (PowerShell от администратора)
   New-NetFirewallRule -DisplayName "Ticket Server 1" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Ticket Server 2" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
   ```

---

## 📊 API

### Сервер 1

Базовый префикс API: `/api/tickets`. Синхронизация с Сервером 2 выполняется **фоновым cron** в `src/index.js`, отдельных HTTP-эндпоинтов «статуса» или «принудительной синхронизации» в текущем коде **нет**.

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/` | Форма подачи заявки |
| `POST` | `/api/tickets` | Создать заявку (multipart, поле файлов `files`) |

Публичные `GET` для списка заявок и файлов **отключены** — персональные данные доступны только на Сервере 2 после входа администратора.

### Сервер 2

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/` | Страница входа |
| `GET` | `/admin` | Админ-панель |
| `POST` | `/api/auth/login` | Вход |
| `POST` | `/api/auth/logout` | Выход |
| `GET` | `/api/auth/me` | Проверка сессии |
| `GET` | `/api/tickets` | Список заявок (требуется авторизация) |
| `GET` | `/api/tickets/stats` | Статистика (требуется авторизация) |
| `GET` | `/api/tickets/search` | Поиск заявок |
| `GET` | `/api/tickets/sync/history` | История синхронизаций (требуется авторизация) |
| `GET` | `/api/tickets/:id` | Заявка с комментариями и историей |
| `PUT` | `/api/tickets/:id/status` | Изменить статус |
| `POST` | `/api/tickets/:id/comments` | Добавить комментарий |
| `GET` | `/api/tickets/:id/files/:filename` | Скачать один файл |
| `POST` | `/api/tickets/:id/files/download-all` | Скачать все файлы одним ZIP |
| `POST` | `/api/tickets/sync` | Приём заявки от Server 1; заголовок `Authorization: Bearer <SYNC_SECRET>` |

---

## 🔐 Безопасность

1. **Смените пароль администратора** после первой установки; пароль не дублируется в консоль при старте сервера
2. **Задайте одинаковый `SYNC_SECRET`** на обоих серверах (длинная случайная строка); без него канал синхронизации отключён
3. **Используйте сложные пароли** для PostgreSQL
4. **Настройте HTTPS** при выносе в прод; для cookie с `Secure` задайте `SESSION_COOKIE_SECURE=true`
5. **Ограничьте доступ** к портам фаерволом в LAN
6. **Логин администратора** ограничен по частоте запросов (защита от перебора)
7. **Система логирования** фиксирует действия в админке (входы, изменения статусов, скачивания)

### Система логирования (Server 2)

| Файл | Назначение |
|------|------------|
| `logs/security.log` | События безопасности (входы, изменения статусов, скачивания) |
| `logs/error.log` | Ошибки |
| `logs/warn.log` | Предупреждения |
| `logs/combined.log` | Все логи |

**Примеры логов:**
```
[2026-04-02 10:00:00] [INFO] Вход в систему: admin
[2026-04-02 10:15:00] [INFO] Изменение статуса заявки: uuid
[2026-04-02 10:25:00] [INFO] Скачивание файлов заявки: uuid
```

---

## 🗄️ База данных

### Сервер 1 (tickets_temp)

**Таблицы:**
- `tickets` — заявки (id, employee_name, employee_email, department, areas, problem, solution, status, sent_to_server2, created_at, sent_at)
- `ticket_attachments` — вложения (id, ticket_id, file_name, file_original_name, file_mime_type, file_size, file_path, created_at)
- `sync_logs` — логи синхронизации (id, tickets_count, success, error_message, created_at)

### Сервер 2 (tickets_permanent)

**Таблицы:**
- `session` — сессии Express (sid, sess, expire)
- `admins` — администраторы (id, username, password_hash, created_at, last_login)
- `tickets` — заявки (id, employee_name, employee_email, department, areas, problem, solution, status, received_from_server1_at, created_at, updated_at)
- `ticket_attachments` — вложения (id, ticket_id, file_name, file_original_name, file_mime_type, file_size, file_path, received_from_server1_at, created_at)
- `ticket_comments` — комментарии (id, ticket_id, admin_id, comment, created_at)
- `ticket_history` — история изменений (id, ticket_id, admin_id, old_status, new_status, comment, created_at)
- `sync_logs` — логи синхронизации

---

## 📝 Статусы заявок

| Статус | Описание |
|--------|----------|
| `new` | Новая заявка |
| `in_progress` | В работе |
| `resolved` | Решена |
| `closed` | Закрыта |

---

## 🎯 Области (Areas)

| Область | Описание |
|---------|----------|
| `quality` | Качество продукта |
| `cost` | Стоимость |
| `sales` | Увеличение продаж |
| `disorder` | Беспорядок |
| `health` | Здоровье и безопасность |
| `productivity` | Производительность |
| `overstock` | Чрезмерные запасы |
| `environment` | Окружающая среда |

---

## 📎 Поддерживаемые типы файлов

**Изображения:** JPG, JPEG, PNG, GIF, WebP, BMP, TIFF

**Документы:** PDF, DOC, DOCX, XLS, XLSX, TXT, CSV

**Видео:** MP4, WebM, MOV, AVI

**Архивы:** ZIP, RAR, 7Z

### Ограничения

| Параметр | Сервер 1 | Сервер 2 |
|----------|----------|----------|
| Макс. размер файла | 50 MB | 100 MB |
| Макс. количество файлов | 10 | 20 |

---

## 🛠️ Разработка

### Запуск в режиме разработки:

```bash
# Server 1
cd server1
npm run dev

# Server 2
cd server2
npm run dev
```

### npm scripts

**Server 1:**
- `npm start` — запуск production
- `npm run dev` — запуск с nodemon (autoreload)
- `npm run setup` — запуск установщика

**Server 2:**
- `npm start` — запуск production
- `npm run dev` — запуск с nodemon (autoreload)
- `npm run setup` — запуск установщика

---

## 📦 Зависимости

### Server 1

| Пакет | Версия | Назначение |
|-------|--------|------------|
| express | ^4.18.2 | Веб-фреймворк |
| pg | ^8.11.3 | PostgreSQL клиент |
| dotenv | ^16.3.1 | Переменные окружения |
| cors | ^2.8.5 | CORS middleware |
| node-cron | ^3.0.3 | Планировщик задач |
| axios | ^1.6.2 | HTTP клиент |
| multer | ^1.4.5-lts.1 | Загрузка файлов |
| form-data | ^4.0.0 | FormData для multipart |

### Server 2

| Пакет | Версия | Назначение |
|-------|--------|------------|
| express | ^4.18.2 | Веб-фреймворк |
| pg | ^8.11.3 | PostgreSQL клиент |
| dotenv | ^16.3.1 | Переменные окружения |
| cors | ^2.8.5 | CORS middleware |
| multer | ^1.4.5-lts.1 | Загрузка файлов |
| axios | ^1.14.0 | HTTP клиент |
| bcrypt | ^5.1.1 | Хеширование паролей |
| express-session | ^1.17.3 | Сессии |
| connect-pg-simple | ^9.0.1 | Хранение сессий в PostgreSQL |
| morgan | ^1.10.0 | HTTP логирование |
| winston | ^3.11.0 | Логгер |
| archiver | ^7.0.0 | Архивация (ZIP) |

### Installer

| Пакет | Версия | Назначение |
|-------|--------|------------|
| inquirer | ^8.2.6 | Интерактивные опросы |
| chalk | ^4.1.2 | Цветной вывод |
| pg | ^8.11.3 | PostgreSQL клиент |
| dotenv | ^16.3.1 | Переменные окружения |
| fs-extra | ^11.2.0 | Расширенные FS операции |

---

## 🐛 Устранение проблем

### Сервер не запускается
- Проверьте, что PostgreSQL запущен
- Проверьте параметры подключения в `.env`
- Убедитесь, что порты не заняты

### Ошибка синхронизации
- Проверьте, что Сервер 2 доступен по `SERVER2_URL`
- Смотрите консоль Server 1 и таблицу `sync_logs` в БД Server 1; на Server 2 история доступна в API `/api/tickets/sync/history` (после входа в админ-панель)

### Не работает авторизация
- Очистите кэш браузера
- Проверьте `SESSION_SECRET` в `.env`

### Ошибка "Cannot find module 'inquirer'"
```bash
cd installer
npm install
```

### Ошибка подключения к PostgreSQL
- Проверьте пароль PostgreSQL
- Убедитесь, что PostgreSQL запущен
- Проверьте параметры в `.env`

### Порт занят
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Решение:** Измените порт в `.env` или остановите сервис, использующий порт

---

## 📄 Документация

| Файл | Описание |
|------|----------|
| `README.md` | Основная документация |
| `INSTALLER-GUIDE.md` | Руководство по установке |
| `START_HERE.md` | Первый запуск после скачивания |
| `ИНСТРУКЦИЯ.txt` | Инструкция на русском |
| `ЧТЕНИЕ.txt` | Дополнительные заметки |
| `GITHUB-README.txt` | Инструкция для GitHub |
| `LOGGING-SYSTEM.md` | Система логирования (Server 2) |

---

## 📄 Лицензия

Внутренний проект для использования в локальной сети организации.
