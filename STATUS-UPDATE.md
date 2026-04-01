# Проверка обновления статусов заявок

## ✅ Реализованный функционал

### 1. Обновление статуса через API

**Endpoint:**
```
PUT /api/tickets/:id/status
Authorization: Cookie (session)
Content-Type: application/json

Body:
{
  "status": "in_progress",
  "comment": "Начал работу над заявкой"
}
```

**Ответ:**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2026-04-01T12:00:00.000Z"
  }
}
```

### 2. Статусы заявок

| Статус | Описание | Цвет |
|--------|----------|------|
| `new` | Новая заявка | 🔵 Синий |
| `in_progress` | В работе | 🟠 Оранжевый |
| `resolved` | Решена | 🟢 Зелёный |
| `closed` | Закрыта | ⚪ Серый |

### 3. История изменений

Каждое изменение статуса сохраняется в таблице `ticket_history`:

```sql
SELECT 
    th.created_at,
    th.old_status,
    th.new_status,
    th.comment,
    a.username as admin_name
FROM ticket_history th
LEFT JOIN admins a ON th.admin_id = a.id
WHERE th.ticket_id = 'uuid'
ORDER BY th.created_at ASC;
```

**Пример записи:**
```
2026-04-01 12:00:00 | new | in_progress | Начал работу | admin
2026-04-01 12:30:00 | in_progress | resolved | Проблема решена | admin
2026-04-01 13:00:00 | resolved | closed | Заявка закрыта | admin
```

### 4. Транзакционность

Обновление статуса использует транзакцию БД:

```javascript
await client.query('BEGIN');
// 1. Получаем текущий статус
const currentTicket = await client.query('SELECT status FROM tickets WHERE id = $1', [id]);
// 2. Обновляем статус
await client.query('UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
// 3. Добавляем запись в историю
await client.query('INSERT INTO ticket_history ...');
await client.query('COMMIT');
// При ошибке: ROLLBACK
```

---

## 🔧 Проверка работы

### 1. Через админ-панель

1. Откройте заявку
2. Нажмите кнопку статуса (например, "В работу")
3. Введите комментарий (опционально)
4. Нажмите OK
5. Проверьте, что:
   - Статус изменился
   - Появилась запись в истории
   - Статистика обновилась

### 2. Через API (curl)

```bash
# Логин
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Обновление статуса
curl -X PUT http://localhost:3002/api/tickets/UUID/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status":"in_progress","comment":"Тест"}'

# Проверка
curl http://localhost:3002/api/tickets/UUID \
  -b cookies.txt
```

### 3. Через SQL

```sql
-- Проверка статуса
SELECT id, status, updated_at FROM tickets WHERE id = 'UUID';

-- Проверка истории
SELECT * FROM ticket_history WHERE ticket_id = 'UUID' ORDER BY created_at DESC;
```

---

## 📊 Схема работы

```
┌─────────────┐
│ Администратор│
│  в админке  │
└──────┬──────┘
       │ Клик по кнопке статуса
       ▼
┌─────────────────┐
│  changeStatus() │
│  (JavaScript)   │
└──────┬──────────┘
       │ PUT /api/tickets/:id/status
       ▼
┌─────────────────┐
│  TicketModel.   │
│  updateStatus() │
└──────┬──────────┘
       │ BEGIN TRANSACTION
       ▼
┌─────────────────┐
│  SELECT status  │
│  (текущий)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  UPDATE tickets │
│  SET status = ? │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ INSERT INTO     │
│ ticket_history  │
└──────┬──────────┘
       │ COMMIT
       ▼
┌─────────────────┐
│  Успешный ответ │
│  {success:true} │
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│  Перезагрузка│
│  списка     │
└─────────────┘
```

---

## ⚠️ Важные замечания

1. **Транзакционность**: Если запись в историю не удастся, всё откатится (ROLLBACK)
2. **adminId**: Сохраняется ID администратора для истории
3. **comment**: Может быть null (необязательное поле)
4. **updated_at**: Автоматически обновляется при изменении статуса

---

## 🔍 Отладка

### Логи сервера

```javascript
// При обновлении статуса
console.log(`Admin ${adminId} changed ticket ${id} status: ${oldStatus} → ${status}`);
```

### Логи в БД

```sql
-- Последние изменения
SELECT 
    th.created_at,
    t.subject,
    th.old_status,
    th.new_status,
    th.comment,
    a.username
FROM ticket_history th
JOIN tickets t ON th.ticket_id = t.id
LEFT JOIN admins a ON th.admin_id = a.id
ORDER BY th.created_at DESC
LIMIT 10;
```

---

## 🧪 Тестовые сценарии

### Сценарий 1: Обновление статуса
```
1. Открыть заявку
2. Нажать "В работу"
3. Ввести комментарий "Начал работу"
4. Проверить:
   - Статус: in_progress ✓
   - История: запись с комментарием ✓
   - updated_at: текущее время ✓
```

### Сценарий 2: Обновление без комментария
```
1. Открыть заявку
2. Нажать "Решена"
3. Нажать OK (без комментария)
4. Проверить:
   - Статус: resolved ✓
   - История: comment = null ✓
```

### Сценарий 3: Быстрое переключение
```
1. Открыть заявку
2. Быстро нажать: "В работу" → "Решена" → "Закрыта"
3. Проверить:
   - Статус: closed ✓
   - История: 3 записи ✓
```

---

## 📄 Файлы

| Файл | Описание |
|------|----------|
| `server2/src/models/Ticket.js` | Модель `updateStatus()` |
| `server2/src/routes/tickets.js` | API маршрут PUT /:id/status |
| `server2/src/views/admin.html` | Кнопки изменения статуса |
| `server2/database/migrations/001_init.sql` | Таблица `ticket_history` |
