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

// Helper: get all node APIs
function getAllApis() {
    const nodes = loadProxmoxNodes();
    if (!nodes.length) throw new Error('No Proxmox nodes configured.');
    return nodes.map(n => new ProxmoxApi(n));
}

// GET /api/proxmox-users/active - Get active user sessions from tasks + login events
router.get('/active', authMiddleware, adminOnly, async (req, res) => {
    try {
        const apis = getAllApis();
        
        // Fetch tasks + cluster log + syslog from all nodes in parallel
        const [allTaskArrays, clusterLog, ...syslogArrays] = await Promise.all([
            Promise.all(apis.map(api => api.getNodeTasks(500).catch(() => []))),
            apis[0].getClusterLog(500).catch(() => []),
            ...apis.map(api => api.getNodeSyslog(500).catch(() => [])),
        ]);
        
        // Flatten all tasks
        const allTasks = allTaskArrays.flat().filter(Boolean);
        
        // Build user activity map
        const userActivity = {};
        const now = Math.floor(Date.now() / 1000);
        
        // --- 1. Process Tasks ---
        for (const task of allTasks) {
            const userId = task.user;
            if (!userId) continue;
            
            const startTime = task.starttime || 0;
            const endTime = task.endtime || 0;
            const isRunning = !task.endtime && task.status === undefined;
            
            if (!userActivity[userId]) {
                userActivity[userId] = {
                    userid: userId,
                    lastActivity: 0,
                    lastLogin: 0,
                    taskCount: 0,
                    loginCount: 0,
                    recentTasks: [],
                    isCurrentlyActive: false,
                    isLoggedIn: false,
                    lastNode: '',
                    lastTaskType: '',
                    activitySource: '',
                };
            }
            
            const entry = userActivity[userId];
            entry.taskCount++;
            
            if (startTime > entry.lastActivity) {
                entry.lastActivity = startTime;
                entry.lastNode = task.node || '';
                entry.lastTaskType = task.type || '';
                entry.activitySource = 'task';
            }
            
            if (isRunning || (startTime && !endTime)) {
                entry.isCurrentlyActive = true;
            }
            
            if (entry.recentTasks.length < 5) {
                entry.recentTasks.push({
                    type: task.type || '',
                    status: task.status || 'running',
                    starttime: startTime,
                    endtime: endTime,
                    node: task.node || '',
                    id: task.id || '',
                    upid: task.upid || '',
                });
            }
        }
        
        // --- 2. Process Cluster Log for auth events ---
        const clusterLogEntries = Array.isArray(clusterLog) ? clusterLog : [];
        for (const logEntry of clusterLogEntries) {
            const msg = logEntry.msg || '';
            const logTime = logEntry.time || 0;
            const node = logEntry.node || '';
            
            // Match auth success messages like: "user 'murad@pve' successfully authenticated"
            // or: "successful auth for user 'murad@pve'"
            const authMatch = msg.match(/(?:user\s+)?'?([^'@\s]+@[^'@\s]+)'?\s+(?:successfully\s+authenticated|logged\s+in)|(?:successful\s+auth\s+for\s+user\s+)'?([^'@\s]+@[^'@\s]+)'?/i);
            
            if (authMatch) {
                const userId = authMatch[1] || authMatch[2];
                if (!userId) continue;
                
                if (!userActivity[userId]) {
                    userActivity[userId] = {
                        userid: userId,
                        lastActivity: 0,
                        lastLogin: 0,
                        taskCount: 0,
                        loginCount: 0,
                        recentTasks: [],
                        isCurrentlyActive: false,
                        isLoggedIn: false,
                        lastNode: '',
                        lastTaskType: '',
                        activitySource: '',
                    };
                }
                
                const entry = userActivity[userId];
                entry.loginCount++;
                
                if (logTime > entry.lastLogin) {
                    entry.lastLogin = logTime;
                }
                
                if (logTime > entry.lastActivity) {
                    entry.lastActivity = logTime;
                    entry.lastNode = node;
                    entry.lastTaskType = 'login';
                    entry.activitySource = 'login';
                }
                
                // If login was within last 2 hours, consider them logged in / active
                if (logTime > (now - 7200)) {
                    entry.isLoggedIn = true;
                    entry.isCurrentlyActive = true;
                }
            }
        }
        
        // --- 3. Process Syslog for auth events (pvedaemon / pveproxy) ---
        const allSyslogs = syslogArrays.flat().filter(Boolean);
        for (const logEntry of allSyslogs) {
            const msg = logEntry.t || logEntry.msg || '';
            const logNode = logEntry.n || '';
            
            // pvedaemon/pveproxy auth messages
            const authMatch = msg.match(/(?:successful\s+auth\s+for\s+user\s+)'?([^'@\s]+@[^'@\s]+)'?/i)
                || msg.match(/(?:user\s+)'?([^'@\s]+@[^'@\s]+)'?\s+(?:successfully\s+authenticated)/i)
                || msg.match(/pvedaemon\[.*\]:\s+successful\s+auth(?:entication)?\s+for\s+'?([^'@\s]+@[^'@\s]+)'?/i)
                || msg.match(/pveproxy\[.*\]:\s+successful\s+auth(?:entication)?\s+for\s+'?([^'@\s]+@[^'@\s]+)'?/i);
            
            if (authMatch) {
                const userId = authMatch[1];
                if (!userId) continue;
                
                // Try to extract timestamp from syslog line  
                let logTime = 0;
                const timeMatch = msg.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
                if (timeMatch) {
                    const parsed = new Date(`${timeMatch[1]} ${new Date().getFullYear()}`);
                    if (!isNaN(parsed.getTime())) {
                        logTime = Math.floor(parsed.getTime() / 1000);
                    }
                }
                // Use current time if we can't parse (syslog entries are recent anyway)
                if (!logTime) logTime = now - 60;
                
                if (!userActivity[userId]) {
                    userActivity[userId] = {
                        userid: userId,
                        lastActivity: 0,
                        lastLogin: 0,
                        taskCount: 0,
                        loginCount: 0,
                        recentTasks: [],
                        isCurrentlyActive: false,
                        isLoggedIn: false,
                        lastNode: '',
                        lastTaskType: '',
                        activitySource: '',
                    };
                }
                
                const entry = userActivity[userId];
                entry.loginCount++;
                
                if (logTime > entry.lastLogin) {
                    entry.lastLogin = logTime;
                }
                
                if (logTime > entry.lastActivity) {
                    entry.lastActivity = logTime;
                    entry.lastNode = logNode || '';
                    entry.lastTaskType = 'login';
                    entry.activitySource = 'syslog';
                }
                
                if (logTime > (now - 7200)) {
                    entry.isLoggedIn = true;
                    entry.isCurrentlyActive = true;
                }
            }
        }
        
        // --- Build final result ---
        const twentyFourHoursAgo = now - (24 * 60 * 60);
        const oneHourAgo = now - (60 * 60);
        
        const activeUsers = Object.values(userActivity)
            .map(u => ({
                ...u,
                isRecentlyActive: u.lastActivity > oneHourAgo,
                isActiveToday: u.lastActivity > twentyFourHoursAgo,
                lastActivityFormatted: u.lastActivity ? new Date(u.lastActivity * 1000).toISOString() : null,
                lastLoginFormatted: u.lastLogin ? new Date(u.lastLogin * 1000).toISOString() : null,
                recentTasks: u.recentTasks.sort((a, b) => (b.starttime || 0) - (a.starttime || 0)),
            }))
            .sort((a, b) => b.lastActivity - a.lastActivity);
        
        res.json({
            activeUsers,
            summary: {
                totalActiveUsers: activeUsers.length,
                currentlyActive: activeUsers.filter(u => u.isCurrentlyActive || u.isLoggedIn).length,
                activeLastHour: activeUsers.filter(u => u.isRecentlyActive).length,
                activeLast24h: activeUsers.filter(u => u.isActiveToday).length,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Error fetching active users:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
});

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
