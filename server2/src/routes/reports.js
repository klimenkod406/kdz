const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const TicketModel = require('../models/Ticket');
const { requireAuth } = require('./auth');

// GET /api/reports/export - экспорт отчёта в Excel
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { status, area, dateFrom, dateTo } = req.query;

    // Получаем данные
    const tickets = await TicketModel.getReportData({
      status,
      area,
      dateFrom,
      dateTo
    });

    // Создаём книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KAYDZEN';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Отчёт по заявкам');

    // Заголовок
    const headerRow = worksheet.addRow([
      'ID', 'Дата создания', 'Сотрудник', 'Соавтор', 'Email', 'Отдел',
      'Области', 'Проблема', 'Решение', 'Статус'
    ]);

    // Стили заголовка
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1a2b6d' }
    };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.height = 25;

    // Ширины столбцов
    worksheet.columns = [
      { width: 12 }, { width: 20 }, { width: 25 }, { width: 25 }, { width: 30 },
      { width: 20 }, { width: 30 }, { width: 40 }, { width: 40 }, { width: 15 }
    ];

    // Карта перевода статусов
    const statusNames = {
      new: 'Новая',
      in_progress: 'В работе',
      resolved: 'Решена',
      closed: 'Закрыта'
    };

    // Карта перевода областей
    const areaNames = {
      quality: 'Качество продукта',
      cost: 'Стоимость',
      sales: 'Увеличение продаж',
      disorder: 'Беспорядок',
      health: 'Здоровье и безопасность',
      productivity: 'Производительность',
      overstock: 'Чрезмерные запасы',
      environment: 'Окружающая среда',
      other: 'Другое'
    };

    // Заполняем данные
    for (const ticket of tickets) {
      let areasText = '';
      try {
        const areas = JSON.parse(ticket.areas);
        if (Array.isArray(areas)) {
          areasText = areas.map(a => areaNames[a] || a).join(', ');
        }
      } catch (e) {
        areasText = ticket.areas || '-';
      }

      const createdDate = ticket.created_at
        ? new Date(ticket.created_at).toLocaleString('ru-RU')
        : 'Неизвестно';

      worksheet.addRow([
        ticket.id,
        createdDate,
        ticket.employee_name || '-',
        ticket.co_author || '-',
        ticket.employee_email || '-',
        ticket.department || '-',
        areasText,
        ticket.problem || '-',
        ticket.solution || '-',
        statusNames[ticket.status] || ticket.status
      ]);
    }

    // Чередование цветов строк
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.alignment = { wrapText: true, vertical: 'top' };

      if (i % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
          };
        });
      }
    }

    // Форматирование имени файла с фильтрами (латиница для совместимости)
    let filenameSuffix = '';
    if (status) filenameSuffix += `_status-${status}`;
    if (area) filenameSuffix += `_area-${area}`;
    if (dateFrom) filenameSuffix += `_from-${dateFrom.replace(/[:\-]/g, '')}`;
    if (dateTo) filenameSuffix += `_to-${dateTo.replace(/[:\-]/g, '')}`;
    
    const filename = `Report_KAYDZEN${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Отправляем файл
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.end(buffer);

  } catch (err) {
    console.error('Ошибка экспорта отчёта:', err);
    res.status(500).json({ error: 'Ошибка экспорта отчёта: ' + err.message });
  }
});

module.exports = router;
