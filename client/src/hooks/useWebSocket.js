'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../lib/constants';

export function useWebSocket() {
    const [telemetry, setTelemetry] = useState(null);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'telemetry') {
                        setTelemetry(message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse WS message:', e);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                // Reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error');
                ws.close();
            };
        } catch (err) {
            console.error('WebSocket connection failed:', err);
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    return { telemetry, connected };
}
