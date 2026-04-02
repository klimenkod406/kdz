# Система логирования (Server 2)

## ✅ Реализованная функциональность

### 📋 Что логируется:

| Событие | Файл лога | Пример |
|---------|-----------|--------|
| **Вход в систему** | `security.log` | `[2026-04-02 10:00:00] [INFO] Вход в систему: admin` |
| **Выход из системы** | `security.log` | `[2026-04-02 10:30:00] [INFO] Выход из системы: admin` |
| **Изменение статуса** | `security.log` | `[2026-04-02 10:15:00] [INFO] Изменение статуса заявки: uuid` |
| **Добавление комментария** | `security.log` | `[2026-04-02 10:20:00] [INFO] Добавление комментария к заявке: uuid` |
| **Скачивание файлов** | `security.log` | `[2026-04-02 10:25:00] [INFO] Скачивание файлов заявки: uuid` |
| **HTTP запросы** | `combined.log` | `[2026-04-02 10:00:00] [INFO] GET /api/tickets 200` |
| **Ошибки** | `error.log` | `[2026-04-02 10:00:00] [ERROR] Ошибка БД: connection refused` |
| **Предупреждения** | `warn.log` | `[2026-04-02 10:00:00] [WARN] Неверный логин: admin` |
| **Синхронизация** | `combined.log` | `[2026-04-02 10:05:00] [INFO] Синхронизация с Server 1: 5 заявок` |

---

## 📁 Структура логов:

```
server2/
├── logs/                    ← Директория логов
│   ├── security.log         ← События безопасности
│   ├── error.log            ← Ошибки
│   ├── warn.log             ← Предупреждения
│   └── combined.log         ← Все логи
├── src/
│   └── utils/
│       └── logger.js        ← Модуль логирования
```

---

## 🔧 Настройки:

### Размер файлов:

- **Максимальный размер:** 5 MB
- **Максимальное количество файлов:** 5-10
- **Ротация:** Автоматическая

### Формат:

```
[YYYY-MM-DD HH:mm:ss] [LEVEL] message {meta}
```

**Пример:**
```
[2026-04-02 10:00:00] [INFO] Вход в систему: admin {"action":"LOGIN","ip":"::1"}
```

---

## 📊 Типы событий:

### 1. **Вход в систему (LOGIN)**

**Файл:** `security.log`

**Успешный вход:**
```json
{
  "level": "info",
  "message": "Вход в систему: admin",
  "action": "LOGIN",
  "success": true,
  "ip": "::1",
  "timestamp": "2026-04-02T10:00:00.000Z"
}
```

**Неуспешный вход:**
```json
{
  "level": "warn",
  "message": "Вход в систему: admin",
  "action": "LOGIN",
  "success": false,
  "ip": "::1",
  "timestamp": "2026-04-02T10:00:00.000Z"
}
```

---

### 2. **Изменение статуса (STATUS_CHANGE)**

**Файл:** `security.log`

```json
{
  "level": "info",
  "message": "Изменение статуса заявки: uuid",
  "action": "STATUS_CHANGE",
  "ticketId": "uuid",
  "username": "admin",
  "oldStatus": "new",
  "newStatus": "in_progress",
  "ip": "::1",
  "timestamp": "2026-04-02T10:15:00.000Z"
}
```

---

### 3. **Скачивание файлов (DOWNLOAD_FILES)**

**Файл:** `security.log`

```json
{
  "level": "info",
  "message": "Скачивание файлов заявки: uuid",
  "action": "DOWNLOAD_FILES",
  "ticketId": "uuid",
  "username": "admin",
  "filesCount": 3,
  "ip": "::1",
  "timestamp": "2026-04-02T10:25:00.000Z"
}
```

---

### 4. **HTTP запросы (HTTP_REQUEST)**

**Файл:** `combined.log`

```
[2026-04-02 10:00:00] [INFO] ::1 - - [02/Apr/2026:10:00:00 +0000] "GET /api/tickets HTTP/1.1" 200 1234
```

---

## 🔍 Просмотр логов:

### 1. **В реальном времени (Linux/Mac):**

```bash
tail -f server2/logs/security.log
```

### 2. **В реальном времени (Windows PowerShell):**

```powershell
Get-Content server2\logs\security.log -Wait -Tail 50
```

### 3. **Последние 100 строк:**

```bash
tail -n 100 server2/logs/security.log
```

### 4. **Поиск по логам:**

**Найти все входы admin:**
```bash
grep "admin" server2/logs/security.log
```

**Найти ошибки:**
```bash
cat server2/logs/error.log
```

---

## 📈 Анализ логов:

### Пример отчёта за день:

```bash
# Количество входов
grep "LOGIN" server2/logs/security.log | wc -l

# Количество неудачных входов
grep "success\":false" server2/logs/security.log | wc -l

# Количество изменений статусов
grep "STATUS_CHANGE" server2/logs/security.log | wc -l

# Количество скачиваний
grep "DOWNLOAD_FILES" server2/logs/security.log | wc -l
```

---

## ⚙️ Настройка:

### Изменить уровень логирования:

**Файл:** `server2/src/utils/logger.js`

```javascript
const logger = winston.createLogger({
  level: 'debug',  // debug, info, warn, error
  // ...
});
```

### Изменить размер файлов:

```javascript
new winston.transports.File({
  filename: path.join(LOG_DIR, 'error.log'),
  maxsize: 10485760,  // 10MB вместо 5MB
  maxFiles: 20        // 20 файлов вместо 5
});
```

---

## 🔒 Безопасность:

### Что защищено:

1. ✅ **Логирование всех входов/выходов**
2. ✅ **Запись IP адресов**
3. ✅ **Логирование изменений статусов**
4. ✅ **Логирование скачиваний файлов**
5. ✅ **Разделение по уровням доступа**

### Что НЕ логируется:

1. ❌ **Пароли** (никогда не записываются)
2. ❌ **Полные данные сессий**
3. ❌ **Тела запросов с чувствительными данными**

---

## 🚀 Установка:

**Зависимости уже добавлены в package.json:**

```json
{
  "winston": "^3.11.0",
  "morgan": "^1.10.0"
}
```

**Установка:**

```bash
cd server2
npm install
```

---

## 📄 Файлы:

| Файл | Назначение |
|------|------------|
| `server2/src/utils/logger.js` | Модуль логирования |
| `server2/logs/security.log` | Логи безопасности |
| `server2/logs/error.log` | Ошибки |
| `server2/logs/warn.log` | Предупреждения |
| `server2/logs/combined.log` | Все логи |

---

## ✅ Проверка работы:

### 1. Запустите Server 2

```bash
node server2/src/index.js
```

### 2. Проверьте создание директории логов

```bash
dir server2\logs
# Должны появиться файлы логов
```

### 3. Выполните действия:

- Войдите в админ-панель
- Откройте заявку
- Измените статус
- Скачайте файлы

### 4. Проверьте логи:

```bash
Get-Content server2\logs\security.log -Tail 20
```

**Должно быть:**
```
[2026-04-02 10:00:00] [INFO] Вход в систему: admin
[2026-04-02 10:15:00] [INFO] Изменение статуса заявки: uuid
[2026-04-02 10:25:00] [INFO] Скачивание файлов заявки: uuid
```

---

## 💡 Примеры использования:

### 1. **Аудит действий пользователя:**

```bash
# Все действия admin
grep "admin" server2/logs/security.log
```

### 2. **Поиск подозрительной активности:**

```bash
# Много неудачных входов
grep "LOGIN.*success\":false" server2/logs/security.log | sort | uniq -c | sort -rn
```

### 3. **Отчёт за период:**

```bash
# Действия за сегодня
grep "2026-04-02" server2/logs/security.log
```

---

## ⚠️ Важные замечания:

### 1. Логи только на Server 2

- ✅ Server 2 логирует все действия
- ❌ Server 1 НЕ логирует (только консоль)

### 2. Ротация файлов

- ✅ Автоматическая при достижении 5MB
- ✅ Старые файлы удаляются (maxFiles)

### 3. Производительность

- ✅ Асинхронная запись
- ✅ Не влияет на работу сервера

---

**ПЕРЕЗАПУСТИТЕ Server 2 для применения изменений!**

```bash
# Ctrl+C для остановки
cd server2
npm install          # Установить Winston и Morgan
node src/index.js    # Запустить заново
```

---

**СИСТЕМА ЛОГИРОВАНИЯ ГОТОВА!** 📝
