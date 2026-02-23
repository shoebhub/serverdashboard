const { getDb, saveDb } = require('../config/database');

// Sensitive endpoints that should be logged even for GET requests
const SENSITIVE_GET_ROUTES = [
    '/api/logs',
    '/api/users',
    '/api/proxmox-users',
    '/api/nodes',
    '/api/vms',
    '/api/storage',
    '/api/network',
];

// Routes to skip logging entirely (noisy/health)
const SKIP_ROUTES = [
    '/api/health',
    '/metrics',
    '/',
];

function getActionLabel(method, url) {
    if (url.includes('/auth/login')) return 'USER_LOGIN';
    if (url.includes('/auth/register')) return 'USER_REGISTER';
    if (url.includes('/proxmox-users') && method === 'POST') return 'PROXMOX_USER_CREATE';
    if (url.includes('/proxmox-users') && method === 'PUT') return 'PROXMOX_USER_UPDATE';
    if (url.includes('/proxmox-users') && method === 'DELETE') return 'PROXMOX_USER_DELETE';
    if (url.includes('/proxmox-users/acl') && method === 'PUT') return 'PROXMOX_ACL_ASSIGN';
    if (url.includes('/proxmox-users/acl') && method === 'DELETE') return 'PROXMOX_ACL_REMOVE';
    if (url.includes('/vms') && method === 'POST') return 'VM_ACTION';
    if (url.includes('/users') && method === 'POST') return 'DASHBOARD_USER_CREATE';
    if (url.includes('/users') && method === 'PUT') return 'DASHBOARD_USER_UPDATE';
    if (url.includes('/users') && method === 'DELETE') return 'DASHBOARD_USER_DELETE';
    if (method === 'GET') return 'DATA_ACCESS';
    return `${method}_REQUEST`;
}

function auditLogMiddleware(req, res, next) {
    const startTime = Date.now();

    res.on('finish', () => {
        try {
            const url = req.originalUrl.split('?')[0]; // strip query params for matching

            // Skip noisy routes
            if (SKIP_ROUTES.some(r => url === r)) return;

            // Log all POST/PUT/PATCH/DELETE
            const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

            // Log GET requests to sensitive endpoints
            const isSensitiveGet = req.method === 'GET' && SENSITIVE_GET_ROUTES.some(r => url.startsWith(r));

            if (!isMutation && !isSensitiveGet) return;

            const db = getDb();
            const actionLabel = getActionLabel(req.method, req.originalUrl);

            db.run(
                'INSERT INTO audit_logs (user_id, action, resource, details, ip_address, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    req.user ? req.user.id : null,
                    actionLabel,
                    req.originalUrl,
                    JSON.stringify({
                        method: req.method,
                        statusCode: res.statusCode,
                        duration: Date.now() - startTime,
                        userAgent: req.headers['user-agent'],
                        ...(isMutation && req.body && Object.keys(req.body).length > 0
                            ? { body: sanitizeBody(req.body) }
                            : {}),
                    }),
                    req.ip || req.connection.remoteAddress,
                    new Date().toISOString(),
                ]
            );
            saveDb();
        } catch (err) {
            console.error('Audit log error:', err.message);
        }
    });

    next();
}

// Remove sensitive fields from request body before logging
function sanitizeBody(body) {
    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiToken'];
    for (const key of sensitiveKeys) {
        if (sanitized[key]) sanitized[key] = '***REDACTED***';
    }
    return sanitized;
}

module.exports = { auditLogMiddleware };
