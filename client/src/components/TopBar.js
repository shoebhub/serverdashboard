'use client';
import { useState, useEffect } from 'react';

export default function TopBar({ user, onLogout, pageTitle }) {
    const initials = user?.username?.slice(0, 2).toUpperCase() || 'AD';
    const [mode, setMode] = useState('...');

    useEffect(() => {
        fetch('http://localhost:4000/api/health')
            .then(r => r.json())
            .then(d => setMode(d.mode || 'unknown'))
            .catch(() => setMode('offline'));
    }, []);

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1 className="topbar-title">{pageTitle || 'Dashboard'}</h1>
            </div>

            <div className="topbar-right">
                <div className="topbar-badge" style={mode === 'live' ? {
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                } : {
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                }}>
                    <div className="status-dot" style={{
                        width: 6, height: 6,
                        background: mode === 'live' ? '#10b981' : '#f59e0b',
                        boxShadow: `0 0 8px ${mode === 'live' ? '#10b981' : '#f59e0b'}`,
                    }}></div>
                    {mode === 'live' ? 'Live Mode' : mode === 'demo' ? 'Demo Mode' : mode}
                </div>

                <div className="topbar-user">
                    <div className="topbar-avatar">{initials}</div>
                    <div>
                        <div className="topbar-username">{user?.username || 'Admin'}</div>
                        <div className="topbar-role">{user?.role || 'admin'}</div>
                    </div>
                </div>

                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    );
}
