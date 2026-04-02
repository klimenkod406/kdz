const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const SyncService = require('./services/SyncService');
const ticketsRouter = require('./routes/tickets');
const { uploadErrorHandler } = require('./middleware/upload');

// Локальная копия shared утилит
const { formatDate } = require('./utils');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (верстка + загрузки)
app.use(express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршруты
app.use('/api/tickets', ticketsRouter);

// Главная страница - форма подачи заявки
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Инициализация синхронизации
const syncService = new SyncService(process.env.SERVER2_URL);
const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 5;

// Планировщик синхронизации (запускается каждые N минут)
console.log(`[${formatDate(new Date())}] Планировщик синхронизации запущен (интервал: ${syncInterval} мин)`);
console.log(`[${formatDate(new Date())}] Server 2 URL: ${process.env.SERVER2_URL}`);

cron.schedule(`*/${syncInterval} * * * *`, async () => {
  console.log(`\n[${formatDate(new Date())}] Запуск плановой синхронизации...`);
  await syncService.syncTickets();
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

// Запуск сервера
app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`  Server 1 запущен на http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  Доступен в локальной сети: http://<ваш-ip>:${PORT}`);
  console.log('='.repeat(50) + '\n');
});
