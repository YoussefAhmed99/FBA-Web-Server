const sqlite3 = require('sqlite3').verbose();
const dbName = './fba_web_server.db';

let db = new sqlite3.Database(dbName, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Set the busy timeout using PRAGMA
        db.exec("PRAGMA busy_timeout = 60000;", (err) => {
            if (err) {
                console.error('Error setting busy timeout', err.message);
            } else {
                //console.log('Busy timeout set to 60 seconds.');
            }
        });
    }
});

module.exports = db;
