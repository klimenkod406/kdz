const express = require('express');
const router = express.Router();
const AdminModel = require('../models/Admin');

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ error: 'Требуется авторизация' });
}

// POST /api/auth/login - вход
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const admin = await AdminModel.findByUsername(username);
    if (!admin) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValid = await AdminModel.verifyPassword(admin, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Обновляем время последнего входа
    await AdminModel.updateLastLogin(admin.id);

    // Создаем сессию
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// POST /api/auth/logout - выход
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка выхода' });
    }
    res.json({ success: true });
  });
});

// GET /api/auth/me - текущий пользователь
router.get('/me', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const admin = await AdminModel.findById(req.session.adminId);
    if (!admin) {
      req.session.destroy();
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    res.json({
      success: true,
      admin
    });
  } catch (err) {
    console.error('Ошибка получения данных:', err);
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = { router, requireAuth };
