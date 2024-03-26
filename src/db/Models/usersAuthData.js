const db = require('../sqliteDb');

const usersAuthDataModel = {
    init: async function () {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS usersAuthData (
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
                KDpro BOOLEAN
            )`;

            db.run(sql, (err) => {
                if (err) {
                    console.error('Error creating usersAuthData table', err.message);
                    reject(err);
                } else {
                    console.log('usersAuthData table created or already exists.');
                    resolve();
                }
            });
        });
    },

    insertOrUpdateUsers: async function (usersData) {
        const queries = usersData.map(user => {
            const placeholders = Object.keys(user).map(() => '?').join(',');
            const values = Object.values(user);

            return new Promise((resolve, reject) => {
                const sql = `INSERT INTO usersAuthData(registered_mail, gdrive, Sub_Status, Final_User_Message, Adtactix, KWD, SQC, Metrix_Logistix, Metrix, Boox, Flex, Rankx, Co_Pilot, PPC_Dominator, AdtactixStudent, Apex, KDpro) VALUES (${placeholders}) 
                ON CONFLICT(registered_mail) DO UPDATE SET
                    gdrive=excluded.gdrive,
                    Sub_Status=excluded.Sub_Status,
                    Final_User_Message=excluded.Final_User_Message,
                    Adtactix=excluded.Adtactix,
                    KWD=excluded.KWD,
                    SQC=excluded.SQC,
                    Metrix_Logistix=excluded.Metrix_Logistix,
                    Metrix=excluded.Metrix,
                    Boox=excluded.Boox,
                    Flex=excluded.Flex,
                    Rankx=excluded.Rankx,
                    Co_Pilot=excluded.Co_Pilot,
                    PPC_Dominator=excluded.PPC_Dominator,
                    AdtactixStudent=excluded.AdtactixStudent,
                    Apex=excluded.Apex,
                    KDpro=excluded.KDpro`;
                db.run(sql, values, function (err) {
                    if (err) {
                        console.error('Error on inserting/updating usersAuthData', err);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            });
        });
        return Promise.all(queries);
    },

    getUserAuthData: async function (email) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM usersAuthData WHERE registered_mail = ?`, [email], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};

module.exports = usersAuthDataModel;
