const db = require('../config/database');

// Статусы заявок
const TICKET_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

class TicketModel {
  // Создание заявки (при синхронизации с Server 1)
  static async createFromSync(ticketData) {
    const {
      id,
      employee_name,
      employee_email,
      department,
      areas,  // Массив областей
      problem,
      solution,
      created_at
    } = ticketData;

    const query = `
      INSERT INTO tickets (
        id, employee_name, employee_email, department,
        areas, problem, solution, created_at, received_from_server1_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

    const values = [
      id,
      employee_name,
      employee_email,
      department,
      JSON.stringify(areas),  // Сохраняем как JSON
      problem,
      solution,
      created_at
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Добавление вложения к заявке (при синхронизации)
  static async addAttachmentFromSync(ticketId, fileData) {
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

  // Создание заявки (локально)
  static async create(ticketData) {
    const {
      employee_name,
      employee_email,
      department,
      area,
      problem,
      solution
    } = ticketData;

    const query = `
      INSERT INTO tickets (
        employee_name, employee_email, department, area, problem, solution
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      employee_name,
      employee_email || null,
      department || null,
      area,
      problem,
      solution || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Получение всех заявок с пагинацией
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      area,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (area) {
      query += ` AND area = $${paramIndex}`;
      values.push(area);
      paramIndex++;
    }

    if (search) {
      query += ` AND (employee_name ILIKE $${paramIndex} OR problem ILIKE $${paramIndex} OR solution ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Получение заявки по ID
  static async findById(id) {
    const query = `
      SELECT t.*, 
             COUNT(tc.id) as comments_count
      FROM tickets t
      LEFT JOIN ticket_comments tc ON t.id = tc.ticket_id
      WHERE t.id = $1
      GROUP BY t.id
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Обновление статуса
  static async updateStatus(id, status, adminId = null, comment = null) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Получаем текущий статус
      const currentTicket = await client.query('SELECT status FROM tickets WHERE id = $1', [id]);
      const oldStatus = currentTicket.rows[0]?.status;

      // Обновляем статус заявки
      const updateQuery = `
        UPDATE tickets 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [status, id]);

      // Добавляем запись в историю
      if (oldStatus !== status) {
        const historyQuery = `
          INSERT INTO ticket_history (ticket_id, admin_id, old_status, new_status, comment)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(historyQuery, [id, adminId, oldStatus, status, comment]);
      }

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Добавление комментария
  static async addComment(ticketId, adminId, comment) {
    const query = `
      INSERT INTO ticket_comments (ticket_id, admin_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [ticketId, adminId, comment]);
    return result.rows[0];
  }

  // Получение комментариев к заявке
  static async getComments(ticketId) {
    const query = `
      SELECT tc.*, a.username as admin_name
      FROM ticket_comments tc
      LEFT JOIN admins a ON tc.admin_id = a.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    const result = await db.query(query, [ticketId]);
    return result.rows;
  }

  // Получение истории изменений
  static async getHistory(ticketId) {
    const query = `
      SELECT th.*, a.username as admin_name
      FROM ticket_history th
      LEFT JOIN admins a ON th.admin_id = a.id
      WHERE th.ticket_id = $1
      ORDER BY th.created_at ASC
    `;
    const result = await db.query(query, [ticketId]);
    return result.rows;
  }

  // Статистика
  static async getStats() {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE area = 'quality') as quality_count,
        COUNT(*) FILTER (WHERE area = 'cost') as cost_count,
        COUNT(*) FILTER (WHERE area = 'sales') as sales_count,
        COUNT(*) FILTER (WHERE area = 'disorder') as disorder_count,
        COUNT(*) FILTER (WHERE area = 'health') as health_count,
        COUNT(*) FILTER (WHERE area = 'productivity') as productivity_count,
        COUNT(*) FILTER (WHERE area = 'overstock') as overstock_count,
        COUNT(*) FILTER (WHERE area = 'environment') as environment_count
      FROM tickets
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  // Поиск заявок (для API)
  static async search(queryText, limit = 50) {
    const query = `
      SELECT * FROM tickets
      WHERE employee_name ILIKE $1
         OR problem ILIKE $1
         OR solution ILIKE $1
         OR department ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [`%${queryText}%`, limit]);
    return result.rows;
  }
}

module.exports = TicketModel;
