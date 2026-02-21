'use client';
import { useState } from 'react';
import { vmAction } from '../lib/api';
import StatusBadge from './StatusBadge';
import { formatBytes } from '../lib/constants';

export default function VMTable({ vms, permissions }) {
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');

    const canPerformActions = permissions?.canPerformVmActions ?? true;

    async function handleAction(vmid, action) {
        if (!canPerformActions) {
            setMessage('Error: You do not have permission to perform VM actions.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setActionLoading(`${vmid}-${action}`);
        setMessage('');
        try {
            const result = await vmAction(vmid, action);
            setMessage(result.message || `${action} command sent to VM ${vmid}`);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    }

    if (!vms || vms.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🖥️</div>
                <div className="empty-state-text">No virtual machines found</div>
            </div>
        );
    }

    return (
        <div>
            {message && (
                <div style={{
                    background: message.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${message.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    borderRadius: 10,
                    padding: '10px 16px',
                    marginBottom: 16,
                    fontSize: 13,
                    color: message.startsWith('Error') ? '#ef4444' : '#10b981',
                }}>
                    {message}
                </div>
            )}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>VM Name</th>
                            <th>Status</th>
                            <th>Node</th>
                            <th>CPU</th>
                            <th>RAM</th>
                            <th>IP Address</th>
                            <th>OS</th>
                            {canPerformActions && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {vms.map((vm) => (
                            <tr key={vm.vmid}>
                                <td>
                                    <span className="vm-name">{vm.name}</span>
                                    <span className="vm-id">#{vm.vmid}</span>
                                </td>
                                <td><StatusBadge status={vm.status} /></td>
                                <td>{vm.node}</td>
                                <td>{vm.cpu?.toFixed(1) || 0}%</td>
                                <td>{formatBytes(vm.maxmem)}</td>
                                <td style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>{vm.ipAddress || '-'}</td>
                                <td>{vm.os || '-'}</td>
                                {canPerformActions && (
                                    <td>
                                        <div className="action-btns">
                                            <button
                                                className="btn btn-sm btn-start"
                                                onClick={() => handleAction(vm.vmid, 'start')}
                                                disabled={actionLoading === `${vm.vmid}-start`}
                                            >
                                                {actionLoading === `${vm.vmid}-start` ? '...' : '▶ Start'}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-stop"
                                                onClick={() => handleAction(vm.vmid, 'stop')}
                                                disabled={actionLoading === `${vm.vmid}-stop`}
                                            >
                                                {actionLoading === `${vm.vmid}-stop` ? '...' : '⏹ Stop'}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-restart"
                                                onClick={() => handleAction(vm.vmid, 'reset')}
                                                disabled={actionLoading === `${vm.vmid}-reset`}
                                            >
                                                {actionLoading === `${vm.vmid}-reset` ? '...' : '🔄 Restart'}
                                            </button>
                                            <button className="btn btn-sm btn-console">
                                                🖥 Console
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
