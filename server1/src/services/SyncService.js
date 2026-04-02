const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
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
      const tickets = await TicketModel.findNotSent(0); // 0 = отправлять сразу все

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

          // Формируем данные для отправки через FormData
          const formData = new FormData();
          formData.append('id', ticket.id);
          formData.append('employee_name', ticket.employee_name);
          formData.append('employee_email', ticket.employee_email || '');
          formData.append('department', ticket.department || '');
          formData.append('area', ticket.area);
          formData.append('problem', ticket.problem);
          formData.append('solution', ticket.solution || '');
          formData.append('created_at', ticket.created_at);

          // Добавляем файлы
          for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            const filePath = path.join(UPLOAD_DIR, attachment.file_name);

            if (fs.existsSync(filePath)) {
              // Используем form-data.append с потоком
              formData.append('files', fs.createReadStream(filePath), attachment.file_original_name);
            }
          }

          // Отправляем заявку на Server 2
          await axios.post(`${this.server2Url}/api/tickets/sync`, formData, {
            headers: {
              ...formData.getHeaders()
              // Content-Length будет вычислен автоматически
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
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

  // Очистка старых логов (старше 30 дней)
  async cleanupLogs(daysOld = 30) {
    const query = `
      DELETE FROM sync_logs 
      WHERE created_at <= NOW() - INTERVAL '${daysOld} days'
    `;
    const result = await db.query(query);
    return result.rowCount;
  }
}

module.exports = SyncService;
