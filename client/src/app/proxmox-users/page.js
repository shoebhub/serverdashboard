'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
    getProxmoxUsers, createProxmoxUser, deleteProxmoxUser,
    updateProxmoxUser, getProxmoxGroups, getProxmoxRoles,
    getProxmoxACL, assignProxmoxRole, removeProxmoxACL,
    getProxmoxActiveUsers
} from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

const REALM_COLORS = {
    pam: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
    pve: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
};

export default function ProxmoxUsersPage() {
    const router = useRouter();
    const { user, permissions, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [pveUsers, setPveUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [formData, setFormData] = useState({
        userid: '', password: '', email: '', firstname: '', lastname: '',
        groups: '', comment: '', enable: true, realm: 'pve',
    });
    const [message, setMessage] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [acl, setAcl] = useState([]);
    const [showRoleForm, setShowRoleForm] = useState(null); // userid to assign role
    const [roleFormData, setRoleFormData] = useState({ role: '', path: '/', propagate: true });
    const [activeUsersData, setActiveUsersData] = useState(null);
    const [showActivePanel, setShowActivePanel] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    async function fetchData() {
        setLoadingData(true);
        try {
            const [usersData, groupsData, rolesData, aclData, activeData] = await Promise.all([
                getProxmoxUsers().catch(() => []),
                getProxmoxGroups().catch(() => []),
                getProxmoxRoles().catch(() => []),
                getProxmoxACL().catch(() => []),
                getProxmoxActiveUsers().catch(() => null),
            ]);
            setPveUsers(usersData || []);
            setGroups(groupsData || []);
            setRoles(rolesData || []);
            setAcl(aclData || []);
            setActiveUsersData(activeData);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setLoadingData(false);
        }
    }

    const canManage = permissions?.canManageUsers ?? false;

    async function handleCreate(e) {
        e.preventDefault();
        const userid = `${formData.userid}@${formData.realm}`;
        try {
            await createProxmoxUser({
                userid,
                password: formData.password,
                email: formData.email || undefined,
                firstname: formData.firstname || undefined,
                lastname: formData.lastname || undefined,
                groups: formData.groups || undefined,
                comment: formData.comment || undefined,
                enable: formData.enable,
            });
            setMessage(`User ${userid} created successfully!`);
            setShowForm(false);
            resetForm();
            await fetchData();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleUpdate(e) {
        e.preventDefault();
        try {
            const updateData = {};
            if (formData.email !== undefined) updateData.email = formData.email;
            if (formData.firstname !== undefined) updateData.firstname = formData.firstname;
            if (formData.lastname !== undefined) updateData.lastname = formData.lastname;
            if (formData.comment !== undefined) updateData.comment = formData.comment;
            if (formData.enable !== undefined) updateData.enable = formData.enable;
            if (formData.password) updateData.password = formData.password;

            await updateProxmoxUser(editUser, updateData);
            setMessage(`User ${editUser} updated!`);
            setEditUser(null);
            setShowForm(false);
            resetForm();
            await fetchData();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleDelete(userid) {
        if (userid === 'root@pam') {
            setMessage('Error: Cannot delete root@pam user.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        const confirmed = window.confirm(`⚠️ Are you sure you want to DELETE Proxmox user "${userid}"?\n\nThis will remove the user from the Proxmox cluster.`);
        if (!confirmed) return;

        try {
            await deleteProxmoxUser(userid);
            setMessage(`User ${userid} deleted.`);
            await fetchData();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleToggleEnable(userid, currentState) {
        try {
            await updateProxmoxUser(userid, { enable: !currentState });
            setMessage(`User ${userid} ${!currentState ? 'enabled' : 'disabled'}.`);
            await fetchData();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleAssignRole(e) {
        e.preventDefault();
        if (!roleFormData.role) {
            setMessage('Error: Please select a role.');
            return;
        }
        try {
            await assignProxmoxRole({
                path: roleFormData.path,
                users: showRoleForm,
                roles: roleFormData.role,
                propagate: roleFormData.propagate,
            });
            setMessage(`Role "${roleFormData.role}" assigned to ${showRoleForm} on path "${roleFormData.path}"`);
            setShowRoleForm(null);
            setRoleFormData({ role: '', path: '/', propagate: true });
            // Small delay to let Proxmox propagate ACL changes
            await new Promise(r => setTimeout(r, 500));
            await fetchData();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleRemoveACL(entry) {
        const confirmed = window.confirm(`Remove role "${entry.roleid}" from "${entry.ugid}" on path "${entry.path}"?`);
        if (!confirmed) return;
        try {
            await removeProxmoxACL({
                path: entry.path,
                users: entry.ugid,
                roles: entry.roleid,
            });
            setMessage(`Role "${entry.roleid}" removed from "${entry.ugid}".`);
            await new Promise(r => setTimeout(r, 500));
            await fetchData();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    function getUserACL(userid) {
        return acl.filter(a => a.ugid === userid && a.type === 'user');
    }

    function startEdit(u) {
        setEditUser(u.userid);
        setFormData({
            userid: u.userid.split('@')[0],
            realm: u.userid.split('@')[1] || 'pve',
            password: '',
            email: u.email || '',
            firstname: u.firstname || '',
            lastname: u.lastname || '',
            groups: '', // will be set from user's groups
            comment: u.comment || '',
            enable: u.enable !== 0,
        });
        setShowForm(true);
    }

    function resetForm() {
        setFormData({
            userid: '', password: '', email: '', firstname: '', lastname: '',
            groups: '', comment: '', enable: true, realm: 'pve',
        });
    }

    function formatExpiry(expire) {
        if (!expire || expire === 0) return 'Never';
        return new Date(expire * 1000).toLocaleDateString();
    }

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Proxmox Users" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="page-title">Proxmox User Management</h2>
                            <p className="page-subtitle">Manage users across the Proxmox cluster</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={fetchData} style={{ fontSize: 13 }}>
                                🔄 Refresh
                            </button>
                            {canManage && (
                                <button className="btn btn-primary" onClick={() => {
                                    if (showForm && !editUser) { setShowForm(false); }
                                    else { setEditUser(null); resetForm(); setShowForm(true); }
                                }}>
                                    {showForm && !editUser ? '✕ Cancel' : '+ Add Proxmox User'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }} className="fade-in-up">
                        <div style={{
                            padding: '12px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            borderRadius: 10, backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-cyan)' }}>{pveUsers.length}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Total Users</span>
                        </div>
                        <div style={{
                            padding: '12px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            borderRadius: 10, backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{pveUsers.filter(u => u.enable !== 0).length}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Enabled</span>
                        </div>
                        <div style={{
                            padding: '12px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 10, backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{pveUsers.filter(u => u.enable === 0).length}</span>
                            <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 8 }}>🔴 Disabled</span>
                        </div>
                        <div style={{
                            padding: '12px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            borderRadius: 10, backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{groups.length}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Groups</span>
                        </div>
                        <div style={{
                            padding: '12px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            borderRadius: 10, backdropFilter: 'blur(12px)',
                        }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{roles.length}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Roles</span>
                        </div>
                        {activeUsersData?.summary && (
                            <>
                                <div style={{
                                    padding: '12px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 10, backdropFilter: 'blur(12px)', cursor: 'pointer',
                                }} onClick={() => setShowActivePanel(!showActivePanel)}>
                                    <span style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>
                                        {activeUsersData.summary.currentlyActive}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#10b981', marginLeft: 8 }}>🟢 Online Now</span>
                                </div>
                                <div style={{
                                    padding: '12px 20px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                    borderRadius: 10, backdropFilter: 'blur(12px)', cursor: 'pointer',
                                }} onClick={() => setShowActivePanel(!showActivePanel)}>
                                    <span style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>
                                        {activeUsersData.summary.activeLastHour}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#3b82f6', marginLeft: 8 }}>Active (1h)</span>
                                </div>
                                <div style={{
                                    padding: '12px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                    borderRadius: 10, backdropFilter: 'blur(12px)', cursor: 'pointer',
                                }} onClick={() => setShowActivePanel(!showActivePanel)}>
                                    <span style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
                                        {activeUsersData.summary.activeLast24h}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#f59e0b', marginLeft: 8 }}>Active (24h)</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Active Users Panel */}
                    {showActivePanel && activeUsersData?.activeUsers && (
                        <div className="card fade-in-up" style={{ marginBottom: 24, border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 className="card-title" style={{ margin: 0 }}>
                                    🟢 Active Proxmox Users — Real-time Activity
                                </h3>
                                <button className="btn btn-sm btn-secondary" onClick={() => setShowActivePanel(false)} style={{ fontSize: 11 }}>
                                    ✕ Close
                                </button>
                            </div>
                            <div className="table-container" style={{ maxHeight: 400, overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>User ID</th>
                                            <th>Last Activity</th>
                                            <th>Source</th>
                                            <th>Last Node</th>
                                            <th>Last Task</th>
                                            <th>Tasks / Logins</th>
                                            <th>Recent Tasks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeUsersData.activeUsers.map((au) => {
                                            const statusColor = (au.isCurrentlyActive || au.isLoggedIn) ? '#10b981'
                                                : au.isRecentlyActive ? '#3b82f6'
                                                : au.isActiveToday ? '#f59e0b' : '#6b7280';
                                            const statusLabel = (au.isCurrentlyActive || au.isLoggedIn) ? '🟢 Online'
                                                : au.isRecentlyActive ? '🔵 Recent'
                                                : au.isActiveToday ? '🟡 Today' : '⚪ Inactive';
                                            
                                            function timeAgo(isoStr) {
                                                if (!isoStr) return '-';
                                                const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
                                                if (diff < 60) return `${diff}s ago`;
                                                if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                                if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                                return `${Math.floor(diff / 86400)}d ago`;
                                            }

                                            return (
                                                <tr key={au.userid}>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                            background: `${statusColor}15`, color: statusColor,
                                                            border: `1px solid ${statusColor}30`,
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                    <td><span className="vm-name">{au.userid}</span></td>
                                                    <td style={{ fontSize: 12 }}>
                                                        <span title={au.lastActivityFormatted}>
                                                            {timeAgo(au.lastActivityFormatted)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                            background: au.activitySource === 'login' || au.activitySource === 'syslog'
                                                                ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                            color: au.activitySource === 'login' || au.activitySource === 'syslog'
                                                                ? '#10b981' : '#f59e0b',
                                                            border: `1px solid ${au.activitySource === 'login' || au.activitySource === 'syslog'
                                                                ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                                        }}>
                                                            {au.activitySource === 'login' ? '🔑 Login' 
                                                                : au.activitySource === 'syslog' ? '🔑 Auth'
                                                                : au.activitySource === 'task' ? '⚙️ Task' : '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                            background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                                                            border: '1px solid rgba(139,92,246,0.2)',
                                                        }}>
                                                            {au.lastNode || '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{au.lastTaskType || '-'}</td>
                                                    <td style={{ fontSize: 12 }}>
                                                        <span style={{ fontWeight: 600 }}>{au.taskCount}</span>
                                                        <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                                                        <span style={{ fontWeight: 600, color: '#10b981' }}>{au.loginCount || 0}</span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                            {au.recentTasks.slice(0, 3).map((t, i) => (
                                                                <span key={i} style={{
                                                                    padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                                                                    background: t.status === 'OK' ? 'rgba(16,185,129,0.1)'
                                                                        : t.status === 'running' ? 'rgba(59,130,246,0.1)'
                                                                        : 'rgba(239,68,68,0.1)',
                                                                    color: t.status === 'OK' ? '#10b981'
                                                                        : t.status === 'running' ? '#3b82f6'
                                                                        : '#ef4444',
                                                                    border: `1px solid ${t.status === 'OK' ? 'rgba(16,185,129,0.2)'
                                                                        : t.status === 'running' ? 'rgba(59,130,246,0.2)'
                                                                        : 'rgba(239,68,68,0.2)'}`,
                                                                }}>
                                                                    {t.type} {t.status === 'running' ? '⏳' : t.status === 'OK' ? '✓' : '✕'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {activeUsersData.activeUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                                                    No recent user activity found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>
                                    🟢 Online = logged in / running tasks | 🔵 Recent = active within 1 hour | 🟡 Today = active within 24 hours
                                </span>
                                <span>Last updated: {new Date(activeUsersData.timestamp).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div style={{
                            background: message.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            border: `1px solid ${message.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13,
                            color: message.startsWith('Error') ? '#ef4444' : '#10b981',
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Create / Edit Form */}
                    {showForm && canManage && (
                        <div className="card fade-in-up" style={{ marginBottom: 24 }}>
                            <h3 className="card-title" style={{ marginBottom: 16 }}>
                                {editUser ? `Edit User: ${editUser}` : 'Create New Proxmox User'}
                            </h3>
                            <form onSubmit={editUser ? handleUpdate : handleCreate}
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                {!editUser && (
                                    <>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Username</label>
                                            <input className="form-input" type="text" placeholder="e.g. john"
                                                value={formData.userid}
                                                onChange={(e) => setFormData({ ...formData, userid: e.target.value })} required />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Realm</label>
                                            <select className="form-select" value={formData.realm}
                                                onChange={(e) => setFormData({ ...formData, realm: e.target.value })}>
                                                <option value="pve">PVE (Proxmox VE)</option>
                                                <option value="pam">PAM (Linux System)</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">{editUser ? 'New Password (optional)' : 'Password'}</label>
                                    <input className="form-input" type="password" placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editUser} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" placeholder="user@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">First Name</label>
                                    <input className="form-input" type="text" placeholder="John"
                                        value={formData.firstname}
                                        onChange={(e) => setFormData({ ...formData, firstname: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Last Name</label>
                                    <input className="form-input" type="text" placeholder="Doe"
                                        value={formData.lastname}
                                        onChange={(e) => setFormData({ ...formData, lastname: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Comment</label>
                                    <input className="form-input" type="text" placeholder="Optional note"
                                        value={formData.comment}
                                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" checked={formData.enable}
                                            onChange={(e) => setFormData({ ...formData, enable: e.target.checked })}
                                            style={{ width: 16, height: 16, accentColor: '#10b981' }} />
                                        Enable User
                                    </label>
                                </div>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editUser ? '💾 Save Changes' : '+ Create User'}
                                    </button>
                                    {editUser && (
                                        <button type="button" className="btn btn-secondary" onClick={() => {
                                            setEditUser(null); setShowForm(false); resetForm();
                                        }}>Cancel</button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Users Table */}
                    {loadingData ? (
                        <div className="loading-container"><div className="loading-spinner"></div></div>
                    ) : (
                        <div className="table-container fade-in-up">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Realm</th>
                                        <th>Last Active</th>
                                        <th>Roles / Permissions</th>
                                        <th>Status</th>
                                        <th>Expiry</th>
                                        {canManage && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pveUsers.map((u) => {
                                        const realm = u.userid?.split('@')[1] || 'pve';
                                        const rc = REALM_COLORS[realm] || REALM_COLORS.pve;
                                        const isEnabled = u.enable !== 0;
                                        const isRoot = u.userid === 'root@pam';
                                        const displayName = [u.firstname, u.lastname].filter(Boolean).join(' ') || '-';
                                        const userRoles = getUserACL(u.userid);

                                        // Get active status from activeUsersData
                                        const activeInfo = activeUsersData?.activeUsers?.find(a => a.userid === u.userid);
                                        const activityStatus = activeInfo
                                            ? (activeInfo.isCurrentlyActive || activeInfo.isLoggedIn) ? { label: '🟢 Online', color: '#10b981' }
                                                : activeInfo.isRecentlyActive ? { label: '🔵 Recent', color: '#3b82f6' }
                                                : activeInfo.isActiveToday ? { label: '🟡 Today', color: '#f59e0b' }
                                                : { label: '⚪ Inactive', color: '#6b7280' }
                                            : { label: '⚪ No Activity', color: '#6b7280' };

                                        function timeAgoShort(isoStr) {
                                            if (!isoStr) return '-';
                                            const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
                                            if (diff < 60) return `${diff}s ago`;
                                            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                            return `${Math.floor(diff / 86400)}d ago`;
                                        }

                                        return (
                                            <>
                                                <tr key={u.userid} style={{
                                                    background: isEnabled ? 'transparent' : 'rgba(239, 68, 68, 0.04)',
                                                    borderLeft: isEnabled ? 'none' : '3px solid rgba(239, 68, 68, 0.4)',
                                                }}>
                                                    <td>
                                                        <span className="vm-name" style={{
                                                            textDecoration: isEnabled ? 'none' : 'line-through',
                                                            opacity: isEnabled ? 1 : 0.6,
                                                            color: isEnabled ? undefined : '#9ca3af',
                                                        }}>{u.userid}</span>
                                                    </td>
                                                    <td style={{ color: isEnabled ? undefined : '#6b7280', opacity: isEnabled ? 1 : 0.7 }}>{displayName}</td>
                                                    <td style={{ fontSize: 12, color: isEnabled ? undefined : '#6b7280', opacity: isEnabled ? 1 : 0.7 }}>{u.email || '-'}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                            background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            {realm}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                                background: `${activityStatus.color}15`,
                                                                color: activityStatus.color,
                                                                border: `1px solid ${activityStatus.color}30`,
                                                                display: 'inline-block', width: 'fit-content',
                                                            }}>
                                                                {activityStatus.label}
                                                            </span>
                                                            {activeInfo?.lastActivityFormatted && (
                                                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}
                                                                    title={activeInfo.lastActivityFormatted}>
                                                                    {timeAgoShort(activeInfo.lastActivityFormatted)}
                                                                    {activeInfo.lastNode ? ` · ${activeInfo.lastNode}` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                            {userRoles.length > 0 ? userRoles.map((ar, i) => (
                                                                <span key={i} style={{
                                                                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                                    background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                                    border: '1px solid rgba(245,158,11,0.2)',
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                }}>
                                                                    {ar.roleid}
                                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({ar.path})</span>
                                                                    {canManage && (
                                                                        <span onClick={() => handleRemoveACL(ar)}
                                                                            style={{ cursor: 'pointer', color: '#ef4444', marginLeft: 2, fontSize: 11 }}
                                                                            title="Remove this role">✕</span>
                                                                    )}
                                                                </span>
                                                            )) : (
                                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No roles</span>
                                                            )}
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => {
                                                                        setShowRoleForm(showRoleForm === u.userid ? null : u.userid);
                                                                        setRoleFormData({ role: '', path: '/', propagate: true });
                                                                    }}
                                                                    style={{
                                                                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                                        border: '1px solid rgba(16,185,129,0.3)',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                    title="Assign role"
                                                                >
                                                                    + Role
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {isEnabled ? (
                                                            <span style={{
                                                                padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                                border: '1px solid rgba(16,185,129,0.2)',
                                                            }}>
                                                                ● Enabled
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171',
                                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                letterSpacing: '0.5px', textTransform: 'uppercase',
                                                            }}>
                                                                <span style={{
                                                                    width: 7, height: 7, borderRadius: '50%',
                                                                    background: '#ef4444', display: 'inline-block',
                                                                    boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                                                                }}></span>
                                                                Disabled
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{formatExpiry(u.expire)}</td>
                                                    {canManage && (
                                                        <td>
                                                            <div className="action-btns">
                                                                <button className="btn btn-sm btn-restart"
                                                                    onClick={() => startEdit(u)} title="Edit user">
                                                                    ✏️ Edit
                                                                </button>
                                                                {!isRoot && (
                                                                    <>
                                                                        <button
                                                                            className={`btn btn-sm ${isEnabled ? 'btn-suspend' : 'btn-start'}`}
                                                                            onClick={() => handleToggleEnable(u.userid, isEnabled)}
                                                                            title={isEnabled ? 'Disable user' : 'Enable user'}
                                                                        >
                                                                            {isEnabled ? '⏸ Disable' : '▶ Enable'}
                                                                        </button>
                                                                        <button className="btn btn-sm btn-delete"
                                                                            onClick={() => handleDelete(u.userid)} title="Delete user">
                                                                            🗑 Delete
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                                {/* Inline Role Assignment Form */}
                                                {showRoleForm === u.userid && canManage && (
                                                    <tr key={`${u.userid}-role`}>
                                                        <td colSpan={canManage ? 9 : 8} style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.03)' }}>
                                                            <form onSubmit={handleAssignRole} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                                    🛡️ Assign role to <strong style={{ color: 'var(--accent-cyan)' }}>{u.userid}</strong>:
                                                                </span>
                                                                <select className="form-select" value={roleFormData.role}
                                                                    onChange={(e) => setRoleFormData({ ...roleFormData, role: e.target.value })}
                                                                    style={{ width: 180, padding: '6px 10px', fontSize: 12 }} required>
                                                                    <option value="">Select Role...</option>
                                                                    {roles.map(r => (
                                                                        <option key={r.roleid} value={r.roleid}>{r.roleid}</option>
                                                                    ))}
                                                                </select>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Path:</label>
                                                                    <select className="form-select" value={roleFormData.path}
                                                                        onChange={(e) => setRoleFormData({ ...roleFormData, path: e.target.value })}
                                                                        style={{ width: 160, padding: '6px 10px', fontSize: 12 }}>
                                                                        <option value="/">/ (Full Access)</option>
                                                                        <option value="/vms">/vms (All VMs)</option>
                                                                        <option value="/storage">/storage (All Storage)</option>
                                                                        <option value="/nodes">/nodes (All Nodes)</option>
                                                                        <option value="/access">/access (User Management)</option>
                                                                        <option value="/pool">/pool (Resource Pools)</option>
                                                                    </select>
                                                                </div>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                                    <input type="checkbox" checked={roleFormData.propagate}
                                                                        onChange={(e) => setRoleFormData({ ...roleFormData, propagate: e.target.checked })}
                                                                        style={{ accentColor: '#10b981' }} />
                                                                    Propagate
                                                                </label>
                                                                <button type="submit" className="btn btn-sm btn-start" style={{ fontSize: 11 }}>
                                                                    ✓ Assign
                                                                </button>
                                                                <button type="button" className="btn btn-sm btn-stop" style={{ fontSize: 11 }}
                                                                    onClick={() => setShowRoleForm(null)}>
                                                                    ✕ Cancel
                                                                </button>
                                                            </form>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                    {pveUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={canManage ? 9 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                                No Proxmox users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ACL Permissions Table */}
                    {acl.length > 0 && (
                        <div className="card fade-in-up" style={{ marginTop: 24 }}>
                            <h3 className="card-title" style={{ marginBottom: 12 }}>🔐 ACL Permissions ({acl.length})</h3>
                            <div className="table-container" style={{ maxHeight: 300, overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>User / Group</th>
                                            <th>Type</th>
                                            <th>Role</th>
                                            <th>Path</th>
                                            <th>Propagate</th>
                                            {canManage && <th>Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {acl.map((a, i) => (
                                            <tr key={i}>
                                                <td><span className="vm-name">{a.ugid}</span></td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                        background: a.type === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                                                        color: a.type === 'user' ? '#3b82f6' : '#8b5cf6',
                                                        border: `1px solid ${a.type === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)'}`,
                                                    }}>{a.type}</span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                        border: '1px solid rgba(245,158,11,0.2)',
                                                    }}>{a.roleid}</span>
                                                </td>
                                                <td style={{ fontSize: 12, fontFamily: "'Courier New', monospace" }}>{a.path}</td>
                                                <td style={{ fontSize: 12 }}>{a.propagate ? 'Yes' : 'No'}</td>
                                                {canManage && (
                                                    <td>
                                                        <button className="btn btn-sm btn-delete" style={{ fontSize: 10 }}
                                                            onClick={() => handleRemoveACL(a)}>
                                                            ✕ Remove
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Groups & Roles Info */}
                    {(groups.length > 0 || roles.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }} className="fade-in-up">
                            {groups.length > 0 && (
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: 12 }}>📁 Groups ({groups.length})</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {groups.map(g => (
                                            <span key={g.groupid} style={{
                                                padding: '4px 12px', borderRadius: 6, fontSize: 12,
                                                background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                                                border: '1px solid rgba(139,92,246,0.2)',
                                            }}>
                                                {g.groupid}
                                                {g.comment && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— {g.comment}</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {roles.length > 0 && (
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: 12 }}>🛡️ Roles ({roles.length})</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {roles.map(r => (
                                            <span key={r.roleid} style={{
                                                padding: '4px 12px', borderRadius: 6, fontSize: 12,
                                                background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                                border: '1px solid rgba(245,158,11,0.2)',
                                            }}>
                                                {r.roleid}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
