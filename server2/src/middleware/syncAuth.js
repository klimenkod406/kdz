/**
 * Защита внутреннего API синхронизации (Server 1 → Server 2).
 * Один общий SYNC_SECRET в .env на обоих серверах.
 */
function requireSyncSecret(req, res, next) {
  const secret = process.env.SYNC_SECRET;
  if (!secret || secret.length < 16) {
    return res.status(503).json({
      error: 'Синхронизация отключена: задайте SYNC_SECRET в .env (не короче 16 символов)'
    });
  }

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const headerToken = req.headers['x-sync-token'];
  const token = bearer || (typeof headerToken === 'string' ? headerToken : null);

  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Неверный ключ синхронизации' });
  }

  next();
}

module.exports = { requireSyncSecret };
