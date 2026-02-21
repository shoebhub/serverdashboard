'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { getVMs } from '../lib/api';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatsCard from '../components/StatsCard';
import NodeCard from '../components/NodeCard';
import MetricsChart from '../components/MetricsChart';
import VMTable from '../components/VMTable';

export default function DashboardPage() {
    const router = useRouter();
    const { user, permissions, loading, logout } = useAuth();
    const { telemetry, connected } = useWebSocket();
    const [vms, setVms] = useState([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getVMs().then(setVms).catch(console.error);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Initializing Dashboard...</div>
            </div>
        );
    }

    if (!user) return null;

    const totalVMs = vms.length;
    const runningVMs = vms.filter(v => v.status === 'running').length;
    const nodesOnline = telemetry ? telemetry.filter(n => n.status === 'online').length : 0;
    const avgCpu = telemetry ? (telemetry.reduce((acc, n) => acc + (n.cpu?.usage || 0), 0) / (telemetry.length || 1)).toFixed(1) : '0';

    return (
        <div className="app-layout">
            <Sidebar connected={connected} />
            <TopBar user={user} onLogout={logout} pageTitle="Cluster Overview" />
            <main className="main-content">
                <div className="page-content">
                    <div className="page-header fade-in-up">
                        <h2 className="page-title">Proxmox Cluster Overview</h2>
                        <p className="page-subtitle">Real-time monitoring of your 3-node infrastructure cluster</p>
                    </div>

                    {/* Summary Stats */}
                    <div className="stats-grid">
                        <StatsCard label="Nodes Online" value={`${nodesOnline}/3`} color="green" />
                        <StatsCard label="Avg CPU Usage" value={`${avgCpu}%`} color="blue" />
                        <StatsCard label="Active VMs" value={`${runningVMs}`} color="purple" />
                        <StatsCard label="Total VMs" value={`${totalVMs}`} color="orange" />
                    </div>

                    {/* Node Cards */}
                    <div className="section-title">Node Status</div>
                    <div className="nodes-grid">
                        {telemetry && telemetry.map((node) => (
                            <NodeCard key={node.nodeId} node={node} />
                        ))}
                        {!telemetry && (
                            <div className="empty-state">
                                <div className="loading-spinner"></div>
                                <div className="loading-text">Connecting to nodes...</div>
                            </div>
                        )}
                    </div>

                    {/* Real-time Charts */}
                    <div className="section-title">Real-Time Performance</div>
                    <div className="charts-grid">
                        <MetricsChart
                            title="CPU Usage Over Time"
                            telemetry={telemetry}
                            metricKey="cpu"
                            nodeNames={telemetry?.map(n => n.nodeName)}
                        />
                        <MetricsChart
                            title="Memory Usage Over Time"
                            telemetry={telemetry}
                            metricKey="mem"
                            nodeNames={telemetry?.map(n => n.nodeName)}
                        />
                        <MetricsChart
                            title="Storage Usage Over Time"
                            telemetry={telemetry}
                            metricKey="storage"
                            nodeNames={telemetry?.map(n => n.nodeName)}
                        />
                    </div>

                    {/* VM Table */}
                    <div className="section-title">Virtual Machines</div>
                    <VMTable vms={vms} permissions={permissions} />
                </div>
            </main>
        </div>
    );
}
