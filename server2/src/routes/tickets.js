const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../config/database');
const TicketModel = require('../models/Ticket');
const { requireAuth } = require('./auth');
const { upload, uploadErrorHandler, UPLOAD_DIR } = require('../middleware/upload');
const { auditLog } = require('../utils/logger');

// GET /api/sync/history - история синхронизаций
router.get('/sync/history', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const query = 'SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT $1';
    const result = await db.query(query, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения истории:', err);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

// POST /api/tickets/sync - синхронизация с Server 1 (внутренний API)
router.post('/sync', async (req, res) => {
  try {
    const {
      id,
      employee_name,
      employee_email,
      department,
      area,
      problem,
      solution,
      created_at,
      files
    } = req.body;

    // Создаём заявку
    const ticket = await TicketModel.createFromSync({
      id,
      employee_name,
      employee_email,
      department,
      area,
      problem,
      solution,
      created_at
    });

    // Обрабатываем файлы (base64)
    const attachments = [];
    if (files && files.length > 0) {
      for (const fileData of files) {
        // Декодируем base64 и сохраняем файл
        const fileBuffer = Buffer.from(fileData.file_base64, 'base64');
        const filePath = path.join(UPLOAD_DIR, fileData.file_name);
        
        // Создаём директорию если нет
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        
        // Сохраняем файл
        fs.writeFileSync(filePath, fileBuffer);
        
        // Добавляем запись в БД
        const attachment = await TicketModel.addAttachmentFromSync(id, {
          file_name: fileData.file_name,
          file_original_name: fileData.file_original_name,
          file_mime_type: fileData.file_mime_type,
          file_size: fileData.file_size,
          file_path: path.join('uploads', fileData.file_name)
        });
        attachments.push(attachment);
      }
    }

    res.json({
      success: true,
      ticket,
      attachments_count: attachments.length
    });
  } catch (err) {
    console.error('Ошибка синхронизации:', err);
    res.status(500).json({ error: 'Ошибка синхронизации' });
  }
});

// GET /api/tickets - список заявок (требуется авторизация)
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      area,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const tickets = await TicketModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      area,
      search,
      sortBy,
      sortOrder
    });

    res.json(tickets);
  } catch (err) {
    console.error('Ошибка получения заявок:', err);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// GET /api/tickets/stats - статистика
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await TicketModel.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// GET /api/tickets/search - поиск
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    if (!q) {
      return res.json([]);
    }
    const tickets = await TicketModel.search(q, parseInt(limit));
    res.json(tickets);
  } catch (err) {
    console.error('Ошибка поиска:', err);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// GET /api/tickets/:id - заявка по ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const attachments = await TicketModel.getAttachments(req.params.id);
    const comments = await TicketModel.getComments(req.params.id);
    const history = await TicketModel.getHistory(req.params.id);

    res.json({
      ticket: { ...ticket, attachments },
      comments,
      history
    });
  } catch (err) {
    console.error('Ошибка получения заявки:', err);
    res.status(500).json({ error: 'Ошибка получения заявки' });
  }
});

// GET /api/tickets/:id/files/:filename - скачивание файла (требуется авторизация)
router.get('/:id/files/:filename', requireAuth, async (req, res) => {
  try {
    const { id, filename } = req.params;

    // Проверяем существование заявки
    const ticket = await TicketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Проверяем существование файла
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    // Отправляем файл
    res.download(filePath);
  } catch (err) {
    console.error('Ошибка скачивания файла:', err);
    res.status(500).json({ error: 'Ошибка скачивания файла' });
  }
});

// POST /api/tickets/:id/files/download-all - скачать все файлы архивом (требуется авторизация)
router.post('/:id/files/download-all', requireAuth, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // Проверяем существование заявки
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Получаем вложения
    const attachments = await TicketModel.getAttachments(ticketId);
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Нет вложений для скачивания' });
    }

    // Создаём ZIP архив
    const archive = archiver('zip', {
      zlib: { level: 9 } // Максимальное сжатие
    });

    // Обработка ошибок архива
    archive.on('error', (err) => {
      console.error('Ошибка архивации:', err);
      res.status(500).json({ error: 'Ошибка создания архива' });
    });

    // Настраиваем ответ
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId.substring(0, 8)}-files.zip"`);

    // Подключаем архив к ответу
    archive.pipe(res);

    // Добавляем файлы в архив
    let filesAdded = 0;
    for (const attachment of attachments) {
      const filePath = path.join(UPLOAD_DIR, attachment.file_name);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: attachment.file_original_name });
        filesAdded++;
      }
    }

    if (filesAdded === 0) {
      return res.status(404).json({ error: 'Файлы не найдены на сервере' });
    }

    // Завершаем архив
    await archive.finalize();

    // Логируем после успешной отправки
    auditLog.downloadFiles(ticketId, req.session.adminUsername, filesAdded, req.ip);

  } catch (err) {
    console.error('Ошибка создания архива:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка создания архива' });
    }
  }
});

// PUT /api/tickets/:id/status - обновление статуса
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, comment } = req.body;
    const ticket = await TicketModel.updateStatus(
      req.params.id,
      status,
      req.session.adminId,
      comment
    );
    
    // Логируем изменение статуса
    auditLog.statusChange(
      req.params.id,
      req.session.adminUsername,
      ticket.status, // старый статус будет в истории
      status,
      req.ip
    );
    
    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Ошибка обновления статуса:', err);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// POST /api/tickets/:id/comments - добавление комментария
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { comment } = req.body;
    const result = await TicketModel.addComment(
      req.params.id,
      req.session.adminId,
      comment
    );
    
    // Логируем добавление комментария
    auditLog.addComment(
      req.params.id,
      req.session.adminUsername,
      req.ip
    );
    
    res.json({ success: true, comment: result });
  } catch (err) {
    console.error('Ошибка добавления комментария:', err);
    res.status(500).json({ error: 'Ошибка добавления комментария' });
  }
});

module.exports = router;
