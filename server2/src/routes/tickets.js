const express = require('express');
const router = express.Router();
const TicketModel = require('../models/Ticket');
const { requireAuth } = require('./auth');

// GET /api/tickets - список заявок (требуется авторизация)
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const tickets = await TicketModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      priority,
      search,
      sortBy,
      sortOrder
    });

    res.json(tickets);
  } catch (err) {
    console.error('Ошибка получения заявок:', err);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// GET /api/tickets/stats - статистика
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await TicketModel.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Ошибка получения статистики:', err);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// GET /api/tickets/search - поиск
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    if (!q) {
      return res.json([]);
    }
    const tickets = await TicketModel.search(q, parseInt(limit));
    res.json(tickets);
  } catch (err) {
    console.error('Ошибка поиска:', err);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// GET /api/tickets/:id - заявка по ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const comments = await TicketModel.getComments(req.params.id);
    const history = await TicketModel.getHistory(req.params.id);

    res.json({
      ticket,
      comments,
      history
    });
  } catch (err) {
    console.error('Ошибка получения заявки:', err);
    res.status(500).json({ error: 'Ошибка получения заявки' });
  }
});

// POST /api/tickets/sync - синхронизация с Server 1 (внутренний API)
router.post('/sync', async (req, res) => {
  try {
    const ticket = await TicketModel.createFromSync(req.body);
    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Ошибка синхронизации:', err);
    res.status(500).json({ error: 'Ошибка синхронизации' });
  }
});

// PUT /api/tickets/:id/status - обновление статуса
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, comment } = req.body;
    const ticket = await TicketModel.updateStatus(
      req.params.id,
      status,
      req.session.adminId,
      comment
    );
    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Ошибка обновления статуса:', err);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// POST /api/tickets/:id/comments - добавление комментария
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { comment } = req.body;
    const result = await TicketModel.addComment(
      req.params.id,
      req.session.adminId,
      comment
    );
    res.json({ success: true, comment: result });
  } catch (err) {
    console.error('Ошибка добавления комментария:', err);
    res.status(500).json({ error: 'Ошибка добавления комментария' });
  }
});

module.exports = router;
