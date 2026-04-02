const db = require('../config/database');

class TicketModel {
  // Создание новой заявки
  static async create(ticketData) {
    const {
      employee_name,
      employee_email,
      department,
      area,
      subject,
      description
    } = ticketData;

    const query = `
      INSERT INTO tickets (
        employee_name, employee_email, department, area, subject, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      employee_name,
      employee_email || null,
      department || null,
      area,
      subject,
      description
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Добавление вложения к заявке
  static async addAttachment(ticketId, fileData) {
    const {
      file_name,
      file_original_name,
      file_mime_type,
      file_size,
      file_path
    } = fileData;

    const query = `
      INSERT INTO ticket_attachments (
        ticket_id, file_name, file_original_name, file_mime_type, file_size, file_path
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      ticketId,
      file_name,
      file_original_name,
      file_mime_type,
      file_size,
      file_path
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Получение вложений заявки
  static async getAttachments(ticketId) {
    const query = 'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY created_at ASC';
    const result = await db.query(query, [ticketId]);
    return result.rows;
  }

  // Удаление вложений заявки
  static async deleteAttachments(ticketId) {
    const query = 'DELETE FROM ticket_attachments WHERE ticket_id = $1';
    await db.query(query, [ticketId]);
  }

  // Получение всех заявок
  static async findAll() {
    const result = await db.query('SELECT * FROM tickets ORDER BY created_at DESC');
    return result.rows;
  }

  // Получение заявки по ID с вложениями
  static async findByIdWithAttachments(id) {
    const ticketResult = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    const ticket = ticketResult.rows[0];
    
    if (!ticket) {
      return null;
    }

    const attachments = await this.getAttachments(id);
    return { ...ticket, attachments };
  }

  // Получение заявки по ID
  static async findById(id) {
    const result = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Получение несентых заявок
  static async findNotSent(minutesAgo = 0) {
    // Защита от SQL-инъекций - только числа
    const minutes = parseInt(minutesAgo) || 0;
    
    if (minutes === 0) {
      // Отправлять все несентые заявки сразу
      const query = `
        SELECT * FROM tickets
        WHERE sent_to_server2 = FALSE
        ORDER BY created_at ASC
      `;
      const result = await db.query(query);
      return result.rows;
    } else {
      // Отправлять заявки старше указанного времени
      const query = `
        SELECT * FROM tickets
        WHERE sent_to_server2 = FALSE
          AND created_at <= NOW() - INTERVAL '1 minute' * $1
        ORDER BY created_at ASC
      `;
      const result = await db.query(query, [minutes]);
      return result.rows;
    }
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
    // Защита от SQL-инъекций - только числа
    const days = parseInt(daysOld) || 7;
    const query = `
      DELETE FROM tickets
      WHERE sent_to_server2 = TRUE
        AND sent_at <= NOW() - INTERVAL '1 day' * $1
    `;
    const result = await db.query(query, [days]);
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
