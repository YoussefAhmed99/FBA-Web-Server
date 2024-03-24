const express = require('express');
const db = require('../src/db/sqliteDb.js'); // assuming this is the correct path to your db config
async function authenticate(req, res, next) {
    const toolsMap = {
        adtactix: ["Adtactix"],
        kdboosted: ["KWD"],
        rankx: ["Rankx"]
    }
    const method = req.method;
    var [tool, caller, registeredMail, gmail, ssid, version] = req.url.split("/api/")[1].split("/");
    console.log({ tool, caller, registeredMail, gmail, ssid, version });

    const queryResult = await queryDatabase(registeredMail);

    if (queryResult.length == 0) {
        res.status(500).send({
            message: `
        The Google Drive account you have this tool saved in right now is not authorized to run it. Your current plan only allows the use of one Google Drive account. Please do one of the following to continue: \r\n \r\n 
        1) If you have not yet linked a Google Drive account to your members email go to step 2 on the settings tab to do so \r\n \r\n 
        2) Email us at support@fbaexcel.io if you still have issues.` });
        return;
    }

    if (queryResult[0].gdrive != gmail) {
        console.log(queryResult[0].gdrive, gmail)
        res.status(500).send({
            message: `
        Members Area Email: ${registeredMail} \r\n \r\n 
        When you completed step 2 of the authorization onboarding (linking a Google Drive account), you specified a different Google Drive email address than ${gmail} (which you are currently logged into). \r\n \r\n 
        Please make sure to save your tools in the Google Drive account you linked during the onboarding step and retry authorizing.\r\n \r\n 
        (Tip: Use an incognito browser window to login to desired Google Drive account to reduce authorization issues)` });
        return;
    }

    if (!queryResult[0].Sub_Status.match(/active|active \(canceled\)|succeeded|trialing|special access/i)) {
        res.status(500).send({ message: queryResult[0].Final_User_Message })
        return;
    }

    if (toolsMap[tool].every((tool) => { queryResult[0][tool] == "TRUE" })) {
        console.log({ route, tools: queryResult[0] })
        res.status(500).send({ message: queryResult[0].Final_User_Message })
        return;
    }
    req.SQC = queryResult[0]["SQC"];


    next();
}

module.exports = authenticate;

async function queryDatabase(email) {
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
