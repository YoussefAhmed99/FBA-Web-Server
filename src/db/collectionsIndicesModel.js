async function insertData(email, collectionID, asins) {
    return new Promise((resolve, reject) => {
        // Correctly use placeholders for all variables
        const sql = `INSERT INTO collectionsIndices (email, collectionID, asins) VALUES (?, ?, ?)`;
        db.run(sql, [email, collectionID, asins], function (err) {
            if (err) {
                console.error(err); // It's good practice to log the error for debugging.
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

async function queryDataByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM collectionsIndices WHERE email = '${email}'`, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function updateCollectionsIndices(email, collectionID, asins) {
    return new Promise((resolve, reject) => {
        // Use placeholders for dynamic values in the SQL statement
        const sql = `UPDATE collectionsIndices SET collectionID = ?, asins = ? WHERE email = ?`;
        db.run(sql, [collectionID, JSON.stringify(asins), email], function (err) {
            if (err) {
                console.log("Error updating database:", err); // Logging the error might help in debugging
                reject(err);
            } else {
                console.log(`Rows updated: ${this.changes}`); // Log how many rows were updated
                resolve(this.changes); // Resolving with the number of rows that were updated
            }
        });
    });
}


async function updateCollectionsIndicesResult(email, resultSet) {
    return new Promise((resolve, reject) => {
        // Use placeholders for dynamic values in the SQL statement
        const sql = `UPDATE collectionsIndices SET resultSet = ? WHERE email = ?`;
        db.run(sql, [JSON.stringify(resultSet), email], function (err) {
            if (err) {
                console.log("Error updating database:", err); // It's helpful to log the error for debugging purposes
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}


module.exports = {
    insertData,
    queryDataByEmail,
    updateCollectionsIndices,
    updateCollectionsIndicesResult
};
