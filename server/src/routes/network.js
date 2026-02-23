const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ProxmoxApi = require('../services/proxmoxApi');
const { loadProxmoxNodes } = require('../config/proxmox');

const router = express.Router();

// GET /api/network - Get network info from all nodes
router.get('/', authMiddleware, async (req, res) => {
    const mode = process.env.MODE || 'demo';

    if (mode === 'demo') {
        res.json([
            { iface: 'vmbr0', type: 'bridge', address: '192.168.1.101/24', gateway: '192.168.1.1', node: 'Node-1', active: true, bridgePorts: 'eno1', mtu: 1500 },
            { iface: 'vmbr1', type: 'bridge', address: '10.0.0.1/24', node: 'Node-1', active: true, bridgePorts: 'eno2', mtu: 9000 },
            { iface: 'vmbr0', type: 'bridge', address: '192.168.1.102/24', gateway: '192.168.1.1', node: 'Node-2', active: true, bridgePorts: 'eno1', mtu: 1500 },
        ]);
        return;
    }

    try {
        const nodes = loadProxmoxNodes();
        const allInterfaces = [];

        for (const node of nodes) {
            const api = new ProxmoxApi(node);
            const network = await api.getNetwork();

            if (network && Array.isArray(network)) {
                network.forEach(iface => {
                    allInterfaces.push({
                        iface: iface.iface || iface.name || '-',
                        type: iface.type || 'unknown',
                        address: iface.address ? `${iface.address}/${iface.netmask || iface.cidr || ''}`.replace(/\/$/, '') : iface.cidr || '-',
                        gateway: iface.gateway || '-',
                        node: node.name,
                        active: iface.active === 1 || iface.active === true,
                        bridgePorts: iface.bridge_ports || iface['bridge-ports'] || '-',
                        mtu: iface.mtu || 1500,
                        families: iface.families || [],
                        method: iface.method || '-',
                        autostart: iface.autostart === 1,
                        comments: iface.comments || '',
                    });
                });
            }
        }

        // Sort: bridges first, then bonds, then others
        allInterfaces.sort((a, b) => {
            const order = { bridge: 0, bond: 1, eth: 2, OVSBridge: 0 };
            return (order[a.type] ?? 3) - (order[b.type] ?? 3);
        });

        res.json(allInterfaces);
    } catch (err) {
        console.error('Error fetching network:', err.message);
        res.status(500).json({ error: 'Failed to fetch network configuration.' });
    }
});

module.exports = router;
