const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('./auth');
const db = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Все маршруты защищены requireAuth
router.use(requireAuth);

// Создаем папку для бэкапов если её нет
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// GET /api/database/export - Выгрузка базы данных в двух форматах
router.get('/export', async (req, res) => {
  let client;
  try {
    client = await db.getClient();

    // Получаем все таблицы
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map(row => row.tablename);
    const exportData = {};

    // Экспортируем данные из каждой таблицы
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM ${table}`);
      exportData[table] = result.rows;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUP_DIR, timestamp);

    // Создаем директорию для этого бэкапа
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Сохраняем JSON (для чтения)
    const jsonPath = path.join(backupDir, 'backup.json');
    const jsonData = {
      export_date: new Date().toISOString(),
      database: process.env.DB_NAME || 'tickets_db',
      tables: exportData
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

    // 2. Сохраняем SQL (для восстановления)
    const sqlPath = path.join(backupDir, 'backup.sql');
    let sqlContent = `-- Database Backup\n`;
    sqlContent += `-- Date: ${new Date().toISOString()}\n`;
    sqlContent += `-- Database: ${process.env.DB_NAME || 'tickets_db'}\n\n`;

    // Генерируем SQL INSERT statements
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (rows.length === 0) continue;

      sqlContent += `-- Table: ${tableName}\n`;

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          // Экранируем строки
          const escaped = String(val).replace(/'/g, "''").replace(/\\/g, '\\\\');
          return `'${escaped}'`;
        });

        sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }

      sqlContent += '\n';
    }

    fs.writeFileSync(sqlPath, sqlContent, 'utf8');

    // Логируем операцию
    logger.info('Database exported', {
      type: 'DB_EXPORT',
      adminId: req.session.adminId,
      adminUsername: req.session.adminUsername,
      backupPath: backupDir
    });

    // Отправляем информацию о созданных файлах
    if (!res.headersSent) {
      res.json({
        success: true,
        message: 'База данных успешно экспортирована',
        path: backupDir,
        files: {
          json: jsonPath,
          sql: sqlPath
        },
        stats: {
          tables: Object.keys(exportData).length,
          totalRecords: Object.values(exportData).reduce((sum, rows) => sum + rows.length, 0)
        }
      });
    }

  } catch (err) {
    console.error('Ошибка экспорта БД:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка экспорта базы данных: ' + err.message });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/database/clear - Очистка базы данных
router.post('/clear', async (req, res) => {
  let client;
  try {
    client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Очищаем таблицы в правильном порядке (сначала зависимые)
      const tablesToClear = [
        'ticket_attachments',
        'ticket_comments',
        'ticket_history',
        'sync_logs',
        'tickets',
        'session'
      ];

      const clearedTables = [];
      for (const table of tablesToClear) {
        const result = await client.query(`DELETE FROM ${table}`);
        clearedTables.push({
          table,
          rowsDeleted: result.rowCount
        });
      }

      await client.query('COMMIT');

      // Логируем операцию
      logger.info('Database cleared', {
        type: 'DB_CLEAR',
        adminId: req.session.adminId,
        adminUsername: req.session.adminUsername,
        clearedTables
      });

      if (!res.headersSent) {
        res.json({
          success: true,
          message: 'База данных успешно очищена',
          clearedTables
        });
      }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка очистки БД:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка очистки базы данных: ' + err.message });
    }
  }
});

// POST /api/database/restore - Восстановление базы данных из JSON файла
router.post('/restore', async (req, res) => {
  let client;
  try {
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Неверный формат данных' });
    }

    if (!data.tables || typeof data.tables !== 'object') {
      return res.status(400).json({ error: 'Отсутствуют данные таблиц' });
    }

    client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Сначала очищаем все таблицы (правильный порядок из-за внешних ключей)
      const tablesToClear = [
        'ticket_attachments',
        'ticket_comments',
        'ticket_history',
        'sync_logs',
        'tickets',
        'session'
      ];

      for (const table of tablesToClear) {
        await client.query(`DELETE FROM ${table}`);
      }

      // Восстанавливаем данные из экспорта
      const restoredTables = [];
      const tables = data.tables;

      for (const [tableName, rows] of Object.entries(tables)) {
        if (!Array.isArray(rows) || rows.length === 0) {
          continue;
        }

        // Пропускаем таблицу admins при восстановлении (сохраняем текущих админов)
        if (tableName === 'admins') {
          continue;
        }

        // Пропускаем таблицу session (не нужна при восстановлении)
        if (tableName === 'session') {
          continue;
        }

        let restoredCount = 0;

        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

          const query = `
            INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')})
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;

          try {
            await client.query(query, values);
            restoredCount++;
          } catch (insertErr) {
            console.error(`Ошибка вставки в ${tableName}:`, insertErr.message);
            // Продолжаем с остальными записями
          }
        }

        restoredTables.push({
          table: tableName,
          rowsRestored: restoredCount
        });
      }

      await client.query('COMMIT');

      // Логируем операцию
      logger.info('Database restored', {
        type: 'DB_RESTORE',
        adminId: req.session.adminId,
        adminUsername: req.session.adminUsername,
        restoredTables
      });

      if (!res.headersSent) {
        res.json({
          success: true,
          message: 'База данных успешно восстановлена',
          restoredTables
        });
      }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка восстановления БД:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка восстановления базы данных: ' + err.message });
    }
  }
});

// POST /api/database/restore-sql - Восстановление базы данных из SQL файла
router.post('/restore-sql', async (req, res) => {
  let client;
  try {
    const { sqlContent } = req.body;

    if (!sqlContent || typeof sqlContent !== 'string') {
      return res.status(400).json({ error: 'Отсутствует SQL содержимое' });
    }

    client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Сначала очищаем все таблицы
      const tablesToClear = [
        'ticket_attachments',
        'ticket_comments',
        'ticket_history',
        'sync_logs',
        'tickets',
        'session'
      ];

      for (const table of tablesToClear) {
        await client.query(`DELETE FROM ${table}`);
      }

      // Парсим SQL и выполняем INSERT statements
      const lines = sqlContent.split('\n');
      let executedCount = 0;
      let errorCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Пропускаем комментарии и пустые строки
        if (!trimmed || trimmed.startsWith('--')) {
          continue;
        }

        // Выполняем INSERT
        if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
          try {
            await client.query(trimmed);
            executedCount++;
          } catch (err) {
            console.error('Ошибка выполнения SQL:', err.message);
            errorCount++;
            // Продолжаем с остальными
          }
        }
      }

      await client.query('COMMIT');

      // Логируем операцию
      logger.info('Database restored from SQL', {
        type: 'DB_RESTORE_SQL',
        adminId: req.session.adminId,
        adminUsername: req.session.adminUsername,
        executedStatements: executedCount,
        errors: errorCount
      });

      if (!res.headersSent) {
        res.json({
          success: true,
          message: 'База данных успешно восстановлена из SQL',
          executedStatements: executedCount,
          errors: errorCount
        });
      }

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка восстановления БД из SQL:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка восстановления базы данных из SQL: ' + err.message });
    }
  }
});

// GET /api/database/stats - Статистика базы данных
router.get('/stats', async (req, res) => {
  let client;
  try {
    client = await db.getClient();
    try {
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      const tables = tablesResult.rows.map(row => row.tablename);
      const tableStats = {};

      for (const table of tables) {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        tableStats[table] = parseInt(result.rows[0].count);
      }

      res.json({
        tables: tableStats,
        totalRecords: Object.values(tableStats).reduce((sum, count) => sum + count, 0)
      });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка получения статистики' });
    }
  }
});

module.exports = router;
