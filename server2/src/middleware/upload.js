const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateUUID } = require('../utils');

// Директория для загрузки файлов
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Создаём директорию если не существует
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Настройка хранилища
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Для синхронизации используем имя из данных или генерируем новое
    if (req.body.sync_file_name) {
      cb(null, req.body.sync_file_name);
    } else {
      const ext = path.extname(file.originalname);
      const filename = generateUUID() + ext;
      cb(null, filename);
    }
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Разрешённые MIME типы
  const allowedMimeTypes = [
    // Изображения
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    // Документы
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Видео
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    // Архивы
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  // Разрешённые расширения
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
    '.mp4', '.webm', '.mov', '.avi',
    '.zip', '.rar', '.7z'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error(`Недопустимый тип файла: ${file.originalname}`);
    error.code = 'FILE_TYPE_NOT_ALLOWED';
    cb(error, false);
  }
};

// Настройка multer для приёма множественных файлов
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // Максимум 100MB на файл для Server 2
    files: 20 // Максимум 20 файлов
  }
});

// Middleware для обработки ошибок
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой (максимум 100MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Слишком много файлов (максимум 20)' });
    }
    return res.status(400).json({ error: `Ошибка загрузки: ${err.message}` });
  }
  
  if (err.code === 'FILE_TYPE_NOT_ALLOWED') {
    return res.status(400).json({ 
      error: 'Недопустимый тип файла. Разрешены: изображения, документы, видео, архивы' 
    });
  }
  
  next(err);
};

module.exports = { upload, uploadErrorHandler, UPLOAD_DIR };
