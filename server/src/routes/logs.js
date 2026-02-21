const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../config/database');

const router = express.Router();

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// GET /api/logs - Get audit logs with pagination
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const db = getDb();
  const logs = queryAll(db,
    `SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`,
    [parseInt(limit), offset]
  );

  const totalResult = db.exec('SELECT COUNT(*) as count FROM audit_logs');
  const total = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;

  res.json({
    logs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

module.exports = router;
