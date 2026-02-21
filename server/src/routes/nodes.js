const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { fetchTelemetry } = require('../services/telemetry');

const router = express.Router();

// GET /api/nodes - Get all node statuses
router.get('/', authMiddleware, async (req, res) => {
    try {
        const telemetry = await fetchTelemetry();
        res.json(telemetry);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch node data.' });
    }
});

// GET /api/nodes/:id/status - Get specific node status
router.get('/:id/status', authMiddleware, async (req, res) => {
    try {
        const telemetry = await fetchTelemetry();
        const node = telemetry.find((n) => n.nodeId === parseInt(req.params.id));
        if (!node) return res.status(404).json({ error: 'Node not found.' });
        res.json(node);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch node status.' });
    }
});

module.exports = router;
