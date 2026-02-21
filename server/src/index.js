require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { initDb } = require('./config/database');
const { initializeDatabase } = require('./utils/initDb');
const { setupWebSocket } = require('./services/wsHandler');
const { register, httpRequestDuration } = require('./config/prometheus');
const { encryptionMiddleware } = require('./middleware/encryption');
const { auditLogMiddleware } = require('./middleware/auditLog');

// Import routes
const authRoutes = require('./routes/auth');
const nodesRoutes = require('./routes/nodes');
const vmsRoutes = require('./routes/vms');
const storageRoutes = require('./routes/storage');
const networkRoutes = require('./routes/network');
const logsRoutes = require('./routes/logs');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(encryptionMiddleware);

// Prometheus request duration tracking
app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
    });
    next();
});

// Root welcome route
app.get('/', (req, res) => {
    res.json({
        name: 'Proxmox Infrastructure Dashboard API',
        version: '1.0.0',
        mode: process.env.MODE || 'demo',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            nodes: '/api/nodes',
            vms: '/api/vms',
            storage: '/api/storage',
            network: '/api/network',
            logs: '/api/logs',
            users: '/api/users',
            metrics: '/metrics',
        },
    });
});

// Health check (no auth needed)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: process.env.MODE || 'demo',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Audit log after auth-dependent routes are set
app.use(auditLogMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/vms', vmsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/users', usersRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

// Start server with async database init
async function start() {
    try {
        await initDb();
        console.log('');
        initializeDatabase();
        console.log('');

        const server = http.createServer(app);
        const wss = new WebSocketServer({ server });
        setupWebSocket(wss);

        server.listen(PORT, () => {
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║   Proxmox Infrastructure Dashboard - Backend    ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log(`║  🌐 API Server:  http://localhost:${PORT}          ║`);
            console.log(`║  📊 Metrics:     http://localhost:${PORT}/metrics   ║`);
            console.log(`║  🔌 WebSocket:   ws://localhost:${PORT}             ║`);
            console.log(`║  📂 Mode:        ${(process.env.MODE || 'demo').padEnd(31)}║`);
            console.log('╚══════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
