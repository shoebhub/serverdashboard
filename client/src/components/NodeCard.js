'use client';
import { formatBytes, formatUptime } from '../lib/constants';

function MetricRing({ value, type, label }) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="metric-item">
            <div className="metric-label">{label}</div>
            <div className="metric-ring">
                <svg viewBox="0 0 80 80">
                    <circle className="metric-ring-bg" cx="40" cy="40" r={radius} />
                    <circle
                        className={`metric-ring-fill ${type}`}
                        cx="40"
                        cy="40"
                        r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div className="metric-ring-text">{Math.round(value)}%</div>
            </div>
        </div>
    );
}

export default function NodeCard({ node }) {
    return (
        <div className="node-card fade-in-up">
            <div className="node-card-header">
                <div>
                    <div className="node-name">{node.nodeName}</div>
                    <div className="node-host">{node.host}</div>
                </div>
                <span className={`status-badge ${node.status}`}>
                    <span className={`status-dot ${node.status === 'online' ? '' : 'offline'}`} style={{ width: 6, height: 6 }}></span>
                    {node.status}
                </span>
            </div>

            <div className="node-metrics">
                <MetricRing value={node.cpu?.usage || 0} type="cpu" label="CPU" />
                <MetricRing value={node.memory?.usage || 0} type="mem" label="RAM" />
                <MetricRing value={node.storage?.usage || 0} type="storage" label="Storage" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>⏱ Uptime: {formatUptime(node.uptime)}</span>
                <span>{node.cpu?.cores || 0} Cores</span>
                <span>{formatBytes(node.memory?.total)}</span>
            </div>
        </div>
    );
}
