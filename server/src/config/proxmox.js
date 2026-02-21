/**
 * Proxmox Node Configuration Loader
 * Reads node configs from environment variables
 */
function loadProxmoxNodes() {
    const nodes = [];
    for (let i = 1; i <= 3; i++) {
        const host = process.env[`PROXMOX_NODE${i}_HOST`];
        const tokenId = process.env[`PROXMOX_NODE${i}_TOKEN_ID`];
        const tokenSecret = process.env[`PROXMOX_NODE${i}_TOKEN_SECRET`];
        const name = process.env[`PROXMOX_NODE${i}_NAME`] || `Node-${i}`;

        if (host) {
            nodes.push({
                id: i,
                name,
                host,
                tokenId,
                tokenSecret,
                isActive: true,
            });
        }
    }
    return nodes;
}

module.exports = { loadProxmoxNodes };
