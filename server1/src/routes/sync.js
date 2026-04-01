const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');

const syncService = new SyncService(process.env.SERVER2_URL);

// GET /api/sync/status - статус синхронизации
router.get('/status', async (req, res) => {
  try {
    const history = await syncService.getSyncHistory(10);
    res.json({
      server2Url: process.env.SERVER2_URL,
      syncInterval: process.env.SYNC_INTERVAL_MINUTES,
      tempStorageMinutes: process.env.TEMP_STORAGE_MINUTES,
      lastSyncs: history
    });
  } catch (err) {
    console.error('Ошибка получения статуса:', err);
    res.status(500).json({ error: 'Ошибка получения статуса' });
  }
});

// POST /api/sync/force - принудительная синхронизация
router.post('/force', async (req, res) => {
  try {
    const result = await syncService.syncTickets();
    res.json(result);
  } catch (err) {
    console.error('Ошибка синхронизации:', err);
    res.status(500).json({ error: 'Ошибка синхронизации', details: err.message });
  }
});

// GET /api/sync/history - история синхронизаций
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await syncService.getSyncHistory(limit);
    res.json(history);
  } catch (err) {
    console.error('Ошибка получения истории:', err);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

module.exports = router;
