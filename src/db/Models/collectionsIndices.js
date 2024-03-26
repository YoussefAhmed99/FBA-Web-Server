const db = require('../sqliteDb');

const collectionsIndicesModel = {
    init: function () {
        return new Promise((resolve, reject) => {
            const sql = `
        CREATE TABLE IF NOT EXISTS collectionsIndices (
          email TEXT PRIMARY KEY NOT NULL,
          collectionID TEXT,
          asins TEXT,
          resultSet TEXT
        )`;

            db.run(sql, (err) => {
                if (err) {
                    console.error('Error creating collectionsIndices table', err.message);
                    reject(err);
                } else {
                    console.log('collectionsIndices Table created or already exists.');
                    resolve();
                }
            });
        });
    },

    insertData: function (email, collectionID, asins) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO collectionsIndices (email, collectionID, asins) VALUES (?, ?, ?)`;
            db.run(sql, [email, collectionID, asins], function (err) {
                if (err) {
                    console.error('Error inserting data into collectionsIndices', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    },

    queryDataByEmail: function (email) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM collectionsIndices WHERE email = ?`;
            db.get(sql, [email], (err, row) => {
                if (err) {
                    console.error('Error querying data by email from collectionsIndices', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    updateCollectionsIndices: function (email, collectionID, asins) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE collectionsIndices SET collectionID = ?, asins = ? WHERE email = ?`;
            db.run(sql, [collectionID, JSON.stringify(asins), email], function (err) {
                if (err) {
                    console.error('Error updating collectionsIndices', err);
                    reject(err);
                } else {
                    console.log(`Rows updated: ${this.changes}`);
                    resolve(this.changes);
                }
            });
        });
    },

    updateCollectionsIndicesResult: function (email, resultSet) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE collectionsIndices SET resultSet = ? WHERE email = ?`;
            db.run(sql, [JSON.stringify(resultSet), email], function (err) {
                if (err) {
                    console.error('Error updating collectionsIndices result', err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
};

module.exports = collectionsIndicesModel;
