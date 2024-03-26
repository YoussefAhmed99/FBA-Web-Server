const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const JSZip = require('jszip');
const papa = require('papaparse');

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(path.join(__dirname, filePath), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null; // Return null or throw an error depending on your error handling strategy
    }
}

async function writeToJsonFile(filePath, data) {
    try {
        await fs.writeFile(path.join(__dirname, filePath), JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        // Handle error or throw depending on your error handling strategy
    }
}

async function downloadURL(url) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        console.error(error.stack);
        throw new Error(`couldn't download data from: ${url}`)
    }
}

async function unzipDirectory(directory) {
    try {
        const zip = new JSZip();
        return await zip.loadAsync(directory);
    } catch (error) {
        console.error(error);
        throw new Error(`couldn't unzip ${directory}`);
    }
}

async function parseCSVData(csvFile) {
    try {
        const csvData = await csvFile.async('string');
        const results = papa.parse(csvData, {
            header: false,
            dynamicTyping: true,
            skipEmptyLines: true
        });
        return results.data; // This is the 2D array
    } catch (e) {
        throw new Error(`couldn't parse csv from: ${csvFile}`)
    }
}

function getDataByHeaders(data, headers = data[0], headerRows = 1) {
    //console.log({ data });
    var result = new Array(data.length - headerRows);
    for (var i = 0; i < result.length; i++) {
        result[i] = [new Array(headers.length).fill('')];
    }
    //console.log(result);
    var headersIndexes = new Array(headers.length).fill("not found");

    for (var i = 0; i < data[0].length; i++) {
        for (var j = 0; j < headers.length; j++) {
            if (typeof headers[j] == "string") {
                var search = data[0][i].toLowerCase().replace(/[^a-zA-Z0-9-_!@#$%^&*()\/\\]+/g, "");
                var key = headers[j].toLowerCase().replace(/[^a-zA-Z0-9-_!@#$%^&*()\/\\]+/g, "");
                //console.log("string mode: ", {search,  key, isEqual: search == key})
                if (search == key) {
                    headersIndexes[j] = i;
                }
            } else {
                for (var variance = 0; variance < headers[j].length; variance++) {
                    var search = data[0][i].toLowerCase().replace(/[^a-zA-Z0-9-_!@#$%^&*()\/\\]+/g, "");
                    var key = headers[j][variance].toLowerCase().replace(/[^a-zA-Z0-9-_!@#$%^&*()\/\\]+/g, "");
                    //console.log("variance mode: ", {search,  key, isEqual: search == key})
                    if (search == key) {
                        headersIndexes[j] = i;
                        break;
                    }
                }
            }
        }
    }
    //console.log({ headersIndexes });
    //console.log({ dataHeaders: data[0] });
    //console.log({ headers });

    for (var i = headerRows; i < data.length; i++) {
        for (var j = 0; j < headers.length; j++) {
            headersIndexes[j] != "not found" ? result[i - headerRows][j] = data[i][headersIndexes[j]] : result[i - headerRows][j] = '';
        }
    }
    //console.log({ result });

    return result;
}

function formatUTCDate(date, format, delimiter) {
    var dateString = date.toString();
    var dateObj = {
        "dd": dateString.split(" ")[2],
        "d": Number(dateString.split(" ")[2]) <= 9 ? dateString.split(" ")[2][1] : dateString.split(" ")[2],
        "mmm": dateString.split(" ")[1],
        "mm": getMonthNumber(dateString.split(" ")[1]),
        "m": Number(getMonthNumber(dateString.split(" ")[1])) <= 9 ? getMonthNumber(dateString.split(" ")[1])[1] : getMonthNumber(dateString.split(" ")[1]),
        "yyyy": dateString.split(" ")[3]
    };
    var formatComponents = format.split(delimiter);
    var formattedDate = "";
    for (var i = 0; i < formatComponents.length; i++) {
        formattedDate += dateObj[formatComponents[i]] + delimiter;
    }
    formattedDate = formattedDate.slice(0, formattedDate.length - 1);
    //console.log({formattedDate})
    return formattedDate;
}

function getMonthNumber(mon) {
    index = "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(mon) / 3 + 1;
    index < 10 ? index = "0" + index : null;
    //console.log({ index });
    return index;
}

function getWeekNumber(date = "12/31/2023", year = "2023", delimiter = "/") {
    var startDate = new Date(year, 0, 1);
    var currentDate = new Date(Number(date.split(delimiter)[2]), (Number(date.split(delimiter)[0]) - 1), (Number(date.split(delimiter)[1]) + 1));
    var days = Math.floor((currentDate - startDate) / (24 * 60 * 60 * 1000));
    var weekNumber = Math.ceil(days / 7);
    return weekNumber > 52 ? 52 : weekNumber;
}

module.exports = { readJsonFile, writeToJsonFile, downloadURL, unzipDirectory, parseCSVData, getDataByHeaders, formatUTCDate };
