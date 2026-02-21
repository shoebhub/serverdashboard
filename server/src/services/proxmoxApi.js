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

        // For POST requests with body, use form-urlencoded (Proxmox preference)
        if (body && method === 'POST') {
            const params = new URLSearchParams(body).toString();
            options.body = params;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (method !== 'GET') {
            // For POST without body (like VM actions), don't set content-type
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
                return null;
            }

            if (!response.ok) {
                console.error(`Proxmox API error [${this.nodeName}] ${response.status}:`, data);
                return null;
            }

            return data.data !== undefined ? data.data : data;
        } catch (err) {
            console.error(`Proxmox API connection error [${this.nodeName}]:`, err.message);
            return null;
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
        // action: start, stop, reset, shutdown
        return this.request(`/nodes/${this.nodeName}/qemu/${vmid}/status/${action}`, 'POST');
    }

    async getClusterStatus() {
        return this.request('/cluster/status');
    }

    async getClusterResources() {
        return this.request('/cluster/resources');
    }
}

module.exports = ProxmoxApi;
