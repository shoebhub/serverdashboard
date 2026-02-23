const express = require('express');
const { authMiddleware, superAdminOnly, adminOnly } = require('../middleware/auth');
const ProxmoxApi = require('../services/proxmoxApi');
const { loadProxmoxNodes } = require('../config/proxmox');

const router = express.Router();

// Helper: get first node's API (Proxmox users are cluster-wide)
function getApi() {
    const nodes = loadProxmoxNodes();
    if (!nodes.length) throw new Error('No Proxmox nodes configured.');
    return new ProxmoxApi(nodes[0]);
}

// GET /api/proxmox-users - List all Proxmox users (admin or higher)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const api = getApi();
        const users = await api.getUsers();

        // Sort: enabled first, then alphabetically
        const sorted = (users || []).sort((a, b) => {
            if (a.enable !== b.enable) return (b.enable || 0) - (a.enable || 0);
            return (a.userid || '').localeCompare(b.userid || '');
        });

        res.json(sorted);
    } catch (err) {
        console.error('Error fetching Proxmox users:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
});

// GET /api/proxmox-users/groups - List all Proxmox groups
router.get('/groups', authMiddleware, adminOnly, async (req, res) => {
    try {
        const api = getApi();
        const groups = await api.getGroups();
        res.json(groups || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/proxmox-users/roles - List all Proxmox roles
router.get('/roles', authMiddleware, adminOnly, async (req, res) => {
    try {
        const api = getApi();
        const roles = await api.getRoles();
        res.json(roles || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/proxmox-users/acl - List ACL permissions
router.get('/acl', authMiddleware, adminOnly, async (req, res) => {
    try {
        const api = getApi();
        const acl = await api.getACL();
        res.json(acl || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/proxmox-users/acl - Assign role to user via ACL (super_admin only)
router.put('/acl', authMiddleware, superAdminOnly, async (req, res) => {
    const { path, users, roles, propagate } = req.body;

    if (!path || !users || !roles) {
        return res.status(400).json({ error: 'path, users, and roles are required.' });
    }

    try {
        const api = getApi();
        const result = await api.updateACL({
            path,
            users,
            roles,
            propagate: propagate ? 1 : 0,
        });

        console.log(`[${req.user.username}] ACL updated: ${users} -> ${roles} on ${path}`);
        res.json({ success: true, message: `Role ${roles} assigned to ${users} on path ${path}` });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
});

// DELETE /api/proxmox-users/acl - Remove ACL entry (super_admin only)
router.delete('/acl', authMiddleware, superAdminOnly, async (req, res) => {
    const { path, users, roles } = req.body;

    if (!path || !users || !roles) {
        return res.status(400).json({ error: 'path, users, and roles are required.' });
    }

    try {
        const api = getApi();
        const result = await api.deleteACL({ path, users, roles });

        console.log(`[${req.user.username}] ACL removed: ${users} -> ${roles} on ${path}`);
        res.json({ success: true, message: `Role ${roles} removed from ${users} on path ${path}` });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
});

// GET /api/proxmox-users/:userid - Get single Proxmox user details
router.get('/:userid', authMiddleware, adminOnly, async (req, res) => {
    try {
        const api = getApi();
        const user = await api.getUser(req.params.userid);
        if (!user) return res.status(404).json({ error: 'User not found in Proxmox.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/proxmox-users - Create a new Proxmox user (super_admin only)
router.post('/', authMiddleware, superAdminOnly, async (req, res) => {
    const { userid, password, email, firstname, lastname, groups, comment, enable } = req.body;

    if (!userid) {
        return res.status(400).json({ error: 'userid is required (format: username@realm, e.g. john@pve)' });
    }

    // Validate userid format
    if (!userid.includes('@')) {
        return res.status(400).json({ error: 'userid must be in format: username@realm (e.g. john@pve or john@pam)' });
    }

    try {
        const api = getApi();
        const userData = { userid };
        if (password) userData.password = password;
        if (email) userData.email = email;
        if (firstname) userData.firstname = firstname;
        if (lastname) userData.lastname = lastname;
        if (groups) userData.groups = groups;
        if (comment) userData.comment = comment;
        if (enable !== undefined) userData.enable = enable ? 1 : 0;

        const result = await api.createUser(userData);

        console.log(`[${req.user.username}] Created Proxmox user: ${userid}`);
        res.status(201).json({ success: true, message: `User ${userid} created successfully.`, userid });
    } catch (err) {
        console.error('Create Proxmox user error:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ error: `Failed to create user: ${err.message}` });
    }
});

// PUT /api/proxmox-users/:userid - Update a Proxmox user (super_admin only)
router.put('/:userid', authMiddleware, superAdminOnly, async (req, res) => {
    const { userid } = req.params;
    const { email, firstname, lastname, groups, comment, enable, password } = req.body;

    try {
        const api = getApi();
        const userData = {};
        if (email !== undefined) userData.email = email;
        if (firstname !== undefined) userData.firstname = firstname;
        if (lastname !== undefined) userData.lastname = lastname;
        if (groups !== undefined) userData.groups = groups;
        if (comment !== undefined) userData.comment = comment;
        if (enable !== undefined) userData.enable = enable ? 1 : 0;
        if (password) userData.password = password;

        const result = await api.updateUser(userid, userData);

        console.log(`[${req.user.username}] Updated Proxmox user: ${userid}`);
        res.json({ success: true, message: `User ${userid} updated.` });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: `Failed to update user: ${err.message}` });
    }
});

// DELETE /api/proxmox-users/:userid - Delete a Proxmox user (super_admin only)
router.delete('/:userid', authMiddleware, superAdminOnly, async (req, res) => {
    const { userid } = req.params;

    // Prevent deleting root@pam
    if (userid === 'root@pam') {
        return res.status(403).json({ error: 'Cannot delete root@pam user.' });
    }

    try {
        const api = getApi();
        const result = await api.deleteUser(userid);

        console.log(`[${req.user.username}] Deleted Proxmox user: ${userid}`);
        res.json({ success: true, message: `User ${userid} deleted from Proxmox.` });
    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: `Failed to delete user: ${err.message}` });
    }
});

module.exports = router;
