'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getLogs } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

export default function LogsPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [logsData, setLogsData] = useState({ logs: [], total: 0, page: 1, totalPages: 0 });
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getLogs(page).then(setLogsData).catch(console.error);
        }
    }, [user, page]);

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Security Logs" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up">
                        <h2 className="page-title">Security & Audit Logs</h2>
                        <p className="page-subtitle">Track all system activities and user actions</p>
                    </div>

                    <div className="table-container fade-in-up">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Resource</th>
                                    <th>IP Address</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsData.logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                            No audit logs recorded yet. Actions like login, VM operations, and user management will appear here.
                                        </td>
                                    </tr>
                                ) : (
                                    logsData.logs.map((log) => {
                                        let details = {};
                                        try { details = JSON.parse(log.details || '{}'); } catch { }
                                        return (
                                            <tr key={log.id}>
                                                <td style={{ fontSize: 12 }}>{new Date(log.timestamp.endsWith('Z') ? log.timestamp : log.timestamp + 'Z').toLocaleString()}</td>
                                                <td><span className="vm-name">{log.username || 'System'}</span></td>
                                                <td>{log.action}</td>
                                                <td style={{ fontSize: 12, fontFamily: "'Courier New', monospace" }}>{log.resource}</td>
                                                <td style={{ fontSize: 12, fontFamily: "'Courier New', monospace" }}>{log.ip_address || '-'}</td>
                                                <td>
                                                    {details.statusCode && (
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            background: details.statusCode < 400 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                            color: details.statusCode < 400 ? '#10b981' : '#ef4444',
                                                        }}>
                                                            {details.statusCode}
                                                        </span>
                                                    )}
                                                    {details.duration && (
                                                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                                            {details.duration}ms
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {logsData.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                            <button className="btn btn-sm btn-console" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                            <span style={{ padding: '5px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                Page {logsData.page} of {logsData.totalPages}
                            </span>
                            <button className="btn btn-sm btn-console" disabled={page >= logsData.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
