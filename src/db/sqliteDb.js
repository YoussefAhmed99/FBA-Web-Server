const sqlite3 = require('sqlite3').verbose();
const dbName = './fba_web_server.db';

let db = new sqlite3.Database(dbName, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Set the busy timeout using PRAGMA
        db.exec("PRAGMA busy_timeout = 10000;", (err) => {
            if (err) {
                console.error('Error setting busy timeout', err.message);
            } else {
                console.log('Busy timeout set to 10 seconds.');
            }
        });

        // Create the table
        db.run(`CREATE TABLE IF NOT EXISTS collectionsIndices (
            email TEXT PRIMARY KEY NOT NULL,
            collectionID TEXT,
            asins TEXT,
            resultSet TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                console.log('Table created or already exists.');
            }
        });
    }
});

module.exports = db;
