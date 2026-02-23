'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getLogs } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

const ACTION_COLORS = {
    USER_LOGIN: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: '🔑' },
    USER_REGISTER: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', icon: '📝' },
    PROXMOX_USER_CREATE: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: '➕' },
    PROXMOX_USER_UPDATE: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: '✏️' },
    PROXMOX_USER_DELETE: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: '🗑️' },
    PROXMOX_ACL_ASSIGN: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', icon: '🔒' },
    PROXMOX_ACL_REMOVE: { bg: 'rgba(244,63,94,0.1)', color: '#f43f5e', icon: '🔓' },
    VM_ACTION: { bg: 'rgba(6,182,212,0.1)', color: '#06b6d4', icon: '🖥️' },
    DASHBOARD_USER_CREATE: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: '👤' },
    DASHBOARD_USER_UPDATE: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: '👤' },
    DASHBOARD_USER_DELETE: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: '👤' },
    DATA_ACCESS: { bg: 'rgba(107,114,128,0.08)', color: '#6b7280', icon: '👁️' },
};

const DEFAULT_ACTION_STYLE = { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: '📋' };

export default function LogsPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [logsData, setLogsData] = useState({ logs: [], total: 0, page: 1, totalPages: 0, actionTypes: [], stats: {} });
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    const fetchLogs = useCallback(() => {
        if (user) {
            getLogs(page, { action: actionFilter !== 'all' ? actionFilter : undefined, search: search || undefined })
                .then(setLogsData)
                .catch(console.error);
        }
    }, [user, page, actionFilter, search]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    const stats = logsData.stats || {};

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Security Logs" />
            <main className="main-content">
                <div className="page-content">
                    {/* Header */}
                    <div className="page-header fade-in-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h2 className="page-title">Security & Audit Logs</h2>
                                <p className="page-subtitle">Real-time tracking of all system activities and user actions</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                    onClick={fetchLogs}
                                    className="btn btn-sm btn-console"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    🔄 Refresh
                                </button>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoRefresh}
                                        onChange={(e) => setAutoRefresh(e.target.checked)}
                                        style={{ accentColor: '#10b981' }}
                                    />
                                    Auto-refresh
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }} className="fade-in-up">
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '3px solid #3b82f6' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Events</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{stats.total_logs || 0}</div>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Last Hour</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{stats.last_hour || 0}</div>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Last 24h</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{stats.last_24h || 0}</div>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '3px solid #8b5cf6' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Logins</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>{stats.total_logins || 0}</div>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Errors</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{stats.total_errors || 0}</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }} className="fade-in-up">
                        <div style={{ position: 'relative', flex: '1 1 250px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search logs by action, resource, IP, or user..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 8,
                                    color: 'var(--text-primary)',
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                            style={{
                                padding: '10px 14px',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8,
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                cursor: 'pointer',
                                minWidth: 160,
                            }}
                        >
                            <option value="all">All Actions</option>
                            {(logsData.actionTypes || []).map(a => (
                                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                            Showing {logsData.logs.length} of {logsData.total} events
                        </span>
                    </div>

                    {/* Logs Table */}
                    <div className="table-container fade-in-up">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>#</th>
                                    <th style={{ width: 170 }}>Timestamp</th>
                                    <th style={{ width: 100 }}>User</th>
                                    <th style={{ width: 200 }}>Action</th>
                                    <th>Resource</th>
                                    <th style={{ width: 140 }}>IP Address</th>
                                    <th style={{ width: 120 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsData.logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '60px 40px' }}>
                                            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                                No audit logs found
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                                                {search || actionFilter !== 'all'
                                                    ? 'No logs match your current filters. Try adjusting your search criteria.'
                                                    : 'Audit events will appear here as users interact with the system — login, manage VMs, create users, etc.'
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logsData.logs.map((log, idx) => {
                                        let details = {};
                                        try { details = JSON.parse(log.details || '{}'); } catch { }
                                        const actionStyle = ACTION_COLORS[log.action] || DEFAULT_ACTION_STYLE;
                                        const isExpanded = expandedLog === log.id;
                                        const isError = details.statusCode >= 400;

                                        return (
                                            <>
                                                <tr
                                                    key={log.id}
                                                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        borderLeft: isError ? '3px solid #ef4444' : '3px solid transparent',
                                                        background: isExpanded ? 'rgba(59,130,246,0.05)' : undefined,
                                                        transition: 'background 0.2s',
                                                    }}
                                                >
                                                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {(logsData.page - 1) * 50 + idx + 1}
                                                    </td>
                                                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                        {formatTimestamp(log.timestamp)}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            background: log.username ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)',
                                                            color: log.username ? '#3b82f6' : '#6b7280',
                                                        }}>
                                                            {log.username || 'Anonymous'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: 6,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: actionStyle.bg,
                                                            color: actionStyle.color,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}>
                                                            {actionStyle.icon} {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 12, fontFamily: "'Courier New', monospace", color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {log.resource}
                                                    </td>
                                                    <td style={{ fontSize: 12, fontFamily: "'Courier New', monospace", color: 'var(--text-muted)' }}>
                                                        {log.ip_address || '-'}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {details.statusCode && (
                                                                <span style={{
                                                                    padding: '3px 8px',
                                                                    borderRadius: 4,
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                    color: isError ? '#ef4444' : '#10b981',
                                                                }}>
                                                                    {details.statusCode}
                                                                </span>
                                                            )}
                                                            {details.duration && (
                                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                    {details.duration}ms
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${log.id}-details`}>
                                                        <td colSpan="7" style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.03)', borderTop: 'none' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                                                                <div>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Method: </span>
                                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{details.method || '-'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Status Code: </span>
                                                                    <span style={{ fontWeight: 600, color: isError ? '#ef4444' : '#10b981' }}>{details.statusCode || '-'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--text-muted)' }}>Duration: </span>
                                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{details.duration ? `${details.duration}ms` : '-'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--text-muted)' }}>User Agent: </span>
                                                                    <span style={{ color: 'var(--text-secondary)', fontSize: 11, wordBreak: 'break-all' }}>{details.userAgent || '-'}</span>
                                                                </div>
                                                                {details.body && (
                                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                                        <span style={{ color: 'var(--text-muted)' }}>Request Body: </span>
                                                                        <pre style={{ margin: '4px 0 0', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: 11, overflow: 'auto', color: 'var(--text-secondary)' }}>
                                                                            {JSON.stringify(details.body, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logsData.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                            <button className="btn btn-sm btn-console" disabled={page <= 1} onClick={() => setPage(1)}>
                                ⏮ First
                            </button>
                            <button className="btn btn-sm btn-console" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                ← Prev
                            </button>
                            <span style={{ padding: '5px 16px', fontSize: 13, color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                Page {logsData.page} of {logsData.totalPages}
                            </span>
                            <button className="btn btn-sm btn-console" disabled={page >= logsData.totalPages} onClick={() => setPage(p => p + 1)}>
                                Next →
                            </button>
                            <button className="btn btn-sm btn-console" disabled={page >= logsData.totalPages} onClick={() => setPage(logsData.totalPages)}>
                                Last ⏭
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function formatTimestamp(ts) {
    try {
        const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z');
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);

        let relative = '';
        if (diffMin < 1) relative = 'Just now';
        else if (diffMin < 60) relative = `${diffMin}m ago`;
        else if (diffHr < 24) relative = `${diffHr}h ago`;
        else relative = `${Math.floor(diffHr / 24)}d ago`;

        return (
            <div>
                <div style={{ fontWeight: 500 }}>{d.toLocaleTimeString()}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{relative} · {d.toLocaleDateString()}</div>
            </div>
        );
    } catch {
        return ts;
    }
}
