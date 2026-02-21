const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, superAdminOnly, adminOnly, ROLES } = require('../middleware/auth');
const { getDb, saveDb } = require('../config/database');

const router = express.Router();

function queryOne(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
    stmt.free();
    return null;
}

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

// GET /api/users/roles - Get available roles (any authenticated user)
router.get('/roles', authMiddleware, (req, res) => {
    const roles = Object.entries(ROLES).map(([key, value]) => ({
        value: key,
        label: value.label,
        level: value.level,
        permissions: value.permissions,
    }));
    res.json(roles);
});

// GET /api/users/me/permissions - Get current user's permissions
router.get('/me/permissions', authMiddleware, (req, res) => {
    const role = ROLES[req.user.role] || ROLES.viewer;
    res.json({
        role: req.user.role,
        roleLabel: role.label,
        level: role.level,
        permissions: role.permissions,
        canManageUsers: role.permissions.includes('all'),
        canViewUsers: role.permissions.includes('all') || role.permissions.includes('view_users'),
        canPerformVmActions: role.permissions.includes('all') || role.permissions.includes('vm_actions'),
        canViewLogs: role.permissions.includes('all') || role.permissions.includes('view_logs'),
    });
});

// GET /api/users - List all users (super_admin and admin can view)
router.get('/', authMiddleware, adminOnly, (req, res) => {
    const db = getDb();
    const users = queryAll(db, 'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC');
    res.json(users);
});

// POST /api/users - Create user (super_admin only)
router.post('/', authMiddleware, superAdminOnly, (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const validRoles = Object.keys(ROLES);
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
    }

    const db = getDb();
    const existing = queryOne(db, 'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) return res.status(409).json({ error: 'Username or email already exists.' });

    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hash, role || 'viewer']);
    saveDb();

    const newUser = queryOne(db, 'SELECT id, username, email, role FROM users WHERE username = ?', [username]);
    res.status(201).json(newUser);
});

// PUT /api/users/:id - Update user (super_admin only)
router.put('/:id', authMiddleware, superAdminOnly, (req, res) => {
    const { username, email, role, password } = req.body;
    const db = getDb();

    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [parseInt(req.params.id)]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const validRoles = Object.keys(ROLES);
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
    }

    if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.run('UPDATE users SET username = ?, email = ?, role = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [username || user.username, email || user.email, role || user.role, hash, parseInt(req.params.id)]);
    } else {
        db.run('UPDATE users SET username = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [username || user.username, email || user.email, role || user.role, parseInt(req.params.id)]);
    }
    saveDb();
    res.json({ message: 'User updated successfully.' });
});

// DELETE /api/users/:id - Delete user (super_admin only)
router.delete('/:id', authMiddleware, superAdminOnly, (req, res) => {
    const db = getDb();
    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [parseInt(req.params.id)]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.username === 'admin') return res.status(403).json({ error: 'Cannot delete the default admin user.' });

    db.run('DELETE FROM users WHERE id = ?', [parseInt(req.params.id)]);
    saveDb();
    res.json({ message: 'User deleted successfully.' });
});

module.exports = router;
