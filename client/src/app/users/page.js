'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getUsers, createUser, deleteUser, getRoles } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

const ROLE_COLORS = {
    super_admin: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
    admin: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
    operator: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
    viewer: { bg: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.2)' },
};

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    operator: 'Operator',
    viewer: 'Viewer',
};

export default function UsersPage() {
    const router = useRouter();
    const { user, permissions, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'viewer' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getUsers().then(setUsers).catch(err => {
                if (err.message?.includes('Admin access') || err.message?.includes('403')) {
                    setMessage('Error: You do not have permission to view users.');
                }
            });
            getRoles().then(setRoles).catch(() => { });
        }
    }, [user]);

    const canManageUsers = permissions?.canManageUsers ?? false;

    async function handleCreate(e) {
        e.preventDefault();
        try {
            await createUser(formData);
            setMessage('User created successfully!');
            setShowForm(false);
            setFormData({ username: '', email: '', password: '', role: 'viewer' });
            getUsers().then(setUsers);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await deleteUser(id);
            setMessage('User deleted.');
            getUsers().then(setUsers);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    }

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="User Management" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="page-title">User Management</h2>
                            <p className="page-subtitle">Manage dashboard users and roles</p>
                        </div>
                        {canManageUsers && (
                            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                                {showForm ? '✕ Cancel' : '+ Add User'}
                            </button>
                        )}
                    </div>

                    {/* Role Legend */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }} className="fade-in-up">
                        {Object.entries(ROLE_LABELS).map(([key, label]) => {
                            const c = ROLE_COLORS[key];
                            const roleInfo = roles.find(r => r.value === key);
                            return (
                                <div key={key} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 16px',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 10,
                                    backdropFilter: 'blur(12px)',
                                }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                                    }}>
                                        {label}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {key === 'super_admin' && '— Full access, manage users & settings'}
                                        {key === 'admin' && '— Manage VMs, view users & logs'}
                                        {key === 'operator' && '— Start/stop/restart VMs'}
                                        {key === 'viewer' && '— View only, no actions'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

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

                    {showForm && canManageUsers && (
                        <div className="card fade-in-up" style={{ marginBottom: 24 }}>
                            <h3 className="card-title" style={{ marginBottom: 16 }}>Create New User</h3>
                            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Username</label>
                                    <input className="form-input" type="text" value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Password</label>
                                    <input className="form-input" type="password" value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Role</label>
                                    <select className="form-select" value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="viewer">Viewer — View only</option>
                                        <option value="operator">Operator — VM actions</option>
                                        <option value="admin">Admin — Manage VMs & view users</option>
                                        <option value="super_admin">Super Admin — Full access</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <button type="submit" className="btn btn-primary">Create User</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="table-container fade-in-up">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    {canManageUsers && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const rc = ROLE_COLORS[u.role] || ROLE_COLORS.viewer;
                                    return (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td><span className="vm-name">{u.username}</span></td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                    background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                                                }}>
                                                    {ROLE_LABELS[u.role] || u.role}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                                            {canManageUsers && (
                                                <td>
                                                    {u.username !== 'admin' && (
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
