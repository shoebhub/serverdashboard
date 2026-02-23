const fetch = require('node-fetch');
const https = require('https');

// Accept self-signed certificates (common in Proxmox)
const agent = new https.Agent({ rejectUnauthorized: false });

class ProxmoxApi {
    constructor(node) {
        this.host = node.host;
        this.tokenId = node.tokenId;
        this.tokenSecret = node.tokenSecret;
        this.nodeName = node.name;
    }

    get authHeader() {
        return `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`;
    }

    async request(path, method = 'GET', body = null) {
        const url = `${this.host}/api2/json${path}`;
        const options = {
            method,
            agent,
            headers: {
                Authorization: this.authHeader,
            },
        };

        // For POST/PUT requests with body, use form-urlencoded (Proxmox preference)
        if (body && (method === 'POST' || method === 'PUT')) {
            const params = new URLSearchParams(body).toString();
            options.body = params;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (method !== 'GET') {
            // For POST/PUT/DELETE without body
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        try {
            const response = await fetch(url, options);
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                console.error(`Proxmox API non-JSON response [${this.nodeName}]:`, text.substring(0, 200));
                const err = new Error(`Proxmox returned non-JSON response (${response.status})`);
                err.statusCode = response.status;
                throw err;
            }

            if (!response.ok) {
                const errMsg = data.errors
                    ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : (data.message || data.data || `HTTP ${response.status}`);
                console.error(`Proxmox API error [${this.nodeName}] ${response.status}:`, data);
                const err = new Error(errMsg);
                err.statusCode = response.status;
                err.proxmoxData = data;
                throw err;
            }

            // Proxmox void operations (PUT/POST/DELETE) return {"data": null} on success
            // Return true for these so callers can distinguish success-null from error-null
            if (data.data !== undefined) {
                return data.data === null ? true : data.data;
            }
            return data;
        } catch (err) {
            // Re-throw Proxmox API errors (already formatted)
            if (err.statusCode) throw err;
            console.error(`Proxmox API connection error [${this.nodeName}]:`, err.message);
            throw new Error(`Connection error to ${this.nodeName}: ${err.message}`);
        }
    }

    async getNodeStatus() {
        return this.request(`/nodes/${this.nodeName}/status`);
    }

    async getVMs() {
        return this.request(`/nodes/${this.nodeName}/qemu`);
    }

    async getContainers() {
        return this.request(`/nodes/${this.nodeName}/lxc`);
    }

    async getStorage() {
        return this.request(`/nodes/${this.nodeName}/storage`);
    }

    async getNetwork() {
        return this.request(`/nodes/${this.nodeName}/network`);
    }

    async vmAction(vmid, action) {
        // action: start, stop, reset, shutdown, suspend
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}/status/${action}`, 'POST');
    }

    async deleteVM(vmid) {
        // Permanently delete a VM - requires VM to be stopped first
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}`, 'DELETE');
    }

    async getVMConfig(vmid) {
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}/config`);
    }

    async getVMAgentNetwork(vmid) {
        // Requires QEMU guest agent running inside the VM
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}/agent/network-get-interfaces`);
    }

    async getVMAgentOSInfo(vmid) {
        // Requires QEMU guest agent running inside the VM
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}/agent/get-osinfo`);
    }

    async getClusterStatus() {
        return this.request('/cluster/status');
    }

    async getClusterResources() {
        return this.request('/cluster/resources');
    }

    // --- Proxmox Access/User Management ---

    async getUsers() {
        return this.request('/access/users');
    }

    async getUser(userid) {
        return this.request(`/access/users/${encodeURIComponent(userid)}`);
    }

    async createUser(userData) {
        // userData: { userid, password, email, firstname, lastname, groups, enable, expire, comment }
        return this.request('/access/users', 'POST', userData);
    }

    async updateUser(userid, userData) {
        return this.request(`/access/users/${encodeURIComponent(userid)}`, 'PUT', userData);
    }

    async deleteUser(userid) {
        return this.request(`/access/users/${encodeURIComponent(userid)}`, 'DELETE');
    }

    async getGroups() {
        return this.request('/access/groups');
    }

    async getRoles() {
        return this.request('/access/roles');
    }

    async getACL() {
        return this.request('/access/acl');
    }

    async getNodeTasks(limit = 200) {
        // Fetch recent tasks from this node - shows user activity
        return this.request(`/nodes/${this.nodeName}/tasks?limit=${limit}`);
    }

    async updateACL(aclData) {
        // aclData: { path, users, roles, propagate }
        // path: e.g. "/" (full access), "/vms/100" (specific VM)
        // users: comma-separated userids
        // roles: comma-separated role names
        // propagate: 1 or 0
        return this.request('/access/acl', 'PUT', aclData);
    }

    async deleteACL(aclData) {
        // To remove ACL, send delete=1 with the ACL data
        return this.request('/access/acl', 'PUT', { ...aclData, delete: 1 });
    }
}

module.exports = ProxmoxApi;
