'use client';

export default function StatsCard({ label, value, icon, color = 'blue', change }) {
    return (
        <div className={`stat-card ${color} fade-in-up`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {change && (
                <div className={`stat-change ${change > 0 ? 'up' : 'down'}`}>
                    {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
                </div>
            )}
        </div>
    );
}
