export const APP_NAME = 'Barabd Server Dashboard';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export const NAV_ITEMS = [
    { name: 'Cluster Overview', path: '/', icon: '📊' },
    { name: 'Virtual Machines', path: '/vms', icon: '🖥️' },
    { name: 'Storage', path: '/storage', icon: '💾' },
    { name: 'Network', path: '/network', icon: '🌐' },
    { name: 'Security Logs', path: '/logs', icon: '🔒' },
    { name: 'User Management', path: '/users', icon: '👥' },
    { name: 'Proxmox Users', path: '/proxmox-users', icon: '🛡️' },
];

export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatUptime(seconds) {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}
