const express = require('express')
const axios = require('axios'); // Import axios
const { queryDataByEmail, updateCollectionsIndices, updateCollectionsIndicesResult, insertData } = require('../../../src/db/Models/collectionsIndices');
const { downloadURL, unzipDirectory, parseCSVData, getDataByHeaders, formatUTCDate, getMonthNumber } = require('../../../sharedFunctions/sharedFunctions');
const router = express.Router();
const api_key = '967CF4094E74405881FAD697D969332E';
const params = { api_key };
const returnObject = { collectionID: "", new_requests: [], errors: [] };
const webhookURL = "https://bb64-105-196-38-195.ngrok-free.app/api/rankspy/rainforest/webhook";

router.post('/retrieveResultSet', async (req, res) => {
    const { caller } = req.body;
    console.log({ caller })
    try {
        const response = await queryDataByEmail(caller);
        console.log({ response });
        const result_set = response["resultSet"];
        //await updateCollectionsIndicesResult(caller, "")
        res.status(200).send(result_set);
    } catch (error) {
        //console.log(error)
        res.status(500).send("couldn't retrieve your search results!")
    }
});

router.post('/webhook', async (req, res) => {

    const data = req.body;
    const collectionID = data.collection.id;
    const collectionName = data.collection.name;
    const collectionInfo = await queryDataByEmail(collectionName);
    const asins = collectionInfo["asins"];
    const resultSetID = data.result_set.id;
    try {
        const resultSetData = await getResultSetData(collectionID, resultSetID);
        const all_pages_download_url = resultSetData.data.result.download_links.all_pages;
        const downloadedContent = await downloadURL(all_pages_download_url);
        const unzippedContent = await unzipDirectory(downloadedContent);
        const csvFile = unzippedContent.file(/\.csv$/)[0];
        const csvData = await parseCSVData(csvFile);
        const finalContent = await processResultSetData(csvData, asins);
        updateCollectionsIndicesResult(collectionName, finalContent);
    } catch (error) {
        res.status(500).send(error);
    }
    res.status(200).send('Webhook received');
});

router.post('/createcollection', async (req, res) => {
    try {
        const { caller, collectionID, zipCode, searchTerms, asins } = req.body;
        console.log(req.body);
        console.log({ caller, collectionID, zipCode, searchTerms, asins });
        var collection;

        try {
            collection = await getCollection(caller, collectionID);
            //collection = await updateCollection(collection, zipCode);
            //console.log("tried to get collection and found: " + collection);
        } catch (error) {
            //console.error(error)
            collection = null;
            returnObject["errors"].push({
                "error code": "RF001",
                "error message": error.message
            });
        }

        if (collection === null) {
            try {
                collection = await createCollection(caller);
                //console.log("created collection with id: " + collection);
            } catch (error) {
                returnObject["errors"].push({
                    "error code": "RF002",
                    "error message": error.message
                });
                res.status(500).send(returnObject);
            }
        }
        returnObject["collectionID"] = collection;

        if (searchTerms) {
            if (searchTerms.length !== 0) {
                try {
                    await clearRequests(collection);
                    //console.log("requests cleared successfuly");
                } catch (error) {
                    //console.error(error.stack);
                    returnObject["errors"].push({
                        "error code": "RF003",
                        "error message": `couldn't clear requests of collection ${collection}`
                    });
                }
                try {
                    await createRequests(collection, searchTerms, zipCode);
                    //console.log("search Terms updated successfuly!");
                } catch (error) {
                    returnObject["errors"].push({
                        "error code": "RF004",
                        "error message": error.message
                    });
                    res.status(500).send(returnObject);
                }
            }
            returnObject["new_requests"] = searchTerms;
        }

        try {
            await updateCollectionsIndices(caller, collection, asins);
            //console.log("indices updated!")
        } catch (e) {
            //console.log(e);
        }

        try {
            const result = await startCollection(collection);
            //console.log({ result })
        } catch (e) {
            //console.log(e);
        }

        res.status(201).send({ returnObject });
    } catch (error) {
        //console.error(error.stack);
        res.status(500).send(returnObject);
    }
});

async function getResultSetData(collectionID, resultSetID) {
    try {
        const response = await axios.get(`https://api.rainforestapi.com/collections/${collectionID}/results/${resultSetID}/csv`, { params });
        return response;
    } catch (error) {
        //console.log(error.stack);
        throw new Error(`Couldn't retrieve result set ${resultSetID} data for collection: ${collectionID}.`);
    }
}

async function startCollection(collectionID) {
    try {
        const response = await axios.get(`https://api.rainforestapi.com/collections/${collectionID}/start`, { params });
        //console.log({ res: response.data })
        return response.data;
    } catch (e) {
        //console.log(e);
        return new Error(`Couldn't start collection: ${collectionID}`);
    }
}

async function getCollection(caller, collectionID) {
    let collectionData;

    // Attempt to fetch collection data from the database if no collectionID is provided
    if (!collectionID) {
        collectionData = await queryDataByEmail(caller);
        if (collectionData === undefined) {
            await insertData(caller, "", "")
            return null;
        }

        collectionID = collectionData["collectionID"];
        if (collectionID === '') return null;
    }

    try {
        const response = await axios.get(`https://api.rainforestapi.com/collections/${collectionID}`, { params });
        console.log({ responseData: response.data })
        if (response.data.hasOwnProperty("collection")) {
            return response.data.collection.id; // Adjusted to return response.data
        }
        throw new Error(`No collection with id: ${collectionID} found!`);
    } catch (error) {
        //console.error(error);
        collectionID = await queryDataByEmail(caller);
        if (collectionID !== null) {
            try {
                response = await axios.get(`https://api.rainforestapi.com/collections/${collectionID}`, { params });
                return response.data.collection.id;
            } catch (e) { }
        }
        throw new Error(`couldn't get collection: ${collectionID}.`);
    }
}

async function createCollection(name) {
    const body = {
        name: name,
        enabled: true,
        schedule_type: 'manual',
        priority: 'highest',
        notification_webhook: webhookURL,
        notification_as_jsonlines: true
    }
    try {
        const response = await axios.post(`https://api.rainforestapi.com/collections?api_key=${api_key}`, body);
        //console.log(response.data);
        return response.data.collection.id;
    } catch (error) {
        //console.error(error);
        throw new Error("couldn't create a new collection!");
    }
}

async function clearRequests(collectionID) {
    try {
        const response = await axios.delete(`https://api.rainforestapi.com/collections/${collectionID}/clear`, { params });
        //console.log({ response })
        return true;
    } catch (e) {
        //console.log(e);
        return false;
    }
}

async function createRequests(collectionID, searchTerms, zipCode) {
    var requests = [];
    searchTerms.forEach((term) => {
        requests.push({
            "type": "search",
            "amazon_domain": "amazon.com",
            "customer_zipcode": zipCode,
            "search_term": term[0]
        });
    });
    const body = { requests };
    try {
        const response = await axios.put(`https://api.rainforestapi.com/collections/${collectionID}?api_key=${api_key}`, body);
        return true;
    } catch (error) {
        //console.error(error);
        throw new Error(`couldn't create requests for collection ${collection}`);
    }
}

async function processResultSetData(data, asins) {
    //console.log({ asins })
    var wantedHeaders = [
        "TrackDate_ASIN_Keyword", "ASIN_Keyword", "TrackDate", "result.search_results.asin", "request.search_term",
        "Search Volume", "result.search_results.position", "result.search_results.sponsored", "Date"
    ];
    var content = getDataByHeaders(data, wantedHeaders);
    const date = formatUTCDate(new Date(), "m/dd/yyyy", "/");
    content = content.map((row) => {
        row[0] = date + "_" + row[3] + "_" + row[4];
        row[1] = row[3] + "_" + row[4];
        row[2] = date;
        row[8] = date;
        return row;
    });
    //console.log({ content });

    var finalContent = [];// = [["TrackDate_ASIN_Keyword", "ASIN_Keyword", "TrackDate", "ASIN", "Keyword", "Search Volume", "Organic Rank", "Sponsored Position", "Track Date"]];
    var date_asin_Keyword_map = {};
    content.forEach((row) => {
        var [date_asin_keyword, asin_Keyword, date, asin, keyword, searchVolume, rank, isSponsored, date] = row;
        //console.log({ asin, asins })
        if (!asins.includes(asin)) return;
        if (isSponsored === true) {
            console.log({ date_asin_keyword, asin_Keyword, date, asin, keyword, searchVolume, rank, isSponsored, date })
            if (date_asin_Keyword_map.hasOwnProperty(date_asin_keyword)) {
                finalContent[date_asin_Keyword_map[date_asin_keyword]][7] = rank;
            } else {
                finalContent.push([date_asin_keyword, asin_Keyword, date, asin, keyword, searchVolume, '', rank, date]);
                date_asin_Keyword_map[date_asin_keyword] = (finalContent.length - 1);
            }
        } else {
            if (date_asin_Keyword_map.hasOwnProperty(date_asin_keyword)) {
                finalContent[date_asin_Keyword_map[date_asin_keyword]][6] = rank;
            } else {
                finalContent.push([date_asin_keyword, asin_Keyword, date, asin, keyword, searchVolume, rank, '', date]);
                date_asin_Keyword_map[date_asin_keyword] = (finalContent.length - 1);
            }
        }

    });
    //console.log(finalContent);
    return finalContent;
}

module.exports = router;