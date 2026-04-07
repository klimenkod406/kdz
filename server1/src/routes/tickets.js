const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const TicketModel = require('../models/Ticket');
const { upload, uploadErrorHandler, UPLOAD_DIR } = require('../middleware/upload');

// POST /api/tickets - создание новой заявки с файлами
router.post('/', upload.array('files', 10), uploadErrorHandler, async (req, res) => {
  try {
    const { employee_name, co_author, employee_email, department, areas, problem, solution } = req.body;

    // Парсим JSON массив областей
    let areasArray = [];
    try {
      if (typeof areas === 'string') {
        areasArray = JSON.parse(areas);
      } else if (Array.isArray(areas)) {
        areasArray = areas;
      }
    } catch (parseErr) {
      console.error('[ERROR] Ошибка парсинга areas:', parseErr.message);
      return res.status(400).json({ error: 'Неверный формат данных областей' });
    }

    // Фильтруем пустые и невалидные значения
    areasArray = areasArray.filter(a => a && typeof a === 'string' && a.trim().length > 0);

    // Валидация - проверяем на пустые строки тоже
    if (!employee_name || !employee_name.trim()) {
      return res.status(400).json({ error: 'Поле "Имя" обязательно' });
    }
    if (!areasArray || areasArray.length === 0) {
      return res.status(400).json({ error: 'Выберите хотя бы одну область' });
    }
    if (!problem || !problem.trim()) {
      return res.status(400).json({ error: 'Поле "Проблема" обязательно' });
    }

    // Создаём заявку
    const ticket = await TicketModel.create({
      employee_name: employee_name.trim(),
      co_author: co_author ? co_author.trim() : null,
      employee_email: employee_email ? employee_email.trim() : null,
      department: department ? department.trim() : null,
      areas: areasArray,
      problem: problem.trim(),
      solution: solution ? solution.trim() : null
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

module.exports = router;
