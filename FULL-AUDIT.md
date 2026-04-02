# Проверка системы заявок - Полный аудит

## ✅ Дата проверки: 2026-04-02

---

## 📋 1. ДОБАВЛЕНИЕ ЗАЯВКИ

### Server 1 (Форма)

**Файл:** `server1/src/views/index.html`

**Поля формы:**
```html
✅ employee_name - ФИО (обязательно)
✅ employee_email - Email
✅ department - Отдел
✅ area - Область (обязательно)
✅ problem - Проблема (обязательно)
✅ solution - Решение (необязательно)
✅ files - Вложения (необязательно)
```

**JavaScript отправка:**
```javascript
✅ formData.append('problem', ...)
✅ formData.append('solution', ...)
```

---

### Server 1 (API)

**Файл:** `server1/src/routes/tickets.js`

**POST /api/tickets:**
```javascript
✅ Валидация: employee_name, area, problem
✅ Создание: TicketModel.create({ problem, solution })
✅ Обработка файлов: multer
```

---

### Server 1 (Модель)

**Файл:** `server1/src/models/Ticket.js`

**create():**
```sql
✅ INSERT INTO tickets (..., problem, solution)
✅ VALUES ($1, $2, $3, $4, $5, $6)
```

---

## 📋 2. СИНХРОНИЗАЦИЯ

### Server 1 → Server 2

**Файл:** `server1/src/services/SyncService.js`

**syncTickets():**
```javascript
✅ formData.append('problem', ticket.problem)
✅ formData.append('solution', ticket.solution || '')
✅ Отправка файлов через FormData
```

---

### Server 2 (API)

**Файл:** `server2/src/routes/tickets.js`

**POST /api/tickets/sync:**
```javascript
✅ Приём: problem, solution
✅ Создание: TicketModel.createFromSync({ problem, solution })
```

---

### Server 2 (Модель)

**Файл:** `server2/src/models/Ticket.js`

**createFromSync():**
```sql
✅ INSERT INTO tickets (..., problem, solution, ...)
✅ ON CONFLICT (id) DO NOTHING
```

---

## 📋 3. ХРАНЕНИЕ В БД

### Server 1 (tickets_temp)

**Файл:** `server1/database/migrations/001_init.sql`

**Таблица tickets:**
```sql
✅ id UUID PRIMARY KEY
✅ employee_name VARCHAR(255) NOT NULL
✅ employee_email VARCHAR(255)
✅ department VARCHAR(255)
✅ area VARCHAR(50) NOT NULL
✅ problem TEXT NOT NULL          ← Обязательно
✅ solution TEXT                   ← Необязательно
✅ status VARCHAR(50) DEFAULT 'new'
✅ created_at TIMESTAMP
✅ sent_to_server2 BOOLEAN
✅ sent_at TIMESTAMP
```

**Индексы:**
```sql
✅ idx_tickets_not_sent (sent_to_server2, created_at)
✅ idx_attachments_ticket_id
```

---

### Server 2 (tickets_permanent)

**Файл:** `server2/database/migrations/001_init.sql`

**Таблица tickets:**
```sql
✅ id UUID PRIMARY KEY
✅ employee_name VARCHAR(255) NOT NULL
✅ employee_email VARCHAR(255)
✅ department VARCHAR(255)
✅ area VARCHAR(50) NOT NULL
✅ problem TEXT NOT NULL          ← Обязательно
✅ solution TEXT                   ← Необязательно
✅ status VARCHAR(50) DEFAULT 'new'
✅ received_from_server1_at TIMESTAMP
✅ created_at TIMESTAMP
✅ updated_at TIMESTAMP
```

**Индексы:**
```sql
✅ idx_tickets_status
✅ idx_tickets_created_at
✅ idx_tickets_area
✅ idx_attachments_ticket_id
✅ idx_ticket_comments_ticket_id
✅ idx_ticket_history_ticket_id
```

---

## 📋 4. ВЫВОД ЗАЯВОК

### Server 2 (Админ-панель)

**Файл:** `server2/src/views/admin.html`

**Таблица заявок:**
```html
✅ Дата (created_at)
✅ Сотрудник (employee_name)
✅ Отдел (department)
✅ Проблема (problem) ← substring(0, 50) + '...'
✅ Область (area)
✅ Статус (status)
```

**Модальное окно:**
```html
✅ ID заявки
✅ Сотрудник + Email
✅ Отдел
✅ Проблема (problem)
✅ Решение (solution или 'Не указано')
✅ Область (area badge)
✅ Статус (status badge)
✅ Дата создания
✅ Кнопки изменения статуса
✅ Вложения (файлы)
✅ Комментарии
✅ История изменений
```

---

### Server 2 (API)

**Файл:** `server2/src/routes/tickets.js`

**GET /api/tickets:**
```javascript
✅ Пагинация: page, limit
✅ Фильтры: status, area, search
✅ Сортировка: sortBy, sortOrder
```

**GET /api/tickets/:id:**
```javascript
✅ Заявка + вложения
✅ Комментарии
✅ История изменений
```

---

### Server 2 (Модель)

**Файл:** `server2/src/models/Ticket.js`

**findAll():**
```javascript
✅ Поиск: employee_name, problem, solution
✅ Фильтр: status, area
✅ Сортировка: created_at DESC
```

**search():**
```javascript
✅ Поиск: employee_name, problem, solution, department
```

---

## 📋 5. ПУТИ ХРАНЕНИЯ ФАЙЛОВ

### Server 1

**Загрузка:**
```
server1/uploads/{uuid}.{ext}
```

**Middleware:**
```javascript
✅ UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
✅ multer.diskStorage()
✅ Уникальное имя: generateUUID() + ext
```

**Удаление после синхронизации:**
```javascript
✅ fs.unlinkSync(filePath)
✅ TicketModel.deleteAttachments(ticket.id)
```

---

### Server 2

**Загрузка:**
```
server2/uploads/{uuid}.{ext}
```

**Хранение:**
```javascript
✅ Постоянное хранение
✅ Не удаляется
```

**Доступ:**
```javascript
✅ express.static('/uploads')
✅ POST /api/tickets/:id/files/download-all (ZIP архив)
```

---

## 📋 6. ТАБЛИЦЫ БД

### Server 1

| Таблица | Назначение |
|---------|------------|
| **tickets** | Заявки (временные) |
| **ticket_attachments** | Вложения файлов |
| **sync_logs** | Логи синхронизации |

---

### Server 2

| Таблица | Назначение |
|---------|------------|
| **session** | Сессии администраторов |
| **admins** | Администраторы |
| **tickets** | Заявки (постоянные) |
| **ticket_attachments** | Вложения файлов |
| **ticket_comments** | Комментарии к заявкам |
| **ticket_history** | История изменений статуса |

---

## 📋 7. ПРОВЕРКА ВСЕХ ПОЛЕЙ

### ✅ Все поля используют problem/solution:

**Server 1:**
- ✅ `views/index.html` - problem, solution
- ✅ `routes/tickets.js` - problem, solution
- ✅ `models/Ticket.js` - problem, solution
- ✅ `services/SyncService.js` - problem, solution

**Server 2:**
- ✅ `routes/tickets.js` - problem, solution
- ✅ `models/Ticket.js` - problem, solution
- ✅ `views/admin.html` - problem, solution

---

### ✅ Поиск и фильтры:

**Server 2 models/Ticket.js:**
```javascript
✅ findAll() - поиск по problem, solution
✅ search() - поиск по problem, solution
```

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Компонент | Файл | Статус |
|-----------|------|--------|
| **Форма заявки** | `server1/views/index.html` | ✅ |
| **API Server 1** | `server1/routes/tickets.js` | ✅ |
| **Модель Server 1** | `server1/models/Ticket.js` | ✅ |
| **Синхронизация** | `server1/services/SyncService.js` | ✅ |
| **Миграции Server 1** | `server1/database/migrations/001_init.sql` | ✅ |
| **API Server 2** | `server2/routes/tickets.js` | ✅ |
| **Модель Server 2** | `server2/models/Ticket.js` | ✅ |
| **Админ-панель** | `server2/views/admin.html` | ✅ |
| **Миграции Server 2** | `server2/database/migrations/001_init.sql` | ✅ |
| **Пути файлов** | `server1/uploads/`, `server2/uploads/` | ✅ |
| **Таблицы БД** | tickets, attachments, comments, history | ✅ |

---

## ✅ ВСЕ ПРОВЕРЕНО

**Все компоненты используют:**
- ✅ `problem` вместо `subject`
- ✅ `solution` вместо `description`
- ✅ Поиск по `problem` и `solution`
- ✅ Отображение `problem` в таблице
- ✅ Отображение `problem` и `solution` в модальном окне

**Ошибок не найдено!**

---

**ПЕРЕЗАПУСТИТЕ ОБА СЕРВЕРА для применения всех изменений!**

```bash
# Server 1
node server1/src/index.js

# Server 2
node server2/src/index.js
```
