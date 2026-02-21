'use client';

export default function StatusBadge({ status }) {
    const isOnline = status === 'online' || status === 'running';
    return (
        <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className={`status-dot ${isOnline ? '' : 'offline'}`} style={{ width: 6, height: 6 }}></span>
            {status}
        </span>
    );
}
