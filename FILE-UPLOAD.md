# Загрузка файлов в системе заявок

## ✅ Поддерживаемые форматы

### Изображения
- JPG, JPEG, PNG, GIF, WebP, BMP, TIFF

### Документы
- PDF, DOC, DOCX, XLS, XLSX, TXT, CSV

### Видео
- MP4, WebM, MOV, AVI

### Архивы
- ZIP, RAR, 7Z

## 📊 Ограничения

| Параметр | Server 1 | Server 2 |
|----------|----------|----------|
| Макс. размер файла | 50 MB | 100 MB |
| Макс. количество файлов | 10 | 20 |
| Хранение | Временное | Постоянное |

## 🔄 Как работает загрузка

### 1. Создание заявки с файлами (Server 1)

```
POST /api/tickets
Content-Type: multipart/form-data

Параметры:
- employee_name: string
- employee_email: string (опционально)
- employee_phone: string (опционально)
- department: string (опционально)
- priority: string (low/normal/high/critical)
- subject: string
- description: string
- files: File[] (до 10 файлов)
```

**Ответ:**
```json
{
  "success": true,
  "message": "Заявка успешно создана",
  "ticket": {
    "id": "uuid",
    "employee_name": "...",
    "attachments": [
      {
        "id": 1,
        "file_name": "uuid.jpg",
        "file_original_name": "photo.jpg",
        "file_mime_type": "image/jpeg",
        "file_size": 1024000,
        "file_path": "uploads/uuid.jpg"
      }
    ]
  }
}
```

### 2. Синхронизация с Server 2

Файлы автоматически отправляются на Server 2 вместе с заявкой.

### 3. Скачивание файлов

**Server 1:**
```
GET /api/tickets/:id/files/:filename
```

**Server 2 (требуется авторизация):**
```
GET /api/tickets/:id/files/:filename
Authorization: Cookie (session)
```

## 📁 Структура хранения

```
server1/
└── uploads/
    ├── uuid1.jpg
    ├── uuid2.pdf
    └── uuid3.mp4

server2/
└── uploads/
    ├── uuid1.jpg
    ├── uuid2.pdf
    └── uuid3.mp4
```

## 🔒 Безопасность

1. **Проверка MIME-типа** - только разрешённые типы
2. **Проверка расширения** - двойная валиидация
3. **Ограничение размера** - защита от больших файлов
4. **Уникальные имена** - UUID для каждого файла
5. **Очистка при ошибке** - файлы удаляются если заявка не создалась

## 💡 Пример использования (JavaScript)

```javascript
const formData = new FormData();
formData.append('employee_name', 'Иванов Иван');
formData.append('subject', 'Проблема с ПК');
formData.append('description', 'Не работает мышь');

// Добавляем файлы
const fileInput = document.getElementById('fileInput');
for (const file of fileInput.files) {
  formData.append('files', file);
}

// Отправка
const response = await fetch('/api/tickets', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.ticket.attachments);
```

## ⚠️ Обработка ошибок

### Файл слишком большой
```json
{
  "error": "Файл слишком большой (максимум 50MB)"
}
```

### Недопустимый тип файла
```json
{
  "error": "Недопустимый тип файла. Разрешены: изображения, документы, видео, архивы"
}
```

### Слишком много файлов
```json
{
  "error": "Слишком много файлов (максимум 10)"
}
```

## 🎯 Интерфейс пользователя

Форма загрузки поддерживает:
- **Drag & Drop** - перетаскивание файлов
- **Мультизагрузку** - выбор нескольких файлов
- **Прогресс бар** - отображение прогресса загрузки
- **Предпросмотр** - список файлов с иконками
- **Удаление** - возможность удалить файл перед отправкой
