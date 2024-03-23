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
                console.log('collectionsIndices Table created or already exists.');
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS usersAuthData (
            registered_mail TEXT PRIMARY KEY NOT NULL,
            gdrive TEXT,
            Sub_Status TEXT,
            Final_User_Message TEXT,
            Adtactix BOOLEAN,
            KWD BOOLEAN,
            SQC BOOLEAN,
            Metrix_Logistix BOOLEAN,
            Metrix BOOLEAN,
            Boox BOOLEAN,
            Flex BOOLEAN,
            Rankx BOOLEAN,
            Co_Pilot BOOLEAN,
            PPC_Dominator BOOLEAN,
            AdtactixStudent BOOLEAN,
            Apex BOOLEAN,
            KDpro BOOLEAN,
            Synced_user_Message TEXT,
            Sync_to_server BOOLEAN
        )`, (err) => {
            if (err) {
                console.error('Error creating usersAuthData table', err.message);
            } else {
                console.log('usersAuthData table created or already exists.');
            }
        });

    }
});

module.exports = db;
