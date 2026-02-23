const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiRequest(endpoint, options = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

export function login(username, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function getMe() {
    return apiRequest('/auth/me');
}

export function getMyPermissions() {
    return apiRequest('/users/me/permissions');
}

export function getRoles() {
    return apiRequest('/users/roles');
}

export function getNodes() {
    return apiRequest('/nodes');
}

export function getVMs() {
    return apiRequest('/vms');
}

export function vmAction(vmid, action) {
    return apiRequest(`/vms/${vmid}/${action}`, { method: 'POST' });
}

export function deleteVM(vmid) {
    return apiRequest(`/vms/${vmid}`, { method: 'DELETE' });
}

export function getStorage() {
    return apiRequest('/storage');
}

export function getNetwork() {
    return apiRequest('/network');
}

export function getLogs(page = 1) {
    return apiRequest(`/logs?page=${page}`);
}

export function getUsers() {
    return apiRequest('/users');
}

export function createUser(userData) {
    return apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export function updateUser(id, userData) {
    return apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
}

export function deleteUser(id) {
    return apiRequest(`/users/${id}`, { method: 'DELETE' });
}

// --- Proxmox User Management ---

export function getProxmoxUsers() {
    return apiRequest('/proxmox-users');
}

export function getProxmoxUser(userid) {
    return apiRequest(`/proxmox-users/${encodeURIComponent(userid)}`);
}

export function createProxmoxUser(userData) {
    return apiRequest('/proxmox-users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export function updateProxmoxUser(userid, userData) {
    return apiRequest(`/proxmox-users/${encodeURIComponent(userid)}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
}

export function deleteProxmoxUser(userid) {
    return apiRequest(`/proxmox-users/${encodeURIComponent(userid)}`, { method: 'DELETE' });
}

export function getProxmoxGroups() {
    return apiRequest('/proxmox-users/groups');
}

export function getProxmoxRoles() {
    return apiRequest('/proxmox-users/roles');
}

export function getProxmoxACL() {
    return apiRequest('/proxmox-users/acl');
}

export function assignProxmoxRole(data) {
    // data: { path, users, roles, propagate }
    return apiRequest('/proxmox-users/acl', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function removeProxmoxACL(data) {
    // data: { path, users, roles }
    return apiRequest('/proxmox-users/acl', {
        method: 'DELETE',
        body: JSON.stringify(data),
    });
}
