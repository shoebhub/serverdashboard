const jwt = require('jsonwebtoken');

// Role hierarchy: super_admin > admin > operator > viewer
const ROLES = {
    super_admin: { level: 4, label: 'Super Admin', permissions: ['all'] },
    admin: { level: 3, label: 'Admin', permissions: ['view', 'vm_actions', 'manage_vms', 'view_logs', 'view_users'] },
    operator: { level: 2, label: 'Operator', permissions: ['view', 'vm_actions'] },
    viewer: { level: 1, label: 'Viewer', permissions: ['view'] },
};

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// Check if user role is super_admin
function superAdminOnly(req, res, next) {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Super Admin access required.' });
    }
    next();
}

// Check if user role is admin or higher
function adminOnly(req, res, next) {
    const role = ROLES[req.user.role];
    if (!role || role.level < ROLES.admin.level) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
}

// Check if user role is operator or higher (can perform VM actions)
function operatorOnly(req, res, next) {
    const role = ROLES[req.user.role];
    if (!role || role.level < ROLES.operator.level) {
        return res.status(403).json({ error: 'Operator access required. Viewers cannot perform actions.' });
    }
    next();
}

// Generic permission check middleware
function requirePermission(permission) {
    return (req, res, next) => {
        const role = ROLES[req.user.role];
        if (!role) {
            return res.status(403).json({ error: 'Invalid role.' });
        }
        if (role.permissions.includes('all') || role.permissions.includes(permission)) {
            return next();
        }
        return res.status(403).json({ error: `Permission '${permission}' required.` });
    };
}

module.exports = { authMiddleware, superAdminOnly, adminOnly, operatorOnly, requirePermission, ROLES };
