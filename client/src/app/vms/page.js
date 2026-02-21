'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getVMs } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import VMTable from '../../components/VMTable';

export default function VMsPage() {
    const router = useRouter();
    const { user, permissions, loading, logout } = useAuth();
    const { connected } = useWebSocket();
    const [vms, setVms] = useState([]);
    const [vmLoading, setVmLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getVMs().then(data => { setVms(data); setVmLoading(false); }).catch(console.error);
            // Refresh every 10 seconds
            const interval = setInterval(() => {
                getVMs().then(setVms).catch(console.error);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    if (loading || !user) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Virtual Machines" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up">
                        <h2 className="page-title">Virtual Machines</h2>
                        <p className="page-subtitle">Manage VMs across all cluster nodes</p>
                    </div>
                    {vmLoading ? (
                        <div className="loading-container"><div className="loading-spinner"></div><div className="loading-text">Loading VMs...</div></div>
                    ) : (
                        <VMTable vms={vms} permissions={permissions} />
                    )}
                </div>
            </main>
        </div>
    );
}
