const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { fetchAllStorage } = require('../services/telemetry');

const router = express.Router();

// GET /api/storage - Get storage from all nodes
router.get('/', authMiddleware, async (req, res) => {
    try {
        const storage = await fetchAllStorage();
        res.json(storage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch storage data.' });
    }
});

module.exports = router;
