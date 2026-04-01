const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const TicketModel = require('../models/Ticket');
const { upload, uploadErrorHandler, UPLOAD_DIR } = require('../middleware/upload');

// POST /api/tickets - создание новой заявки с файлами
router.post('/', upload.array('files', 10), uploadErrorHandler, async (req, res) => {
  try {
    const { employee_name, employee_email, employee_phone, department, subject, description, priority } = req.body;

    // Валидация
    if (!employee_name || !subject || !description) {
      return res.status(400).json({ error: 'Поля "Имя", "Тема" и "Описание" обязательны' });
    }

    // Создаём заявку
    const ticket = await TicketModel.create({
      employee_name,
      employee_email,
      employee_phone,
      department,
      subject,
      description,
      priority
    });

    // Обрабатываем файлы
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const attachment = await TicketModel.addAttachment(ticket.id, {
          file_name: file.filename,
          file_original_name: file.originalname,
          file_mime_type: file.mimetype,
          file_size: file.size,
          file_path: path.join('uploads', file.filename)
        });
        attachments.push(attachment);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Заявка успешно создана',
      ticket: {
        ...ticket,
        attachments
      }
    });
  } catch (err) {
    console.error('Ошибка создания заявки:', err);
    // Удаляем файлы если заявка не создалась
    if (req.files) {
      for (const file of req.files) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    res.status(500).json({ error: 'Ошибка создания заявки' });
  }
});

// GET /api/tickets - список всех заявок
router.get('/', async (req, res) => {
  try {
    const tickets = await TicketModel.findAll();
    res.json(tickets);
  } catch (err) {
    console.error('Ошибка получения заявок:', err);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// GET /api/tickets/stats - статистика
router.get('/stats', async (req, res) => {
  try {
    const stats = await TicketModel.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// GET /api/tickets/:id - заявка по ID с вложениями
router.get('/:id', async (req, res) => {
  try {
    const ticket = await TicketModel.findByIdWithAttachments(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    res.json(ticket);
  } catch (err) {
    console.error('Ошибка получения заявки:', err);
    res.status(500).json({ error: 'Ошибка получения заявки' });
  }
});

// GET /api/tickets/:id/files/:filename - скачивание файла
router.get('/:id/files/:filename', async (req, res) => {
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

module.exports = router;
