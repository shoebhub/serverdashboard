'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useRef } from 'react';

const COLORS = {
    cpu: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)' },
    mem: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)' },
    storage: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)' },
};

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div style={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
        }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
            {payload.map((entry, i) => (
                <div key={i} style={{ color: entry.color, fontWeight: 600 }}>
                    {entry.name}: {entry.value.toFixed(1)}%
                </div>
            ))}
        </div>
    );
}

export default function MetricsChart({ title, telemetry, metricKey, nodeNames }) {
    const [history, setHistory] = useState([]);
    const historyRef = useRef([]);

    useEffect(() => {
        if (!telemetry) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const point = { time: timeStr };
        telemetry.forEach((node) => {
            let value = 0;
            if (metricKey === 'cpu') value = node.cpu?.usage || 0;
            else if (metricKey === 'mem') value = node.memory?.usage || 0;
            else if (metricKey === 'storage') value = node.storage?.usage || 0;
            point[node.nodeName] = value;
        });

        historyRef.current = [...historyRef.current.slice(-29), point];
        setHistory([...historyRef.current]);
    }, [telemetry, metricKey]);

    const color = COLORS[metricKey] || COLORS.cpu;
    const names = nodeNames || ['Node-1', 'Node-2', 'Node-3'];
    const nodeColors = ['#3b82f6', '#8b5cf6', '#06b6d4'];

    return (
        <div className="chart-card">
            <div className="chart-title">{title}</div>
            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={history}>
                    <defs>
                        {names.map((name, i) => (
                            <linearGradient key={name} id={`grad-${metricKey}-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={nodeColors[i]} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={nodeColors[i]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                    <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {names.map((name, i) => (
                        <Area
                            key={name}
                            type="monotone"
                            dataKey={name}
                            name={name}
                            stroke={nodeColors[i]}
                            fill={`url(#grad-${metricKey}-${i})`}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2 }}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
