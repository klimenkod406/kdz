const db = require('../config/database');

class TicketModel {
  // Создание новой заявки
  static async create(ticketData) {
    const {
      employee_name,
      employee_email,
      employee_phone,
      department,
      subject,
      description,
      priority = 'normal'
    } = ticketData;

    const query = `
      INSERT INTO tickets (
        employee_name, employee_email, employee_phone, department,
        subject, description, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      employee_name,
      employee_email || null,
      employee_phone || null,
      department || null,
      subject,
      description,
      priority
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Получение всех заявок
  static async findAll() {
    const result = await db.query('SELECT * FROM tickets ORDER BY created_at DESC');
    return result.rows;
  }

  // Получение заявки по ID
  static async findById(id) {
    const result = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Получение несентых заявок (старше указанного времени)
  static async findNotSent(minutesAgo = 30) {
    const query = `
      SELECT * FROM tickets 
      WHERE sent_to_server2 = FALSE 
        AND created_at <= NOW() - INTERVAL '${minutesAgo} minutes'
      ORDER BY created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Отметка заявки как отправленной
  static async markAsSent(id) {
    const query = `
      UPDATE tickets 
      SET sent_to_server2 = TRUE, sent_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Удаление старых отправленных заявок
  static async deleteOldSent(daysOld = 7) {
    const query = `
      DELETE FROM tickets 
      WHERE sent_to_server2 = TRUE 
        AND sent_at <= NOW() - INTERVAL '${daysOld} days'
    `;
    const result = await db.query(query);
    return result.rowCount;
  }

  // Статистика
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sent_to_server2 = FALSE) as pending,
        COUNT(*) FILTER (WHERE sent_to_server2 = TRUE) as sent
      FROM tickets
    `;
    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = TicketModel;
