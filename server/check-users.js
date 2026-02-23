const { initDb, getDb } = require('./src/config/database');

async function checkUsers() {
    try {
        await initDb();
        const db = getDb();
        const result = db.exec('SELECT id, username, email, role FROM users');
        if (result.length > 0) {
            console.log('Users in database:');
            console.table(result[0].values.map(v => ({
                id: v[0],
                username: v[1],
                email: v[2],
                role: v[3]
            })));
        } else {
            console.log('No users found in database.');
        }
    } catch (err) {
        console.error('Error checking users:', err);
    }
}

checkUsers();
