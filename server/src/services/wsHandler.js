const { fetchTelemetry } = require('./telemetry');
const { activeWebsockets } = require('../config/prometheus');

const TELEMETRY_INTERVAL = 5000; // 5 seconds

function setupWebSocket(wss) {
    let telemetryInterval = null;

    wss.on('connection', (ws) => {
        console.log('✓ WebSocket client connected');
        activeWebsockets.inc();

        // Send initial telemetry data immediately
        sendTelemetry(ws);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
            } catch (err) {
                console.error('WebSocket message error:', err.message);
            }
        });

        ws.on('close', () => {
            console.log('WebSocket client disconnected');
            activeWebsockets.dec();
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err.message);
        });
    });

    // Broadcast telemetry to all connected clients at regular intervals
    telemetryInterval = setInterval(async () => {
        if (wss.clients.size === 0) return;

        try {
            const telemetry = await fetchTelemetry();
            const message = JSON.stringify({
                type: 'telemetry',
                data: telemetry,
                timestamp: Date.now(),
            });

            wss.clients.forEach((client) => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    client.send(message);
                }
            });
        } catch (err) {
            console.error('Telemetry broadcast error:', err.message);
        }
    }, TELEMETRY_INTERVAL);

    // Cleanup on server shutdown
    process.on('SIGTERM', () => {
        clearInterval(telemetryInterval);
        wss.close();
    });
}

async function sendTelemetry(ws) {
    try {
        const telemetry = await fetchTelemetry();
        ws.send(JSON.stringify({
            type: 'telemetry',
            data: telemetry,
            timestamp: Date.now(),
        }));
    } catch (err) {
        console.error('Error sending initial telemetry:', err.message);
    }
}

module.exports = { setupWebSocket };
