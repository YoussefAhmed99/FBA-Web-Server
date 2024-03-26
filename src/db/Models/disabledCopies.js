const db = require('../sqliteDb'); // Adjust the path to your SQLite database connection module

const disabledCopiesModel = {
    init: async function () {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS disabledCopies (
                ssid TEXT PRIMARY KEY NOT NULL
            )`;

            db.run(sql, (err) => {
                if (err) {
                    console.error('Error creating disabledCopies table', err.message);
                    reject(err);
                } else {
                    console.log('disabledCopies table created or already exists.');
                    resolve();
                }
            });
        });
    },

    getRestrictedSSIDs: async function () {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM disabledCopies`, (err, rows) => {
                if (err) {
                    console.error('Error fetching data from disabledCopies', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};

module.exports = disabledCopiesModel;
