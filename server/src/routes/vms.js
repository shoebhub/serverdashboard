const express = require('express');
const { authMiddleware, operatorOnly } = require('../middleware/auth');
const { fetchAllVMs } = require('../services/telemetry');
const ProxmoxApi = require('../services/proxmoxApi');
const { loadProxmoxNodes } = require('../config/proxmox');

const router = express.Router();

// GET /api/vms - Get all VMs across all nodes (any authenticated user)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const vms = await fetchAllVMs();
        res.json(vms);
    } catch (err) {
        console.error('Error fetching VMs:', err.message);
        res.status(500).json({ error: 'Failed to fetch VMs.' });
    }
});

// POST /api/vms/:vmid/:action - Perform action on VM (operator or higher)
router.post('/:vmid/:action', authMiddleware, operatorOnly, async (req, res) => {
    const { vmid, action } = req.params;
    const validActions = ['start', 'stop', 'reset', 'shutdown'];

    if (!validActions.includes(action)) {
        return res.status(400).json({ error: `Invalid action. Valid: ${validActions.join(', ')}` });
    }

    try {
        const nodes = loadProxmoxNodes();

        for (const node of nodes) {
            const api = new ProxmoxApi(node);
            const vms = await api.getVMs();

            if (vms && vms.find((vm) => vm.vmid === parseInt(vmid))) {
                console.log(`[${req.user.username}] Sending ${action} to VM ${vmid} on ${node.name}...`);
                const result = await api.vmAction(vmid, action);

                if (result === null) {
                    return res.status(500).json({
                        error: `Failed to ${action} VM ${vmid} on ${node.name}. Check Proxmox permissions.`,
                    });
                }

                return res.json({
                    success: true,
                    message: `VM ${vmid} ${action} command sent on ${node.name}.`,
                    vmid: parseInt(vmid),
                    action,
                    node: node.name,
                    taskId: result,
                });
            }
        }

        res.status(404).json({ error: `VM ${vmid} not found on any node.` });
    } catch (err) {
        console.error(`VM action error:`, err.message);
        res.status(500).json({ error: `Failed to perform ${action} on VM ${vmid}.` });
    }
});

module.exports = router;
