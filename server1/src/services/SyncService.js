const axios = require('axios');
const TicketModel = require('../models/Ticket');
const db = require('../config/database');
const { formatDate } = require('../utils');

class SyncService {
  constructor(server2Url) {
    this.server2Url = server2Url;
  }

  // Синхронизация заявок с Server 2
  async syncTickets() {
    console.log(`[${formatDate(new Date())}] Начало синхронизации с ${this.server2Url}`);
    
    try {
      // Получаем несентые заявки (старше 30 минут)
      const tempStorageMinutes = process.env.TEMP_STORAGE_MINUTES || 30;
      const tickets = await TicketModel.findNotSent(tempStorageMinutes);

      if (tickets.length === 0) {
        console.log(`[${formatDate(new Date())}] Нет заявок для отправки`);
        return { success: true, sent: 0 };
      }

      console.log(`[${formatDate(new Date())}] Отправка ${tickets.length} заявок...`);

      let sentCount = 0;
      let errorCount = 0;

      for (const ticket of tickets) {
        try {
          // Отправляем заявку на Server 2
          await axios.post(`${this.server2Url}/api/tickets/sync`, {
            id: ticket.id,
            employee_name: ticket.employee_name,
            employee_email: ticket.employee_email,
            employee_phone: ticket.employee_phone,
            department: ticket.department,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority,
            created_at: ticket.created_at
          });

          // Помечаем как отправленную
          await TicketModel.markAsSent(ticket.id);
          sentCount++;
          console.log(`  ✓ Заявка ${ticket.id} отправлена`);

        } catch (err) {
          errorCount++;
          console.error(`  ✗ Ошибка отправки заявки ${ticket.id}: ${err.message}`);
        }
      }

      // Логируем результат синхронизации
      await this.logSync(sentCount, true);

      console.log(`[${formatDate(new Date())}] Синхронизация завершена: ${sentCount} успешно, ${errorCount} ошибок`);

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
