const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/network - Get network info (demo data)
router.get('/', authMiddleware, async (req, res) => {
    const mode = process.env.MODE || 'demo';

    if (mode === 'demo') {
        res.json([
            { iface: 'vmbr0', type: 'bridge', address: '192.168.1.101/24', gateway: '192.168.1.1', node: 'Node-1', active: true, bridgePorts: 'eno1', mtu: 1500 },
            { iface: 'vmbr1', type: 'bridge', address: '10.0.0.1/24', node: 'Node-1', active: true, bridgePorts: 'eno2', mtu: 9000 },
            { iface: 'vmbr0', type: 'bridge', address: '192.168.1.102/24', gateway: '192.168.1.1', node: 'Node-2', active: true, bridgePorts: 'eno1', mtu: 1500 },
            { iface: 'vmbr1', type: 'bridge', address: '10.0.0.2/24', node: 'Node-2', active: true, bridgePorts: 'eno2', mtu: 9000 },
            { iface: 'vmbr0', type: 'bridge', address: '192.168.1.103/24', gateway: '192.168.1.1', node: 'Node-3', active: true, bridgePorts: 'eno1', mtu: 1500 },
            { iface: 'vmbr1', type: 'bridge', address: '10.0.0.3/24', node: 'Node-3', active: true, bridgePorts: 'eno2', mtu: 9000 },
            { iface: 'bond0', type: 'bond', address: '172.16.0.1/24', node: 'Node-1', active: true, bondMode: 'balance-rr', slaves: 'eno3 eno4', mtu: 1500 },
        ]);
    } else {
        // In live mode, this would fetch from Proxmox API
        res.json([]);
    }
});

module.exports = router;
