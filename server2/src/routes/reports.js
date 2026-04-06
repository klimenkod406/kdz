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

    const worksheet = workbook.addWorksheet('Отчёт по заявкам', {
      properties: { tabColor: { argb: '1a1a2e' } }
    });

    // Настройка столбцов
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Сотрудник', key: 'employee_name', width: 25 },
      { header: 'Email', key: 'employee_email', width: 30 },
      { header: 'Отдел', key: 'department', width: 20 },
      { header: 'Области', key: 'areas', width: 30 },
      { header: 'Проблема', key: 'problem', width: 40 },
      { header: 'Решение', key: 'solution', width: 40 },
      { header: 'Статус', key: 'status', width: 15 }
    ];

    // Стили заголовка
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1a1a2e' }
    };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.height = 30;

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
      // Форматируем области
      let areasText = '';
      try {
        const areas = JSON.parse(ticket.areas);
        if (Array.isArray(areas)) {
          areasText = areas.map(a => areaNames[a] || a).join(', ');
        }
      } catch (e) {
        areasText = ticket.areas || '-';
      }

      // Форматируем дату
      const createdDate = ticket.created_at
        ? new Date(ticket.created_at).toLocaleString('ru-RU')
        : 'Неизвестно';

      worksheet.addRow({
        id: ticket.id,
        created_at: createdDate,
        employee_name: ticket.employee_name || '-',
        employee_email: ticket.employee_email || '-',
        department: ticket.department || '-',
        areas: areasText,
        problem: ticket.problem || '-',
        solution: ticket.solution || '-',
        status: statusNames[ticket.status] || ticket.status
      });
    }

    // Применяем стили к строкам данных
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.alignment = { wrapText: true, vertical: 'top' };
      
      // Чередование цветов строк
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }

      // Цвет статуса
      const statusCell = row.getCell('status');
      const statusColors = {
        'Новая': { fgColor: { argb: '1976D2' }, fontColor: { argb: 'FFFFFF' } },
        'В работе': { fgColor: { argb: 'F57C00' }, fontColor: { argb: 'FFFFFF' } },
        'Решена': { fgColor: { argb: '388E3C' }, fontColor: { argb: 'FFFFFF' } },
        'Закрыта': { fgColor: { argb: '757575' }, fontColor: { argb: 'FFFFFF' } }
      };
      const statusValue = statusCell.value;
      if (statusColors[statusValue]) {
        statusCell.fill = statusColors[statusValue].fgColor;
        statusCell.font = { color: statusColors[statusValue].fontColor, bold: true };
      }
    }

    // Автофильтр
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(worksheet.rowCount, 2), column: 9 }
    };

    // Заморозить заголовок
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Форматирование имени файла с фильтрами
    let filenameSuffix = '';
    if (status) filenameSuffix += `_статус-${status}`;
    if (area) filenameSuffix += `_область-${area}`;
    if (dateFrom) filenameSuffix += `_от-${dateFrom.replace(/[:\-]/g, '')}`;
    if (dateTo) filenameSuffix += `_до-${dateTo.replace(/[:\-]/g, '')}`;
    
    const filename = `Отчет_KAYDZEN${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Отправляем файл
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Ошибка экспорта отчёта:', err);
    res.status(500).json({ error: 'Ошибка экспорта отчёта: ' + err.message });
  }
});

module.exports = router;
