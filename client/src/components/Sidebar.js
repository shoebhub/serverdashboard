'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, APP_NAME } from '../lib/constants';

export default function Sidebar({ connected }) {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">A</div>
                <div>
                    <div className="sidebar-brand-text">{APP_NAME}</div>
                    <div className="sidebar-brand-sub">Infrastructure Control</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-status">
                    <div className={`status-dot ${connected ? '' : 'offline'}`}></div>
                    <span>{connected ? 'Live Telemetry Active' : 'Connecting...'}</span>
                </div>
            </div>
        </aside>
    );
}
