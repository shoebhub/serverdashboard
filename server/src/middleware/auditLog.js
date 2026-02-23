const { getDb, saveDb } = require('../config/database');

function auditLogMiddleware(req, res, next) {
    const startTime = Date.now();

    res.on('finish', () => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            try {
                const db = getDb();
                db.run(
                    'INSERT INTO audit_logs (user_id, action, resource, details, ip_address, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        req.user ? req.user.id : null,
                        `${req.method} ${req.originalUrl}`,
                        req.originalUrl,
                        JSON.stringify({
                            statusCode: res.statusCode,
                            duration: Date.now() - startTime,
                            userAgent: req.headers['user-agent'],
                        }),
                        req.ip || req.connection.remoteAddress,
                        new Date().toISOString(),
                    ]
                );
                saveDb();
            } catch (err) {
                console.error('Audit log error:', err.message);
            }
        }
    });

    next();
}

module.exports = { auditLogMiddleware };
