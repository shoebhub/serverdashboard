'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getStorage } from '../../lib/api';
import { formatBytes } from '../../lib/constants';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

export default function StoragePage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [storage, setStorage] = useState([]);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getStorage().then(setStorage).catch(console.error);
        }
    }, [user]);

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Storage" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up">
                        <h2 className="page-title">Storage Management</h2>
                        <p className="page-subtitle">Cluster storage pools and volumes</p>
                    </div>

                    <div className="table-container fade-in-up">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Storage</th>
                                    <th>Type</th>
                                    <th>Node</th>
                                    <th>Content</th>
                                    <th>Total</th>
                                    <th>Used</th>
                                    <th>Available</th>
                                    <th>Usage</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {storage.map((s, i) => {
                                    const usagePercent = s.total > 0 ? ((s.used / s.total) * 100).toFixed(1) : 0;
                                    const barColor = usagePercent > 85 ? 'danger' : usagePercent > 65 ? 'warning' : 'blue';
                                    return (
                                        <tr key={i}>
                                            <td><span className="vm-name">{s.storage}</span></td>
                                            <td>{s.type}</td>
                                            <td>{s.node}</td>
                                            <td style={{ fontSize: 12 }}>{s.content}</td>
                                            <td>{formatBytes(s.total)}</td>
                                            <td>{formatBytes(s.used)}</td>
                                            <td>{formatBytes(s.avail)}</td>
                                            <td style={{ minWidth: 120 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="usage-bar" style={{ flex: 1 }}>
                                                        <div className={`usage-bar-fill ${barColor}`} style={{ width: `${usagePercent}%` }}></div>
                                                    </div>
                                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 40 }}>{usagePercent}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${s.active ? 'online' : 'offline'}`} style={{ fontSize: 11 }}>
                                                    {s.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
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
