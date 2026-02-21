const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../config/database');

const router = express.Router();

// Helpers for sql.js
function queryOne(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = getDb();
    const user = queryOne(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
    );

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password required.' });
    }

    const db = getDb();
    const existing = queryOne(db, 'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
        return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hash, role || 'viewer']);
    saveDb();

    const newUser = queryOne(db, 'SELECT id, username, email, role FROM users WHERE username = ?', [username]);
    res.status(201).json(newUser);
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token.' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        const db = getDb();
        const user = queryOne(db, 'SELECT id, username, email, role, created_at FROM users WHERE id = ?', [decoded.id]);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token.' });
    }
});

module.exports = router;
