const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const morgan = require('morgan');
const path = require('path');
const db = require('./config/database');
const AdminModel = require('./models/Admin');
const authRouter = require('./routes/auth').router;
const ticketsRouter = require('./routes/tickets');
const { uploadErrorHandler } = require('./middleware/upload');
const { logger, LOG_DIR } = require('./utils/logger');

// Локальная копия shared утилит
const { formatDate } = require('./utils');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование HTTP запросов
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim(), { type: 'HTTP_REQUEST' })
  }
}));

// Сессии с хранением в PostgreSQL
app.use(session({
  store: new PgSession({
    pool: db.pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    httpOnly: true,
    secure: false // Для HTTPS установите true
  }
}));

// Статические файлы (верстка + загрузки + favicon)
app.use(express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Маршруты
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);

// Главная страница - вход
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Админ-панель
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Страница не найдена' });
});

// Обработка ошибок (включая ошибки загрузки файлов)
app.use(uploadErrorHandler);
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Создание администратора по умолчанию (если не существует)
async function createDefaultAdmin() {
  try {
    const existingAdmin = await AdminModel.findByUsername(process.env.ADMIN_USERNAME || 'admin');
    if (!existingAdmin) {
      await AdminModel.create(
        process.env.ADMIN_USERNAME || 'admin',
        process.env.ADMIN_PASSWORD || 'admin123'
      );
      console.log(`[${formatDate(new Date())}] Администратор по умолчанию создан`);
    }
  } catch (err) {
    console.error(`[${formatDate(new Date())}] Ошибка создания администратора:`, err.message);
  }
}

// Создание таблицы сессий
async function createSessionTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
      
      ALTER TABLE session ADD CONSTRAINT "session_pkey" PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
      
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session ("expire");
    `);
    console.log(`[${formatDate(new Date())}] Таблица сессий готова`);
  } catch (err) {
    console.error(`[${formatDate(new Date())}] Ошибка создания таблицы сессий:`, err.message);
  }
}

// Запуск сервера
async function startServer() {
  await createSessionTable();
  await createDefaultAdmin();

  app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`  Server 2 запущен на http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`  Админ-панель: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/admin`);
    console.log(`  Доступен в локальной сети: http://<ваш-ip>:${PORT}`);
    console.log('='.repeat(50) + '\n');
    
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    console.log('Данные для входа:');
    console.log(`  Логин: ${adminUser}`);
    console.log(`  Пароль: ${adminPass}`);
    console.log('\n' + '='.repeat(50) + '\n');
  });
}

startServer();
