const db = require('../sqliteDb'); // Adjust the path to your SQLite database connection module

const registeredCopiesModel = {
    init: async function () {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS registeredCopies (
                registered_mail TEXT NOT NULL,
                tool TEXT NOT NULL,
                ssid TEXT NOT NULL,
                version TEXT NOT NULL,
                PRIMARY KEY (registered_mail, tool, ssid, version)
            )`;

            db.run(sql, (err) => {
                if (err) {
                    console.error('Error creating registeredCopies table', err.message);
                    reject(err);
                } else {
                    console.log('registeredCopies table created or already exists.');
                    resolve();
                }
            });
        });
    },

    getUserCopies: async function (email, tool, ssid, version) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT ssid FROM registeredCopies WHERE registered_mail = ? AND tool = ? AND ssid = ? AND version = ?`;
            db.all(sql, [email, tool, ssid, version], (err, rows) => {
                if (err) {
                    console.error('Error fetching user copies from registeredCopies', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Additional methods for interacting with registeredCopies can be added here...
};

module.exports = registeredCopiesModel;
