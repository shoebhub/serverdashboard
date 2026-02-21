const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const activeWebsockets = new client.Gauge({
    name: 'active_websocket_connections',
    help: 'Number of active WebSocket connections',
});
register.registerMetric(activeWebsockets);

const proxmoxNodeStatus = new client.Gauge({
    name: 'proxmox_node_status',
    help: 'Proxmox node online status (1=online, 0=offline)',
    labelNames: ['node_name'],
});
register.registerMetric(proxmoxNodeStatus);

const proxmoxCpuUsage = new client.Gauge({
    name: 'proxmox_cpu_usage_percent',
    help: 'Proxmox node CPU usage percentage',
    labelNames: ['node_name'],
});
register.registerMetric(proxmoxCpuUsage);

const proxmoxMemUsage = new client.Gauge({
    name: 'proxmox_memory_usage_percent',
    help: 'Proxmox node memory usage percentage',
    labelNames: ['node_name'],
});
register.registerMetric(proxmoxMemUsage);

module.exports = {
    register,
    httpRequestDuration,
    activeWebsockets,
    proxmoxNodeStatus,
    proxmoxCpuUsage,
    proxmoxMemUsage,
};
