const db = require('../src/db/sqliteDb.js'); // assuming this is the correct path to your db config
const { getUserAuthData } = require('../src/db/Models/usersAuthData.js');
const { getRestrictedSSIDs } = require('../src/db/Models/disabledCopies.js');
const { getUserCopies } = require('../src/db/Models/registeredCopiesModel.js');

async function authenticate(req, res, next) {
    const toolsMap = {
        adtactix: { db_name: ["Adtactix"], allowedCopies: 1 },
        kdboosted: { db_name: ["KWD", "KDpro"], allowedCopies: 3 },
        rankx: { db_name: ["Rankx"], allowedCopies: 1 }
    }
    const method = req.method;
    var [tool, caller, registeredMail, gmail, ssid, version] = req.url.split("/api/")[1].split("/");
    console.log({ tool, caller, registeredMail, gmail, ssid, version });

    const restrictedSSIds = await getRestrictedSSIDs();
    if (restrictedSSIds.any((e) => { e == ssid })) {
        res.status(500).send({
            message: `This Spreadsheet have been disabled before, kindly use one of your copies or make a new copy to use this tool.`
        });
        return;
    }

    const userAuthData = await getUserAuthData(registeredMail);
    if (userAuthData.length == 0) {
        res.status(500).send({
            message: `
        The Google Drive account you have this tool saved in right now is not authorized to run it. Your current plan only allows the use of one Google Drive account. Please do one of the following to continue: \r\n \r\n 
        1) If you have not yet linked a Google Drive account to your members email go to step 2 on the settings tab to do so \r\n \r\n 
        2) Email us at support@fbaexcel.io if you still have issues.` });
        return;
    }

    if (userAuthData[0].gdrive != gmail) {
        console.log(userAuthData[0].gdrive, gmail)
        res.status(500).send({
            message: `
        Members Area Email: ${registeredMail} \r\n \r\n 
        When you completed step 2 of the authorization onboarding (linking a Google Drive account), you specified a different Google Drive email address than ${gmail} (which you are currently logged into). \r\n \r\n 
        Please make sure to save your tools in the Google Drive account you linked during the onboarding step and retry authorizing.\r\n \r\n 
        (Tip: Use an incognito browser window to login to desired Google Drive account to reduce authorization issues)` });
        return;
    }

    if (!userAuthData[0].Sub_Status.match(/active|active \(canceled\)|succeeded|trialing|special access/i)) {
        res.status(500).send({ message: userAuthData[0].Final_User_Message })
        return;
    }

    if (toolsMap[tool]["db_name"].any((tool) => { userAuthData[0][tool] == "TRUE" })) {
        console.log({ route, tools: userAuthData[0] })
        res.status(500).send({ message: userAuthData[0].Final_User_Message })
        return;
    }
    if (tool == "kdboosted") req.SQC = userAuthData[0]["SQC"];

    const userCopies = await getUserCopies(registeredMail, tool, ssid, version);
    if (!userCopies.any((copy) => { copy == ssid })) {
        if (userCopies >= allowedCopies) {
            res.status(500).send({
                message: `
        You already have the maximum allowed number of copies for this tool per your payment plan. \r\n
        please check these urls and use a copy of them or deactivate a copy of them to be able to authorize this copy. \r\n
        ${userCopies.map((copy) => "https://docs.google.com/spreadsheets/d/" + copy).join("\r\n")}\r\n
        Kindly note that deactivating a copy is irrevirsible and you will never be able to use the deactivated copy again.
        `})
        }
        return;
    }


    next();
}

module.exports = authenticate;