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

// GET /api/logs - Get audit logs with pagination, filtering, search
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 50, action, search, startDate, endDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const db = getDb();

  let whereClauses = [];
  let params = [];

  // Filter by action type
  if (action && action !== 'all') {
    whereClauses.push('al.action = ?');
    params.push(action);
  }

  // Search in action, resource, ip_address, username
  if (search) {
    whereClauses.push('(al.action LIKE ? OR al.resource LIKE ? OR al.ip_address LIKE ? OR u.username LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Date range filter
  if (startDate) {
    whereClauses.push('al.timestamp >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('al.timestamp <= ?');
    params.push(endDate);
  }

  const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const logs = queryAll(db,
    `SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereSQL} ORDER BY al.timestamp DESC LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  // Get total count with same filters
  const countParams = [...params];
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereSQL}`);
  countStmt.bind(countParams);
  let total = 0;
  if (countStmt.step()) {
    total = countStmt.getAsObject().count;
  }
  countStmt.free();

  // Get action types for filter dropdown
  const actionTypes = queryAll(db, 'SELECT DISTINCT action FROM audit_logs ORDER BY action');

  // Get summary stats
  const statsResult = queryAll(db, `
    SELECT 
      COUNT(*) as total_logs,
      COUNT(CASE WHEN timestamp >= datetime('now', '-1 hour') THEN 1 END) as last_hour,
      COUNT(CASE WHEN timestamp >= datetime('now', '-24 hours') THEN 1 END) as last_24h,
      COUNT(CASE WHEN action = 'USER_LOGIN' THEN 1 END) as total_logins,
      COUNT(CASE WHEN json_extract(details, '$.statusCode') >= 400 THEN 1 END) as total_errors
    FROM audit_logs
  `);

  res.json({
    logs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    actionTypes: actionTypes.map(a => a.action),
    stats: statsResult[0] || { total_logs: 0, last_hour: 0, last_24h: 0, total_logins: 0, total_errors: 0 },
  });
});

module.exports = router;
