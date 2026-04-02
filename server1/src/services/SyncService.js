const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TicketModel = require('../models/Ticket');
const db = require('../config/database');
const { formatDate } = require('../utils');
const { UPLOAD_DIR } = require('../middleware/upload');

class SyncService {
  constructor(server2Url) {
    this.server2Url = server2Url;
  }

  // Синхронизация заявок с Server 2
  async syncTickets() {
    console.log(`[${formatDate(new Date())}] Начало синхронизации с ${this.server2Url}`);
    
    try {
      // Получаем все несентые заявки
      const tickets = await TicketModel.findNotSent(0);

      if (tickets.length === 0) {
        console.log(`[${formatDate(new Date())}] Нет заявок для отправки`);
        return { success: true, sent: 0 };
      }

      console.log(`[${formatDate(new Date())}] Отправка ${tickets.length} заявок...`);

      let sentCount = 0;
      let errorCount = 0;

      for (const ticket of tickets) {
        try {
          // Получаем вложения заявки
          const attachments = await TicketModel.getAttachments(ticket.id);

          // Кодируем файлы в base64
          const filesData = [];
          for (const attachment of attachments) {
            const filePath = path.join(UPLOAD_DIR, attachment.file_name);
            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              filesData.push({
                file_name: attachment.file_name,
                file_original_name: attachment.file_original_name,
                file_mime_type: attachment.file_mime_type,
                file_size: attachment.file_size,
                file_base64: fileBuffer.toString('base64')
              });
            }
          }

          // Отправляем заявку на Server 2 как JSON
          let parsedAreas = [];
          try {
            parsedAreas = JSON.parse(ticket.areas);
          } catch (parseErr) {
            console.error(`[ERROR] Ошибка парсинга areas для заявки ${ticket.id}:`, parseErr.message);
            parsedAreas = [];
          }

          await axios.post(`${this.server2Url}/api/tickets/sync`, {
            id: ticket.id,
            employee_name: ticket.employee_name,
            employee_email: ticket.employee_email || '',
            department: ticket.department || '',
            areas: parsedAreas,
            problem: ticket.problem,
            solution: ticket.solution || '',
            created_at: ticket.created_at,
            files: filesData
          }, {
            headers: { 'Content-Type': 'application/json' },
            maxBodyLength: 100 * 1024 * 1024,  // 100MB
            maxContentLength: 100 * 1024 * 1024,  // 100MB
            timeout: 120000  // 120 секунд
          });

          // Помечаем как отправленную
          await TicketModel.markAsSent(ticket.id);
          sentCount++;
          console.log(`  ✓ Заявка ${ticket.id} отправлена (${attachments.length} файлов)`);

          // Удаляем файлы после успешной отправки
          if (attachments.length > 0) {
            for (const attachment of attachments) {
              const filePath = path.join(UPLOAD_DIR, attachment.file_name);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`    🗑️ Файл удалён: ${attachment.file_original_name}`);
              }
            }
            // Удаляем записи о вложениях из БД
            await TicketModel.deleteAttachments(ticket.id);
          }

        } catch (err) {
          errorCount++;
          console.error(`  ✗ Ошибка отправки заявки ${ticket.id}: ${err.message}`);
        }
      }

      // Логируем результат синхронизации
      await this.logSync(sentCount, true);

      console.log(`[${formatDate(new Date())}] Синхронизация завершена: ${sentCount} успешно, ${errorCount} ошибок`);

      // Удаляем старые отправленные заявки (старше 7 дней)
      if (sentCount > 0) {
        const deletedCount = await this.cleanupOldTickets();
        if (deletedCount > 0) {
          console.log(`[${formatDate(new Date())}] Удалено старых заявок: ${deletedCount}`);
        }
      }

      return { success: errorCount === 0, sent: sentCount, errors: errorCount };

    } catch (err) {
      console.error(`[${formatDate(new Date())}] Критическая ошибка синхронизации: ${err.message}`);
      await this.logSync(0, false, err.message);
      return { success: false, error: err.message };
    }
  }

  // Логирование синхронизации
  async logSync(ticketsCount, success, errorMessage = null) {
    const query = `
      INSERT INTO sync_logs (tickets_count, success, error_message)
      VALUES ($1, $2, $3)
    `;
    await db.query(query, [ticketsCount, success, errorMessage]);
  }

  // Удаление старых отправленных заявок
  async cleanupOldTickets(daysOld = 7) {
    try {
      const result = await TicketModel.deleteOldSent(daysOld);
      return result;
    } catch (err) {
      console.error(`[${formatDate(new Date())}] Ошибка очистки старых заявок:`, err.message);
      return 0;
    }
  }

  // Получение истории синхронизаций
  async getSyncHistory(limit = 50) {
    const query = `
      SELECT * FROM sync_logs 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = SyncService;
