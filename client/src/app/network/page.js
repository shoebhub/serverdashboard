'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getNetwork } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';

export default function NetworkPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [interfaces, setInterfaces] = useState([]);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getNetwork().then(setInterfaces).catch(console.error);
        }
    }, [user]);

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Network" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up">
                        <h2 className="page-title">Network Configuration</h2>
                        <p className="page-subtitle">Bridges, bonds, and network interfaces across the cluster</p>
                    </div>

                    <div className="table-container fade-in-up">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Interface</th>
                                    <th>Type</th>
                                    <th>Node</th>
                                    <th>Address</th>
                                    <th>Gateway</th>
                                    <th>Bridge Ports</th>
                                    <th>MTU</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interfaces.map((iface, i) => (
                                    <tr key={i}>
                                        <td><span className="vm-name">{iface.iface}</span></td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                background: iface.type === 'bridge' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                                                color: iface.type === 'bridge' ? '#3b82f6' : '#8b5cf6',
                                                border: `1px solid ${iface.type === 'bridge' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)'}`,
                                            }}>
                                                {iface.type}
                                            </span>
                                        </td>
                                        <td>{iface.node}</td>
                                        <td style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>{iface.address}</td>
                                        <td style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>{iface.gateway || '-'}</td>
                                        <td>{iface.bridgePorts || iface.slaves || '-'}</td>
                                        <td>{iface.mtu || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${iface.active ? 'online' : 'offline'}`} style={{ fontSize: 11 }}>
                                                {iface.active ? 'Up' : 'Down'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
