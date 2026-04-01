const db = require('../config/database');
const bcrypt = require('bcrypt');

class AdminModel {
  // Создание администратора
  static async create(username, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO admins (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username, created_at
    `;
    const result = await db.query(query, [username, passwordHash]);
    return result.rows[0];
  }

  // Поиск администратора по username
  static async findByUsername(username) {
    const query = 'SELECT * FROM admins WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  // Поиск по ID
  static async findById(id) {
    const query = 'SELECT id, username, created_at, last_login FROM admins WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Проверка пароля
  static async verifyPassword(admin, password) {
    return await bcrypt.compare(password, admin.password_hash);
  }

  // Обновление времени последнего входа
  static async updateLastLogin(id) {
    const query = `
      UPDATE admins 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await db.query(query, [id]);
  }

  // Получить всех администраторов
  static async findAll() {
    const query = 'SELECT id, username, created_at, last_login FROM admins ORDER BY id';
    const result = await db.query(query);
    return result.rows;
  }

  // Изменение пароля
  static async changePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const query = `
      UPDATE admins 
      SET password_hash = $1 
      WHERE id = $2
    `;
    await db.query(query, [passwordHash, id]);
  }
}

module.exports = AdminModel;
