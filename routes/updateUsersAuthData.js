const express = require('express');
const router = express.Router();
const db = require('../src/db/sqliteDb.js'); // assuming this is the correct path to your db config

router.post('/', (req, res) => {
    const userData = req.body; // Assuming this is an array of objects
    const queries = userData.map(user => {
        const placeholders = Object.keys(user).map(() => '?').join(',');
        const values = Object.values(user);

        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO usersAuthData(registered_mail, gdrive, Sub_Status, Final_User_Message, Adtactix, KWD, SQC, Metrix_Logistix, Metrix, Boox, Flex, Rankx, Co_Pilot, PPC_Dominator, AdtactixStudent, Apex, KDpro) VALUES (${placeholders}) ON CONFLICT(registered_mail) DO UPDATE SET
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
                KDpro=excluded.KDpro`,
                values,
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
        });
    });

    Promise.all(queries)
        .then(() => {
            res.send('Update successful');
        })
        .catch(err => {
            console.error(err.message);
            res.status(500).send(err.message);
        });
});


module.exports = router;
