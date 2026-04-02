# Изменения: Статистика синхронизации на Server 2

## ✅ Реализованные изменения

### 1. **Исправление даты создания заявки**

**Проблема:** Дата отображалась как `01.01.1970`

**Причина:** `created_at` не передавался при синхронизации

**Решение:**

**Server 1 (SyncService.js):**
```javascript
formData.append('created_at', ticket.created_at);  // ← Добавлено
```

**Server 2 (admin.html):**
```javascript
${ticket.created_at ? new Date(ticket.created_at).toLocaleString('ru-RU') : 'Неизвестно'}
```

---

### 2. **Перенос статистики на Server 2**

**Новая страница:** `/sync-status`

**Файл:** `server2/src/views/sync-status.html`

**Особенности:**
- ✅ Требуется авторизация (как в админ-панели)
- ✅ Показывает статистику по заявкам
- ✅ История синхронизаций из БД
- ✅ Автообновление каждые 30 секунд

---

## 📊 Статистика на странице:

### Карточки:

| Карточка | Описание |
|----------|----------|
| **Всего заявок** | Все заявки в БД |
| **За сегодня** | Заявки созданные сегодня |
| **Синхронизаций** | Количество записей в sync_logs |
| **Успешных** | Количество успешных синхронизаций |

### Таблица истории:

| Колонка | Описание |
|---------|----------|
| **Время** | Когда была синхронизация |
| **Заявок** | Сколько заявок отправлено |
| **Статус** | ✓ Успешно / ✗ Ошибка |
| **Ошибка** | Текст ошибки (если была) |

---

## 🗄️ База данных

### Новая таблица на Server 2:

**Файл:** `server2/database/migrations/001_init.sql`

```sql
-- Таблица логов синхронизации
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    tickets_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at 
  ON sync_logs(created_at DESC);
```

---

## 🔧 API Endpoints

### Server 2:

**GET /api/sync/history**
```javascript
// Требуется авторизация
// Возвращает историю синхронизаций
GET /api/sync/history?limit=50

// Ответ:
[
  {
    "id": 1,
    "tickets_count": 5,
    "success": true,
    "error_message": null,
    "created_at": "2026-04-02T10:00:00.000Z"
  }
]
```

---

## 📁 Новые файлы:

| Файл | Назначение |
|------|------------|
| `server2/src/views/sync-status.html` | Страница статистики |
| `server2/database/migrations/001_init.sql` | Миграция sync_logs |

---

## 📝 Изменённые файлы:

| Файл | Изменения |
|------|-----------|
| `server1/src/services/SyncService.js` | + created_at |
| `server2/src/views/admin.html` | Исправлена дата |
| `server2/src/routes/tickets.js` | + /api/sync/history |
| `server2/src/index.js` | + /sync-status маршрут |
| `server2/database/migrations/001_init.sql` | + sync_logs таблица |

---

## 🚀 Как использовать:

### 1. Перезапустите Server 2:

```bash
# Ctrl+C для остановки
node server2/src/index.js
```

### 2. Откройте статистику:

**URL:** `http://localhost:3002/sync-status`

**Требуется авторизация!**

### 3. Навигация:

```
┌─────────────────────────────────────┐
│ 📊 Server 2 - Статистика            │
│                                     │
│ [Админ-панель] [Статистика]         │
└─────────────────────────────────────┘
```

---

## ✅ Проверка работы:

### 1. Создайте заявку на Server 1

**Форма:**
- Имя: Тест
- Область: Качество
- Проблема: Проверка даты
- Решение: Нет

### 2. Дождитесь синхронизации

Или нажмите "Синхронизировать сейчас" на Server 1.

### 3. Проверьте Server 2

**Админ-панель:**
```
http://localhost:3002/admin
```

**Дата должна быть корректной:**
```
Создана: 02.04.2026, 10:00:00  ← Правильно!
```

### 4. Откройте статистику

**URL:**
```
http://localhost:3002/sync-status
```

**Проверьте:**
- ✅ Статистика по заявкам
- ✅ История синхронизаций
- ✅ Последняя синхронизация

---

## 🔒 Безопасность:

**Страница статистики требует авторизации:**

```javascript
// Проверка в sync-status.html
async function checkAuth() {
  const response = await fetch('/api/auth/me');
  if (!response.ok) {
    window.location.href = '/';  // ← Редирект на вход
  }
}
```

**API требует авторизации:**

```javascript
// /api/sync/history
router.get('/sync/history', requireAuth, async (req, res) => {
  // ← Требуется авторизация
});
```

---

## 📊 Сравнение:

### Было (Server 1):

```
Статистика на Server 1
- Без авторизации
- Только логи синхронизации
- Нет статистики по заявкам
```

### Стало (Server 2):

```
Статистика на Server 2
- С авторизацией ✓
- Логи синхронизации ✓
- Статистика по заявкам ✓
- Заявки за сегодня ✓
- Навигация из админки ✓
```

---

## ✅ ИТОГ

**Все изменения внесены:**

1. ✅ Исправлена дата создания заявки
2. ✅ created_at передаётся при синхронизации
3. ✅ Страница статистики на Server 2
4. ✅ Требуется авторизация
5. ✅ Таблица sync_logs в БД
6. ✅ API /api/sync/history

---

**ПЕРЕЗАПУСТИТЕ ОБА СЕРВЕРА для применения изменений!**

```bash
# Server 1
node server1/src/index.js

# Server 2
node server2/src/index.js
```

**Статистика доступна по адресу:**
```
http://localhost:3002/sync-status
```
