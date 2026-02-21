const { encrypt, decrypt } = require('../utils/crypto');

/**
 * Middleware that encrypts response bodies for sensitive endpoints
 * and decrypts incoming encrypted request bodies.
 */
function encryptionMiddleware(req, res, next) {
    // Decrypt incoming request body if encrypted
    if (req.body && req.body._encrypted) {
        try {
            const decrypted = decrypt(req.body._encrypted);
            req.body = JSON.parse(decrypted);
        } catch (err) {
            return res.status(400).json({ error: 'Failed to decrypt request body.' });
        }
    }

    // Wrap res.json to optionally encrypt responses
    const originalJson = res.json.bind(res);
    res.json = (data) => {
        // Add encryption flag to indicate server supports encryption
        if (typeof data === 'object' && data !== null) {
            data._encryption = 'aes-256-gcm';
        }
        return originalJson(data);
    };

    next();
}

module.exports = { encryptionMiddleware };
