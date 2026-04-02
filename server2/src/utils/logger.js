const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Директория для логов
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Создаём директорию если не существует
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Форматирование даты (MSK UTC+3)
function formatDate() {
  return new Date().toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Moscow'
  });
}

// Кастомный формат вывода (MSK UTC+3)
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => {
      return new Date().toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Moscow'
      });
    }
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`.trim();
  })
);

// Создание логгера
const logger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: { service: 'ticket-system' },
  transports: [
    // Ошибки в отдельный файл
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Предупреждения
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'warn.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Все логи
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    // Логи безопасности (входы, выходы)
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'security.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// В консоль только в development режиме
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    )
  }));
}

// Специальные функции для логирования событий
const auditLog = {
  // Вход пользователя
  login: (username, success, ip) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `Вход в систему: ${username}`, {
      action: 'LOGIN',
      success: success,
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Выход пользователя
  logout: (username, ip) => {
    logger.info(`Выход из системы: ${username}`, {
      action: 'LOGOUT',
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Изменение статуса заявки
  statusChange: (ticketId, username, oldStatus, newStatus, ip) => {
    logger.info(`Изменение статуса заявки: ${ticketId}`, {
      action: 'STATUS_CHANGE',
      ticketId: ticketId,
      username: username,
      oldStatus: oldStatus,
      newStatus: newStatus,
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Добавление комментария
  addComment: (ticketId, username, ip) => {
    logger.info(`Добавление комментария к заявке: ${ticketId}`, {
      action: 'ADD_COMMENT',
      ticketId: ticketId,
      username: username,
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Скачивание файлов
  downloadFiles: (ticketId, username, count, ip) => {
    logger.info(`Скачивание файлов заявки: ${ticketId}`, {
      action: 'DOWNLOAD_FILES',
      ticketId: ticketId,
      username: username,
      filesCount: count,
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Синхронизация с Server 1
  sync: (ticketsCount, success) => {
    const level = success ? 'info' : 'error';
    logger.log(level, `Синхронизация с Server 1: ${ticketsCount} заявок`, {
      action: 'SYNC',
      ticketsCount: ticketsCount,
      success: success,
      timestamp: new Date().toISOString()
    });
  },

  // Создание заявки
  createTicket: (ticketId, employeeName, ip) => {
    logger.info(`Создание заявки: ${ticketId}`, {
      action: 'CREATE_TICKET',
      ticketId: ticketId,
      employeeName: employeeName,
      ip: ip,
      timestamp: new Date().toISOString()
    });
  },

  // Ошибка
  error: (message, error, context) => {
    logger.error(message, {
      action: 'ERROR',
      error: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { logger, auditLog, LOG_DIR };
