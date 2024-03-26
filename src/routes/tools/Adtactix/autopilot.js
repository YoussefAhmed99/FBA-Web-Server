const express = require('express')
const router = express.Router();

router.post('/', async (req, res) => {
    console.log("autopilot")
    var { caller, keepOldBids, minValue, controlValues, spcValues, sbcValues, sdcValues } = req.body;
    console.log({ caller, keepOldBids, minValue });

    controlData = setupBidRules(controlValues);
    var controlKeys = Object.keys(controlData);

    for (var i = 0; i < controlKeys.length; i++) {
        [spcValues, sbcValues, sdcValues] = processAction(controlData[controlKeys[i]], spcValues, sbcValues, sdcValues);
    }

    [spcValues, sbcValues, sdcValues] = validateBids(spcValues, sbcValues, sdcValues, controlData, keepOldBids, minValue);

    spcValues[0][4] = "Bid Rule #";
    sbcValues[0][4] = "Bid Rule #";
    sdcValues[0][4] = "Bid Rule #";

    res.status(200).send({ spcValues, sbcValues, sdcValues });
});

function validateBids(spcValues, sbcValues, sdcValues, rules, moveBids, vidHsaMinVal) {
    var values = [spcValues, sbcValues, sdcValues];

    var iRule = 4, iBid, iNewBid, iKeywordText, iEntity, iPercentage, rule, bid, newBid, keywordText, entity, percentage, campaignBudget, min, max, iDefaultBid, iVidHSA, vidhsa;
    for (var i = 0; i < values.length; i++) {
        iBid = values[i][0].findIndex(element => element.toLowerCase() === "Bid".toLowerCase());
        iNewBid = values[i][0].findIndex(element => element.toLowerCase() === "New Bid".toLowerCase());
        iKeywordText = values[i][0].findIndex(element => element.toLowerCase() === "Keyword Text".toLowerCase());
        iEntity = values[i][0].findIndex(element => element.toLowerCase() === "Entity".toLowerCase());
        iPercentage = values[i][0].findIndex(element => element.toLowerCase() === "Percentage".toLowerCase());
        iCampaignBudget = values[i][0].findIndex(element => element.toLowerCase() === (i == 0) ? "Daily Budget".toLowerCase() : "Budget".toLowerCase());
        iDefaultBid = values[i][0].findIndex(element => element.toLowerCase() === "Ad Group Default Bid".toLowerCase());
        iVidHSA = values[i][0].findIndex(element => element.toLowerCase() === "Vid/HSA".toLowerCase());

        for (var j = 1; j < values[i].length; j++) {
            if (i != 2) { // keyword text not existing in Sponsored Displays
                keywordText = values[i][j][iKeywordText];
                try {
                    values[i][j][iKeywordText] = keywordText[0] == "+" ? `'${keywordText}` : keywordText;
                } catch (e) { }
            }

            rule = values[i][j][iRule];
            bid = values[i][j][iBid];
            newBid = values[i][j][iNewBid];
            entity = values[i][j][iEntity];
            percentage = values[i][j][iPercentage];
            campaignBudget = values[i][j][iCampaignBudget];
            vidhsa = values[i][j][iVidHSA];

            if (rule == "") {
                values[i][j][iNewBid] = moveBids == true ? bid : newBid;
                if (vidhsa != undefined) {
                    //console.log({ entity, vidhsa, newBid, isTrue: newBid < 0.25 })
                }
            } else if (/Campaign|Keyword|Product Targeting/i.test(entity) && /Video_Detail Page|video_detailPage/i.test(vidhsa) && newBid < vidHsaMinVal) {
                //console.log(newBid, iNewBid)
                values[i][j][iNewBid] = vidHsaMinVal;
            } else if (/keyword|product targeting|Audience Targeting|Contextual Targeting/i.test(entity)) {
                try {
                    min = rules[rule]["min"];
                    max = rules[rule]["max"];
                    if (newBid == "NaN" || newBid == "") {
                        //console.log({ rule, newBid, bid });
                        values[i][j][iNewBid] = bid;
                    } else if (newBid > Number(max) && max !== "") {
                        //console.log({ rule, max, newBid });
                        values[i][j][iNewBid] = max;
                    } else if (newBid < Number(min) && min !== "") {
                        //console.log({ rule, min, newBid });
                        values[i][j][iNewBid] = min;
                    }
                } catch (e) { }
            } else if (/Bidding Adjustment/i.test(entity)) {
                if (percentage == "") {
                    values[i][j][iPercentage] = 0.00;
                } else {
                    try {
                        max = rules[rule]["min"];
                        max = rules[rule]["max"];
                        if (percentage > max && max != "") {
                            values[i][j][iPercentage] = max;
                        } else if (percentage < min && min != "") {
                            values[i][j][iPercentage] = min;
                        }
                    } catch (e) { }
                }
            } else if (/campaign/i.test(entity)) {
                try {
                    max = rules[rule]["min"];
                    max = rules[rule]["max"];
                    if (campaignBudget > max && max != "") {
                        values[i][j][iCampaignBudget] = max;
                    } else if (campaignBudget < min && min != "") {
                        values[i][j][iCampaignBudget] = min;
                    }
                } catch (e) { }
            } else if (/Ad Group/i.test(entity)) {
                try {
                    min = rules[rule]["min"];
                    max = rules[rule]["max"];
                    if (defaultBid == "NaN" || defaultBid == "") {
                        //console.log({ rule, newBid, bid });
                        values[i][j][iDefaultBid] = bid;
                    } else if (defaultBid > Number(max) && max !== "") {
                        //console.log({ rule, max, newBid });
                        values[i][j][iDefaultBid] = max;
                    } else if (defaultBid < Number(min) && min !== "") {
                        //console.log({ rule, min, newBid });
                        values[i][j][iDefaultBid] = min;
                    }
                } catch (e) { }
            }
        }
    }
    spcValues = values[0], sbcValues = values[1], sdcValues = values[2];
    return [spcValues, sbcValues, sdcValues];
};

function applyDeltas(bid, newBid, deltaUB, deltaLB) {
    //console.log({ bid, newBid, deltaLB, deltaUB });
    if (deltaUB !== null && newBid > bid && newBid > deltaUB) {
        return deltaUB;
    } else if (deltaLB !== null && newBid < bid && newBid < deltaLB) {
        return deltaLB;
    }
    return newBid.toString();
}

function evaluateRow(mode, bundle, row, conditions, targets, ppc, brandsMode = "N/A") {
    var check = true;
    //if (mode == "Sponsored Brands") console.log(bundle["Entities"], row[bundle["Entity"]])
    if (row[4] == "" && bundle["Entities"].map(entity => entity.toLowerCase()).includes(row[bundle["Entity"]].toLowerCase())) {
        //console.log(row[bundle["State_1"]], row[bundle["State_2"]], row[bundle["State_3"]])
        if (/^(enabled|running|)$/i.test(row[bundle["State_1"]]) && /^(enabled|running|)$/i.test(row[bundle["State_2"]]) && /^(enabled|running|Out Of Budget|Rejected|)$/i.test(row[bundle["State_3"]])) {
            //if (mode == "Sponsored Brands") console.log({ targets, "match type": row[bundle["Match Type"]], "Product Targeting": row[bundle["ProductTargetingExpression"]] });
            try {
                if (
                    ppc || (
                        targets.includes(row[bundle["Match Type"]]) || (
                            targets.includes("PAT") && row[bundle["ProductTargetingExpression"]].includes("asin=")) || (
                            targets.includes("AUD") && row[bundle["ProductTargetingExpression"]].includes("audience=")) || (
                            targets.includes("CAT") && row[bundle["ProductTargetingExpression"]].includes("category=")) || (
                            targets.includes("Auto") && /(complements|substitutes|loose-match|close-match)/i.test(row[bundle["ProductTargetingExpression"]]))
                    )
                ) {
                    //console.log({mode, ppc, brandsMode, brandsType: row[bundle["ProductTargetingExpression"]]})
                    if (
                        ((mode == "Sponsored Brands" && !ppc) && (
                            (brandsMode == "HSA" && /(productCollection_store|product Collection_store|Product Collection_Product List|ProductCollection_ProductList)/i.test(row[bundle["VidHSA"]])) ||
                            (brandsMode == "Video" && /(video_detailPage|video_detail Page)/i.test(row[bundle["VidHSA"]]))
                        )
                        ) ||
                        mode != "Sponsored Brands" || (
                            mode == "Sponsored Brands" && ppc)) {
                        var exprs = [];
                        for (var j = 0; j < conditions[mode].length; j++) {
                            if (check) {
                                if (row[conditions[mode][j][0]] == "") {
                                    return false;
                                }
                                try {
                                    var lhs = row[conditions[mode][j][0]].match(/[a-zA-Z0-9.]/g).join('');
                                } catch (e) {
                                    console.error({ errorAt: row[conditions[mode][j][0]] });
                                    return;
                                }
                                //console.log(typeof conditions[mode][j], conditions[mode][j], typeof conditions[mode][j][1], conditions[mode][j][1])
                                if (typeof conditions[mode][j][1] === "string") {
                                    var operator = conditions[mode][j][1];
                                    var rhs = conditions[mode][j][2];
                                    var expr;
                                    if (/[a-zA-z,!@#$%^&*(_+=:"'?"|""\""\/")]/g.test(rhs)) {
                                        expr = `"` + lhs + `" ` + operator + ` "` + rhs.match(/[a-zA-Z0-9.]/g).join('') + `"`;
                                    } else {
                                        expr = lhs + operator + rhs;
                                    }
                                    //console.log({ expr }, typeof rhs)
                                    check = eval(expr);
                                    exprs.push(expr)
                                } else {
                                    //console.info(conditions[mode][j]);
                                    var exprs = [];
                                    for (var k = 1; k < conditions[mode][j].length; k++) {
                                        lhs = /[a-zA-Z]/g.test(lhs) && !lhs.toString().includes('"') ? lhs = `"` + lhs + `"` : lhs;
                                        operator = conditions[mode][j][k][0];
                                        rhs = /[a-zA-Z]/g.test(conditions[mode][j][k][1]) ? rhs = `"` + conditions[mode][j][k][1].match(/[a-zA-Z0-9.]/g).join('') + `"` : conditions[mode][j][k][1].match(/[a-zA-Z0-9.]/g).join('');
                                        expr = lhs + " " + operator + " " + rhs;
                                        exprs.push(expr);
                                    }
                                    try {
                                        exprs = exprs.join(" || ");
                                        //console.log({exprs})
                                        check = eval(exprs);
                                    } catch (e) {
                                        console.error(e.stack);
                                    }
                                }
                            } if (!check) {
                                return false;
                            }
                        }
                        //console.warn("TRUE", { mode, entity: row[bundle["Entity"]], "state 1": row[bundle["State_1"]], "state 2": row[bundle["State_2"]], "state 3": row[bundle["State_3"]] }, { exprs }, { targets });
                        return true;
                    }
                }
            } catch (e) {
                console.error(e.stack)
            }
        }
    }
    return false;
};

function processAction(rule, spcValues, sbcValues, sdcValues) {
    var targets = disectUserTargets(rule["Targets"]);
    var ruleConditions = getRuleConditions(rule, spcValues[0], sbcValues[0], sdcValues[0]);

    var row, bid, sales, spend, clicks, acos, cpc, state1, state2, state3, camp, entity, pct, deltaUB, deltaLB, targetAcos = parseFloat(rule["Target Acos"]) / 100, bidmod = rule["bid mod"], cpcMod = rule["cpc mod"], ruleNumber = rule["Order"], campMod = rule["campaign budget"], pctMod = rule["Placement mod"], aov = rule["AOV"], estClicksOrders = rule["Est Clicks/Order"], oldBid = rule["Old Bid"];
    var deltaPlus = rule["delta +"] == "" ? "" : rule["delta +"].match(/[0-9.]/g).join("");
    var deltaMinus = rule["delta -"] == "" ? "" : rule["delta -"].match(/[0-9.]/g).join("");

    const modeBundles = {
        "Sponsored Products": {
            "Entity": spcValues[0].findIndex(element => element.toLowerCase() === "Entity".toLowerCase()),
            "Match Type": spcValues[0].findIndex(element => element.toLowerCase() === "Match Type".toLowerCase()),
            "ProductTargetingExpression": spcValues[0].findIndex(element => element.toLowerCase() === "Product Targeting Expression".toLowerCase()),
            "KWCount": spcValues[0].findIndex(element => element.toLowerCase() === "KW Count".toLowerCase()),
            "State_1": spcValues[0].findIndex(element => element.toLowerCase() === "State".toLowerCase()),
            "State_2": spcValues[0].findIndex(element => element.toLowerCase() === "Campaign State (Informational only)".toLowerCase()),
            "State_3": spcValues[0].findIndex(element => element.toLowerCase() === "Ad Group State (Informational only)".toLowerCase()),
            "Bid": spcValues[0].findIndex(element => element.toLowerCase() === "Bid".toLowerCase()),
            "New Bid": spcValues[0].findIndex(element => element.toLowerCase() === "New Bid".toLowerCase()),
            "Placement": spcValues[0].findIndex(element => element.toLowerCase() === "Placement".toLowerCase()),
            "Percentage": spcValues[0].findIndex(element => element.toLowerCase() === "Percentage".toLowerCase()),
            "Sales": spcValues[0].findIndex(element => element.toLowerCase() === "Sales".toLowerCase()),
            "Spend": spcValues[0].findIndex(element => element.toLowerCase() === "Spend".toLowerCase()),
            "Clicks": spcValues[0].findIndex(element => element.toLowerCase() === "Clicks".toLowerCase()),
            "Acos": spcValues[0].findIndex(element => element.toLowerCase() === "Acos".toLowerCase()),
            "CPC": spcValues[0].findIndex(element => element.toLowerCase() === "CPC".toLowerCase()),
            "CPA": spcValues[0].findIndex(element => element.toLowerCase() === "CPA".toLowerCase()),
            "Org Rank": spcValues[0].findIndex(element => element.toLowerCase() === "Org Rank".toLowerCase()),
            "Rank Trend": spcValues[0].findIndex(element => element.toLowerCase() === "Rank Trend".toLowerCase()),
            "Spon Rank": spcValues[0].findIndex(element => element.toLowerCase() === "SP Rank".toLowerCase()),
            "H10SVol": spcValues[0].findIndex(element => element.toLowerCase() === "H10 SVol".toLowerCase()),
            "SQSVol": spcValues[0].findIndex(element => element.toLowerCase() === "SQ SVol".toLowerCase()),
            "SQScore": spcValues[0].findIndex(element => element.toLowerCase() === "SQ Score".toLowerCase()),
            "ImprShare %": spcValues[0].findIndex(element => element.toLowerCase() === "Impr Share".toLowerCase()),
            "ClickShare %": spcValues[0].findIndex(element => element.toLowerCase() === "Click Share".toLowerCase()),
            "PurchShare %": spcValues[0].findIndex(element => element.toLowerCase() === "Purch Share".toLowerCase()),
            "My PurchCount": spcValues[0].findIndex(element => element.toLowerCase() === "My Purch Count".toLowerCase()),
            "Tot PurchCount": spcValues[0].findIndex(element => element.toLowerCase() === "Tot Purch Count".toLowerCase()),
            "My SQCVR %": spcValues[0].findIndex(element => element.toLowerCase() === "My CVR".toLowerCase()),
            "Tot SQCVR %": spcValues[0].findIndex(element => element.toLowerCase() === "Tot CVR".toLowerCase()),
            "CVRTrend": spcValues[0].findIndex(element => element.toLowerCase() === "CVR Trend".toLowerCase()),
            "Daily budget": spcValues[0].findIndex(element => element.toLowerCase() === "Daily budget".toLowerCase()),
            "Ad Group Default Bid": spcValues[0].findIndex(element => element.toLowerCase() === "Ad Group Default Bid".toLowerCase()),
            "Entities": ["Keyword", "Product Targeting", "Campaign", "Bidding adjustment", "Ad Group"]
        },
        "Sponsored Brands": {
            "Entity": sbcValues[0].findIndex(element => element.toLowerCase() === "Entity".toLowerCase()),
            "VidHSA": sbcValues[0].findIndex(element => element.toLowerCase() === "Vid/HSA".toLowerCase()),
            "Match Type": sbcValues[0].findIndex(element => element.toLowerCase() === "Match Type".toLowerCase()),
            "ProductTargetingExpression": sbcValues[0].findIndex(element => element.toLowerCase() === "Product Targeting Expression".toLowerCase()),
            "State_1": sbcValues[0].findIndex(element => element.toLowerCase() === "State".toLowerCase()),
            "State_2": sbcValues[0].findIndex(element => element.toLowerCase() === "Campaign State (Informational only)".toLowerCase()),
            "State_3": sbcValues[0].findIndex(element => element.toLowerCase() === "Campaign Serving Status (Informational only)".toLowerCase()),
            "Bid": sbcValues[0].findIndex(element => element.toLowerCase() === "Bid".toLowerCase()),
            "New Bid": sbcValues[0].findIndex(element => element.toLowerCase() === "New Bid".toLowerCase()),
            "Sales": sbcValues[0].findIndex(element => element.toLowerCase() === "Sales".toLowerCase()),
            "Spend": sbcValues[0].findIndex(element => element.toLowerCase() === "Spend".toLowerCase()),
            "Acos": sbcValues[0].findIndex(element => element.toLowerCase() === "Acos".toLowerCase()),
            "CPC": sbcValues[0].findIndex(element => element.toLowerCase() === "CPC".toLowerCase()),
            "Clicks": sbcValues[0].findIndex(element => element.toLowerCase() === "Clicks".toLowerCase()),
            "CPA": sbcValues[0].findIndex(element => element.toLowerCase() === "CPA".toLowerCase()),
            "Org Rank": sbcValues[0].findIndex(element => element.toLowerCase() === "Org Rank".toLowerCase()),
            "Rank Trend": sbcValues[0].findIndex(element => element.toLowerCase() === "Rank Trend".toLowerCase()),
            "Spon Rank": sbcValues[0].findIndex(element => element.toLowerCase() === "SP Rank".toLowerCase()),
            "H10SVol": sbcValues[0].findIndex(element => element.toLowerCase() === "H10 SVol".toLowerCase()),
            "SQSVol": sbcValues[0].findIndex(element => element.toLowerCase() === "SQ SVol".toLowerCase()),
            "SQScore": sbcValues[0].findIndex(element => element.toLowerCase() === "SQ Score".toLowerCase()),
            "ImprShare %": sbcValues[0].findIndex(element => element.toLowerCase() === "Impr Share".toLowerCase()),
            "ClickShare %": sbcValues[0].findIndex(element => element.toLowerCase() === "Click Share".toLowerCase()),
            "PurchShare %": sbcValues[0].findIndex(element => element.toLowerCase() === "Purch Share".toLowerCase()),
            "My PurchCount": sbcValues[0].findIndex(element => element.toLowerCase() === "My Purch Count".toLowerCase()),
            "Tot PurchCount": sbcValues[0].findIndex(element => element.toLowerCase() === "Tot Purch Count".toLowerCase()),
            "My SQCVR %": sbcValues[0].findIndex(element => element.toLowerCase() === "My CVR".toLowerCase()),
            "Tot SQCVR %": sbcValues[0].findIndex(element => element.toLowerCase() === "Tot CVR".toLowerCase()),
            "CVRTrend": sbcValues[0].findIndex(element => element.toLowerCase() === "CVR Trend".toLowerCase()),
            "Daily budget": sbcValues[0].findIndex(element => element.toLowerCase() === "Budget".toLowerCase()),
            "Entities": ["Keyword", "Product Targeting", "Campaign"]
        },
        "Sponsored Display": {
            "Entity": sdcValues[0].findIndex(element => element.toLowerCase() === "Entity".toLowerCase()),
            "State_1": sdcValues[0].findIndex(element => element.toLowerCase() === "State".toLowerCase()),
            "State_2": sdcValues[0].findIndex(element => element.toLowerCase() === "Campaign State (Informational only)".toLowerCase()),
            "State_3": sdcValues[0].findIndex(element => element.toLowerCase() === "Ad Group State (Informational only)".toLowerCase()),
            "ProductTargetingExpression": sdcValues[0].findIndex(element => element.toLowerCase() === "Targeting Expression".toLowerCase()),
            "Bid": sdcValues[0].findIndex(element => element.toLowerCase() === "Bid".toLowerCase()),
            "New Bid": sdcValues[0].findIndex(element => element.toLowerCase() === "New Bid".toLowerCase()),
            "Sales": sdcValues[0].findIndex(element => element.toLowerCase() === "Sales".toLowerCase()),
            "Spend": sdcValues[0].findIndex(element => element.toLowerCase() === "Spend".toLowerCase()),
            "Acos": sdcValues[0].findIndex(element => element.toLowerCase() === "Acos".toLowerCase()),
            "CPC": sdcValues[0].findIndex(element => element.toLowerCase() === "CPC".toLowerCase()),
            "Clicks": sdcValues[0].findIndex(element => element.toLowerCase() === "Clicks".toLowerCase()),
            "CPA": sdcValues[0].findIndex(element => element.toLowerCase() === "CPA".toLowerCase()),
            "Org Rank": sdcValues[0].findIndex(element => element.toLowerCase() === "Org Rank".toLowerCase()),
            "Rank Trend": sdcValues[0].findIndex(element => element.toLowerCase() === "Rank Trend".toLowerCase()),
            "Spon Rank": sdcValues[0].findIndex(element => element.toLowerCase() === "SP Rank".toLowerCase()),
            "H10SVol": sdcValues[0].findIndex(element => element.toLowerCase() === "H10 SVol".toLowerCase()),
            "SQSVol": sdcValues[0].findIndex(element => element.toLowerCase() === "SQ SVol".toLowerCase()),
            "SQScore": sdcValues[0].findIndex(element => element.toLowerCase() === "SQ Score".toLowerCase()),
            "ImprShare %": sdcValues[0].findIndex(element => element.toLowerCase() === "Impr Share".toLowerCase()),
            "ClickShare %": sdcValues[0].findIndex(element => element.toLowerCase() === "Click Share".toLowerCase()),
            "PurchShare %": sdcValues[0].findIndex(element => element.toLowerCase() === "Purch Share".toLowerCase()),
            "My PurchCount": sdcValues[0].findIndex(element => element.toLowerCase() === "My Purch Count".toLowerCase()),
            "Tot PurchCount": sdcValues[0].findIndex(element => element.toLowerCase() === "Tot Purch Count".toLowerCase()),
            "My SQCVR %": sdcValues[0].findIndex(element => element.toLowerCase() === "My CVR".toLowerCase()),
            "Tot SQCVR %": sdcValues[0].findIndex(element => element.toLowerCase() === "Tot CVR".toLowerCase()),
            "CVRTrend": sdcValues[0].findIndex(element => element.toLowerCase() === "CVR Trend".toLowerCase()),
            "Daily budget": sdcValues[0].findIndex(element => element.toLowerCase() === "Budget".toLowerCase()),
            "Ad Group Default Bid": sdcValues[0].findIndex(element => element.toLowerCase() === "Ad Group Default Bid".toLowerCase()),
            "Entities": ["Contextual Targeting", "Audience Targeting", "Campaign", "Ad Group"]
        }
    };

    const spIndexesObject = modeBundles["Sponsored Products"], sbIndexesObject = modeBundles["Sponsored Brands"], sdIndexesObject = modeBundles["Sponsored Display"];

    for (var i = 1; i < spcValues.length; i++) {

        row = spcValues[i];

        state1 = spIndexesObject["State_1"];
        state2 = row[spIndexesObject["State_2"]];
        state3 = row[spIndexesObject["State_3"]];
        bid = parseFloat(row[spIndexesObject["Bid"]]);
        sales = parseFloat(row[spIndexesObject["Sales"]]);
        spend = parseFloat(row[spIndexesObject["Spend"]]);
        clicks = parseFloat(row[spIndexesObject["Clicks"]]);
        acos = parseFloat(row[spIndexesObject["Acos"]]) / 100;
        cpc = parseFloat(row[spIndexesObject["CPC"]]);
        entity = row[spIndexesObject["Entity"]];
        placement = row[spIndexesObject["Placement"]];
        percentage = parseFloat(row[spIndexesObject["Percentage"]]);
        camp = parseFloat(row[spIndexesObject["Daily budget"]]);

        if (evaluateRow("Sponsored Products", spIndexesObject, row, ruleConditions, targets["Sponsored Products"], rule["PPC"])) {
            try {
                //console.log({entity, task: rule["Task"]})
                if (/(keyword|product targeting)/i.test(entity) && rule["Override Type"] != "AdGroup") {
                    deltaUB = deltaPlus == "" ? null : (bid + (bid * (deltaPlus / 100))).toFixed(4);
                    deltaLB = deltaMinus == "" ? null : (bid - (bid * (deltaMinus / 100))).toFixed(4);
                    //console//.log({ deltaUB, deltaLB, deltaMinus, deltaPlus, bid, cpc, bidmod })
                    if (rule["Task"] == "Pause Target") {
                        row = pauseTarget(row, state1, ruleNumber);
                    } else if (rule["Task"] == "Modify Bid {Bid}") {
                        row = modifyBid(row, bidmod, bid, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Set Bid to {Bid}") {
                        row = setBidToFixed(row, bidmod, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x {Target ACOS}") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x Bid") {
                        row = setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "1 - (ACOS - {Target ACOS})/2) * CPC") {
                        row = setbid_1acos(row, acos, targetAcos, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x CPC") {
                        row = setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(CPC) x BidMod%") {
                        row = setBid_cpc_bidmod(row, cpc, bidmod, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "((Sales/Clicks) x {Target ACOS}) x (Bid/CPC)") {
                        row = setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Modify Bid {CPC}") {
                        row = modifyBid(row, cpcMod, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "If Modify Bid {CPC} < Bid, Use Modify Bid {Bid}") {
                        row = modifyBid_conditional(row, bidmod, cpcMod, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB)
                    } else if (rule["Task"] == "({AOV}/Clicks) x {Target ACOS}") {
                        row = setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({AOV}/(Clicks + {Est Clicks/Order})) x {Target ACOS}") {
                        row = setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    }
                } else if (/(campaign)/i.test(entity)) {
                    if (rule["Task"] == "Set to {Camp $}") {
                        row = setCampaignBudgetTo(row, campMod, spIndexesObject["Daily budget"], ruleNumber)
                    }
                    else if (rule["Task"] == "Modify {Camp $}") {
                        row = modifyCampaignBudgetTo(row, campMod, camp, spIndexesObject["Daily budget"], ruleNumber)
                    }
                } else if (/(Bidding adjustment)/i.test(entity)) {
                    //console.log({entity, task: rule["Task"]})
                    if (/(Placement top)/i.test(placement)) {
                        if (rule["Task"] == "Set to {TOS%}") {
                            row = setPercentage(row, pctMod, spIndexesObject["Percentage"], ruleNumber)
                        }
                        else if (rule["Task"] == "Modify {TOS%}") {
                            row = modifyPercentage(row, pctMod, percentage, spIndexesObject["Percentage"], ruleNumber)
                        }

                    }
                    else if (/(Placement product page)/i.test(placement)) {
                        if (rule["Task"] == "Set to {PP%}") {
                            row = setPercentage(row, pctMod, spIndexesObject["Percentage"], ruleNumber);
                            console.warn({ row });
                        }
                        else if (rule["Task"] == "Modify {PP%}") {
                            row = modifyPercentage(row, pctMod, percentage, spIndexesObject["Percentage"], ruleNumber)
                        }
                    } else if (/(Placement Rest Of Search)/i.test(placement)) {
                        if (rule["Task"] == "Set to {ROS%}") {
                            row = setPercentage(row, pctMod, spIndexesObject["Percentage"], ruleNumber)
                        }
                        else if (rule["Task"] == "Modify {ROS%}") {
                            row = modifyPercentage(row, pctMod, percentage, spIndexesObject["Percentage"], ruleNumber)
                        }
                    }
                } else if (/(Ad Group)/i.test(entity) && rule["Override Type"] == "AdGroup") {
                    deltaUB = deltaPlus == "" ? null : (bid + (bid * (deltaPlus / 100))).toFixed(4);
                    deltaLB = deltaMinus == "" ? null : (bid - (bid * (deltaMinus / 100))).toFixed(4);
                    //console.log({ deltaUB, deltaLB, deltaMinus, deltaPlus, bid, cpc, bidmod })
                    if (rule["Task"] == "Pause Target") {
                        row = pauseTarget(row, state1, ruleNumber);
                    } else if (rule["Task"] == "Modify Bid {Bid}") {
                        row = modifyBid(row, bidmod, bid, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Set Bid to {Bid}") {
                        row = setBidToFixed(row, bidmod, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x {Target ACOS}") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x Bid") {
                        row = setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x CPC") {
                        row = setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(CPC) x BidMod%") {
                        row = setBid_cpc_bidmod(row, cpc, bidmod, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "((Sales/Clicks) x {Target ACOS}) x (Bid/CPC)") {
                        row = setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Modify Bid {CPC}") {
                        row = modifyBid(row, cpcMod, cpc, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "If Modify Bid {CPC} < Bid, Use Modify Bid {Bid}") {
                        row = modifyBid_conditional(row, bidmod, cpcMod, cpc, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB)
                    } else if (rule["Task"] == "({AOV}/Clicks) x {Target ACOS}") {
                        row = setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({AOV}/(Clicks + {Est Clicks/Order})) x {Target ACOS}") {
                        row = setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, spIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    }
                }
            } catch (e) {
                console.error(e.stack)
                //SpreadsheetApp.getUi().alert("We've encountered an issue processing your request.\n\n Please double-check the inputs you provided for the rule number: \n\n" + ruleNumber + " " + rule["Task"] + "\n\n (Make sure you pay attention to the variables in the curly brackets {} within the task action. These inputs are required to perform the action)");
                var ui = SpreadsheetApp.getUi();
                var title = "Autopilot Error Details"; // Replace with your desired title
                var message = "We've encountered an issue processing your request.\n\nPlease double-check the inputs you provided for the rule number: \n\n" + ruleNumber + " " + rule["Task"] + "\n\n(Make sure you pay attention to the variables in the curly brackets {} within the task action. These inputs are required to perform the action)";
                ui.alert(title, message, ui.ButtonSet.OK);

                return [1, 1, 1];
            }
        }
    }

    for (var i = 1; i < sbcValues.length; i++) {

        row = sbcValues[i];

        state1 = sbIndexesObject["State_1"];
        state2 = row[sbIndexesObject["State_2"]];
        state3 = row[sbIndexesObject["State_3"]];
        bid = parseFloat(row[sbIndexesObject["Bid"]]);
        sales = parseFloat(row[sbIndexesObject["Sales"]]);
        spend = parseFloat(row[sbIndexesObject["Spend"]]);
        clicks = parseFloat(row[sbIndexesObject["Clicks"]]);
        acos = parseFloat(row[sbIndexesObject["Acos"]]) / 100;
        cpc = parseFloat(row[sbIndexesObject["CPC"]]);
        entity = row[sbIndexesObject["Entity"]];
        camp = parseFloat(row[sbIndexesObject["Daily budget"]]);


        const brandsTargets = [targets["Sponsored Brands - HSA"], targets["Sponsored Brands - Video"]];
        const brandsMode = ["HSA", "Video"];

        for (var j = 0; j < 2; j++) {
            if (evaluateRow("Sponsored Brands", sbIndexesObject, row, ruleConditions, brandsTargets[j], rule["PPC"], brandsMode[j])) {
                try {
                    if (/(keyword|product targeting)/i.test(entity)) {
                        deltaUB = deltaPlus == "" ? null : (bid + (bid * (deltaPlus / 100))).toFixed(4);
                        deltaLB = deltaMinus == "" ? null : (bid - (bid * (deltaMinus / 100))).toFixed(4);

                        //console//.log({ deltaUB, deltaLB, deltaMinus, deltaPlus, bid, cpc, bidmod })
                        if (rule["Task"] == "Pause Target") {
                            row = pauseTarget(row, state1, ruleNumber);
                        } else if (rule["Task"] == "Modify Bid {Bid}") {
                            row = modifyBid(row, bidmod, bid, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "Set Bid to {Bid}") {
                            row = setBidToFixed(row, bidmod, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "(Sales/Clicks) x {Target ACOS}") {
                            row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);;
                        } else if (rule["Task"] == "({Target ACOS}/ACOS) x Bid") {
                            row = setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "1 - (ACOS - {Target ACOS})/2) * CPC") {
                            row = setbid_1acos(row, acos, targetAcos, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "({Target ACOS}/ACOS) x CPC") {
                            row = setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "(CPC) x BidMod%") {
                            row = setBid_cpc_bidmod(row, cpc, bidmod, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "(Sales/Clicks) x 🎯Acos") {
                            row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "((Sales/Clicks) x {Target ACOS}) x (Bid/CPC)") {
                            row = setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "Modify Bid {CPC}") {
                            row = modifyBid(row, cpcMod, cpc, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "If Modify Bid {CPC} < Bid, Use Modify Bid {Bid}") {
                            row = modifyBid_conditional(row, bidmod, cpcMod, cpc, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB)
                        } else if (rule["Task"] == "({AOV}/Clicks) x {Target ACOS}") {
                            row = setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        } else if (rule["Task"] == "({AOV}/(Clicks + {Est Clicks/Order})) x {Target ACOS}") {
                            row = setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, sbIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                        }
                    } else if (/(campaign)/i.test(entity)) {
                        if (rule["Task"] == "Set to {Camp $}") {
                            row = setCampaignBudgetTo(row, campMod, sbIndexesObject["Daily budget"], ruleNumber)
                        }
                        else if (rule["Task"] == "Modify {Camp $}") {
                            row = modifyCampaignBudgetTo(row, campMod, camp, sbIndexesObject["Daily budget"], ruleNumber)
                        }
                    }
                } catch (e) {
                    SpreadsheetApp.getUi().alert("Oops! Something went wrong.\nWe've encountered an issue processing your request.\nPlease double-check the inputs you provided for the rule number: " + ruleNumber + " " + rule["Task"]);
                    return [1, 1, 1];
                }
            }
        }
    }

    for (var i = 1; i < sdcValues.length; i++) {

        row = sdcValues[i];

        state1 = sdIndexesObject["State_1"];
        state2 = row[sdIndexesObject["State_2"]];
        state3 = row[sdIndexesObject["State_3"]];
        bid = parseFloat(row[sdIndexesObject["Bid"]]);
        sales = parseFloat(row[sdIndexesObject["Sales"]]);
        spend = parseFloat(row[sdIndexesObject["Spend"]]);
        clicks = parseFloat(row[sdIndexesObject["Clicks"]]);
        acos = parseFloat(row[sdIndexesObject["Acos"]]) / 100;
        cpc = parseFloat(row[sdIndexesObject["CPC"]]);
        entity = row[sdIndexesObject["Entity"]];
        camp = parseFloat(row[sdIndexesObject["Daily budget"]]);


        if (evaluateRow("Sponsored Display", sdIndexesObject, row, ruleConditions, targets["Sponsored Display"], rule["PPC"])) {
            try {
                if (/(Contextual Targeting|Audience Targeting)/i.test(entity) && rule["Override Type"] != "AdGroup") {
                    deltaUB = deltaPlus == "" ? null : (bid + (bid * (deltaPlus / 100))).toFixed(4);
                    deltaLB = deltaMinus == "" ? null : (bid - (bid * (deltaMinus / 100))).toFixed(4);

                    //console//.log({ deltaUB, deltaLB, deltaMinus, deltaPlus, bid, cpc, bidmod })
                    if (rule["Task"] == "Pause Target") {
                        row = pauseTarget(row, state1, ruleNumber);
                    } else if (rule["Task"] == "Modify Bid {Bid}") {
                        row = modifyBid(row, bidmod, bid, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Set Bid to {Bid}") {
                        row = setBidToFixed(row, bidmod, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x {Target ACOS}") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);;
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x Bid") {
                        row = setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "1 - (ACOS - {Target ACOS})/2) * CPC") {
                        row = setbid_1acos(row, acos, targetAcos, cpc, spIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x CPC") {
                        row = setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(CPC) x BidMod%") {
                        row = setBid_cpc_bidmod(row, cpc, bidmod, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x 🎯Acos") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "((Sales/Clicks) x {Target ACOS}) x (Bid/CPC)") {
                        row = setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Modify Bid {CPC}") {
                        row = modifyBid(row, cpcMod, cpc, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "If Modify Bid {CPC} < Bid, Use Modify Bid {Bid}") {
                        row = modifyBid_conditional(row, bidmod, cpcMod, cpc, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB)
                    } else if (rule["Task"] == "({AOV}/Clicks) x {Target ACOS}") {
                        row = setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({AOV}/(Clicks + {Est Clicks/Order})) x {Target ACOS}") {
                        row = setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, sdIndexesObject["New Bid"], ruleNumber, deltaUB, deltaLB);
                    }
                } else if (/(campaign)/i.test(entity)) {
                    if (rule["Task"] == "Set to {Camp $}") {
                        row = setCampaignBudgetTo(row, campMod, sdIndexesObject["Daily budget"], ruleNumber)
                    }
                    else if (rule["Task"] == "Modify {Camp $}") {
                        row = modifyCampaignBudgetTo(row, campMod, camp, sdIndexesObject["Daily budget"], ruleNumber)
                    }
                } else if (/(Ad Group)/i.test(entity) && rule["Override Type"] == "AdGroup") {
                    deltaUB = deltaPlus == "" ? null : (bid + (bid * (deltaPlus / 100))).toFixed(4);
                    deltaLB = deltaMinus == "" ? null : (bid - (bid * (deltaMinus / 100))).toFixed(4);

                    //console//.log({ deltaUB, deltaLB, deltaMinus, deltaPlus, bid, cpc, bidmod })
                    if (rule["Task"] == "Pause Target") {
                        row = pauseTarget(row, state1, ruleNumber);
                    } else if (rule["Task"] == "Modify Bid {Bid}") {
                        row = modifyBid(row, bidmod, bid, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Set Bid to {Bid}") {
                        row = setBidToFixed(row, bidmod, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x {Target ACOS}") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);;
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x Bid") {
                        row = setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({Target ACOS}/ACOS) x CPC") {
                        row = setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(CPC) x BidMod%") {
                        row = setBid_cpc_bidmod(row, cpc, bidmod, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "(Sales/Clicks) x 🎯Acos") {
                        row = setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "((Sales/Clicks) x {Target ACOS}) x (Bid/CPC)") {
                        row = setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "Modify Bid {CPC}") {
                        row = modifyBid(row, cpcMod, cpc, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "If Modify Bid {CPC} < Bid, Use Modify Bid {Bid}") {
                        row = modifyBid_conditional(row, bidmod, cpcMod, cpc, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB)
                    } else if (rule["Task"] == "({AOV}/Clicks) x {Target ACOS}") {
                        row = setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    } else if (rule["Task"] == "({AOV}/(Clicks + {Est Clicks/Order})) x {Target ACOS}") {
                        row = setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, sdIndexesObject["Ad Group Default Bid"], ruleNumber, deltaUB, deltaLB);
                    }
                }
            } catch (e) {
                SpreadsheetApp.getUi().alert("Oops! Something went wrong.\nWe've encountered an issue processing your request.\nPlease double-check the inputs you provided for the rule number: " + ruleNumber + " " + rule["Task"]);
                return [1, 1, 1];
            }
        }
    }

    return [spcValues, sbcValues, sdcValues];
};

function getRuleConditions(rule, spHeaders, sbHeaders, sdHeaders) {
    var conditions = { "Sponsored Products": [], "Sponsored Brands": [], "Sponsored Display": [] };
    //console.log("here")
    var fieldMap = {
        "Old Bid": "Bid",
        "Impressions": "Impressions",
        "CTR %": "Click-through Rate",
        "Orders": "Orders",
        "Clicks": "Clicks",
        "Spend": "Spend",
        "Sales": "Sales",
        "CVR": "Conversion Rate",
        "Acos %": "Acos",
        "CPC": "CPC",
        "CPA": "CPA",
        "Org Rank": "Org Rank",
        "Rank Trend": "Rank Trend",
        "Spon Rank": "SP Rank",
        "H10SVol": "H10 SVol",
        "SQSVol": "SQ SVol",
        "SQScore": "SQ Score",
        "ImprShare %": "Impr Share",
        "ClickShare %": "Click Share",
        "PurchShare %": "Purch Share",
        "My PurchCount": "My Purch Count",
        "Tot PurchCount": "Tot Purch Count",
        "My SQCVR %": "My CVR",
        "Tot SQCVR %": "Tot CVR",
        "CVRTrend": "CVR Trend",
        "Override": "Override"
    };
    const signRegex = /[<>=]/g;
    const numberRegex = /[0-9.]/g;

    for (var field in fieldMap) {
        var spIndex = spHeaders.findIndex(element => element.toLowerCase() === fieldMap[field].toLowerCase());
        var sbIndex = sbHeaders.findIndex(element => element.toLowerCase() === fieldMap[field].toLowerCase());
        var sdIndex = sdHeaders.findIndex(element => element.toLowerCase() === fieldMap[field].toLowerCase());
        //console.log({ field })
        if (field == "Override") {
            //console.log({ field })
            if (rule["Override"] !== '' && rule["Override Type"] !== '') {
                //console.log({ override: rule["Override"] })
                const overrideTypes = {
                    Portfolio: "Portfolio Name (Informational only)",
                    Campaign: "Campaign Name (Informational only)",
                    ASIN: "ASINS",
                    Target: "Target Override",
                    AdGroup: "Ad Group Id"
                };
                const overrideHeader = overrideTypes[rule["Override Type"]];
                const override = rule[field];

                spIndex = spHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());
                sbIndex = sbHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());
                sdIndex = sdHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());

                if (overrideHeader == "Ad Group Id") {
                    sbIndex = sbHeaders.findIndex(element => element.toLowerCase() === "Ad Group Id (read only)".toLowerCase());
                }

                if (rule[field].toString().includes("\n")) {
                    var parts = rule[field].split("\n");
                    var spConditions = [spIndex], sbConditions = [sbIndex], sdConditions = [sdIndex];
                    for (var i = 0; i < parts.length; i++) {
                        spConditions.push(["==", parts[i]]);
                        sbConditions.push(["==", parts[i]]);
                        sdConditions.push(["==", parts[i]]);
                    };
                    conditions["Sponsored Products"].push(spConditions);
                    conditions["Sponsored Brands"].push(sbConditions);
                    conditions["Sponsored Display"].push(sdConditions);
                } else {
                    spIndex = spHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());
                    sbIndex = sbHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());
                    sdIndex = sdHeaders.findIndex(element => element.toLowerCase() === overrideHeader.toLowerCase());

                    conditions["Sponsored Products"].push([spIndex, "==", override]);
                    conditions["Sponsored Brands"].push([sbIndex, "==", override]);
                    conditions["Sponsored Display"].push([sdIndex, "==", override]);
                    //console.log({ spIndex, sbIndex, sdIndex, override })
                }
            }
        } else if (rule[field] !== '') {
            if (rule[field].toString().match(signRegex) === null || rule[field].toString().match(signRegex) == "=") {
                rule[field] = "==" + rule[field];
            }
            //console.log({ field }, rule[field])
            //NEW CODE//
            if (rule[field].toString().includes("&")) {
                var parts = rule[field].toString().split("&");
                var lhs = parts[0].toString();
                var rhs = parts[1].toString();
                var lhsSign = lhs.match(signRegex).join('');
                var lhsNumber = lhs.match(numberRegex).join('');
                var rhsSign = rhs.match(signRegex).join('');
                var rhsNumber = rhs.match(numberRegex).join('');
                conditions["Sponsored Products"].push([spIndex, lhsSign, lhsNumber]);
                conditions["Sponsored Brands"].push([sbIndex, lhsSign, lhsNumber]);
                conditions["Sponsored Display"].push([sdIndex, lhsSign, lhsNumber]);
                conditions["Sponsored Products"].push([spIndex, rhsSign, rhsNumber]);
                conditions["Sponsored Brands"].push([sbIndex, rhsSign, rhsNumber]);
                conditions["Sponsored Display"].push([sdIndex, rhsSign, rhsNumber]);
            } else if (rule[field].toString().includes("|")) {
                var parts = rule[field].toString().split("|");
                var lhs = parts[0].toString();
                var rhs = parts[1].toString();
                var lhsSign = lhs.match(signRegex).join('');
                var lhsNumber = lhs.match(numberRegex).join('');
                var rhsSign = rhs.match(signRegex).join('');
                var rhsNumber = rhs.match(numberRegex).join('');
                conditions["Sponsored Products"].push([spIndex, [lhsSign, lhsNumber], [rhsSign, rhsNumber]]);
                conditions["Sponsored Brands"].push([sbIndex, [lhsSign, lhsNumber], [rhsSign, rhsNumber]]);
                conditions["Sponsored Display"].push([sdIndex, [lhsSign, lhsNumber], [rhsSign, rhsNumber]]);
            } else {
                var sign = rule[field].toString().match(signRegex).join('');
                var number = rule[field].toString().match(numberRegex).join('');
                conditions["Sponsored Products"].push([spIndex, sign, number]);
                conditions["Sponsored Brands"].push([sbIndex, sign, number]);
                conditions["Sponsored Display"].push([sdIndex, sign, number]);
            }
        }
    };
    //console.log(conditions["Sponsored Products"]);
    return conditions;
};

function disectUserTargets(targets) {
    var spTargets = [], sbHSATargets = [], sbVidTargets = [], sdTargets = [];
    var targetKeys = Object.keys(targets);

    var finalTargets = {
        Exact: [false, false, false, false],
        Broad: [false, false, false, false],
        Phrase: [false, false, false, false],
        PAT: [false, false, false, false],
        Auto: [false, false, false, false],
        SKW_Exact: [false, false, false, false],
        CAT: [false, false, false, false],
        AUD: [false, false, false, false]
    };
    var finalKeys = Object.keys(finalTargets);

    targetKeys.forEach((item, index) => {
        //console.log({ item, index, selection: targets[item] })
        if (targets[item].hasOwnProperty("Exact") && targets[item]["Exact"] == true) {
            finalTargets["Exact"][index] = true;
        } if (targets[item].hasOwnProperty("Broad") && targets[item]["Broad"] == true) {
            finalTargets["Broad"][index] = true;
        } if (targets[item].hasOwnProperty("Phrase") && targets[item]["Phrase"] == true) {
            finalTargets["Phrase"][index] = true;
        } if (targets[item].hasOwnProperty("PAT") && targets[item]["PAT"] == true) {
            finalTargets["PAT"][index] = true;
        } if (targets[item].hasOwnProperty("Auto") && targets[item]["Auto"] == true) {
            finalTargets["Auto"][index] = true;
        } if (targets[item].hasOwnProperty("SKW_Exact") && targets[item]["SKW_Exact"] == true) {
            finalTargets["SKW_Exact"][index] = true;
        } if (targets[item].hasOwnProperty("CAT") && targets[item]["CAT"] == true) {
            finalTargets["CAT"][index] = true;
        } if (targets[item].hasOwnProperty("AUD") && targets[item]["AUD"] == true) {
            finalTargets["AUD"][index] = true;
        }
    });
    //console.log(finalTargets);

    for (var i = 0; i < finalKeys.length; i++) {
        for (var j = 0; j < 4; j++) {
            if (finalTargets[finalKeys[i]][j] == true) {

                if (j == 0) {
                    spTargets.push(finalKeys[i]);
                } else if (j == 1) {
                    sbHSATargets.push(finalKeys[i]);
                } else if (j == 2) {
                    sbVidTargets.push(finalKeys[i]);
                } else {
                    sdTargets.push(finalKeys[i]);
                }
            }
        }
    }
    //console.log({ spTargets, sbHSATargets, sbVidTargets, sdTargets })
    finalTargets = { "Sponsored Products": spTargets, "Sponsored Brands - HSA": sbHSATargets, "Sponsored Brands - Video": sbVidTargets, "Sponsored Display": sdTargets };
    //console.log(finalTargets);
    return finalTargets;
};

function setupBidRules(bidRulesData) {
    var rules = {};
    for (var i = 0; i < bidRulesData.length; i++) {
        if (bidRulesData[i][1] == "TRUE") {
            rules[bidRulesData[i][0]] = {
                Order: bidRulesData[i][0] || "",
                Task: bidRulesData[i][3] || "",
                PPC: bidRulesData[i][4] || "",
                Targets: {
                    SP: {
                        "SKW_Exact": bidRulesData[i][5] || "",
                        Exact: bidRulesData[i][6] || "",
                        Phrase: bidRulesData[i][7] || "",
                        Broad: bidRulesData[i][8] || "",
                        Auto: bidRulesData[i][9] || "",
                        PAT: bidRulesData[i][10] || "",
                        CAT: bidRulesData[i][11] || ""
                    },
                    SB: {
                        Exact: bidRulesData[i][12] || "",
                        Phrase: bidRulesData[i][13] || "",
                        Broad: bidRulesData[i][14] || "",
                        PAT: bidRulesData[i][15] || "",
                        CAT: bidRulesData[i][16] || ""
                    },
                    SBVid: {
                        Exact: bidRulesData[i][17] || "",
                        Phrase: bidRulesData[i][18] || "",
                        Broad: bidRulesData[i][19] || "",
                        PAT: bidRulesData[i][20] || "",
                        CAT: bidRulesData[i][21] || ""
                    },
                    SD: {
                        PAT: bidRulesData[i][22] || "",
                        AUD: bidRulesData[i][23] || ""
                    }
                },
                "Override Type": bidRulesData[i][24] || "",
                Override: bidRulesData[i][25] || "",
                "Est Clicks/Order": bidRulesData[i][27] || "",
                "AOV": bidRulesData[i][34] || "",
                "Target Acos": bidRulesData[i][35] || "",
                "cpc mod": bidRulesData[i][36] || "",
                "bid mod": bidRulesData[i][37] || "",
                "min": bidRulesData[i][38] || "",
                "max": bidRulesData[i][39] || "",
                "delta -": bidRulesData[i][40] || "",
                "delta +": bidRulesData[i][41] || "",
                "Placement mod": bidRulesData[i][42] || "",
                "campaign budget": bidRulesData[i][43] || "",
                "Old Bid": bidRulesData[i][48] || "",
                Impressions: bidRulesData[i][49] || "",
                "CTR %": bidRulesData[i][50] || "",
                Orders: bidRulesData[i][51] || "",
                Clicks: bidRulesData[i][52] || "",
                Spend: bidRulesData[i][53] || "",
                Sales: bidRulesData[i][54] || "",
                CVR: bidRulesData[i][55] || "",
                "Acos %": bidRulesData[i][56] || "",
                CPC: bidRulesData[i][57] || "",
                CPA: bidRulesData[i][58] || "",
                "Org Rank": bidRulesData[i][59] || "",
                "Rank Trend": bidRulesData[i][60] || "",
                "Spon Rank": bidRulesData[i][61] || "",
                "H10SVol": bidRulesData[i][62] || "",
                "SQSVol": bidRulesData[i][63] || "",
                "SQScore": bidRulesData[i][64] || "",
                "ImprShare %": bidRulesData[i][65] || "",
                "ClickShare %": bidRulesData[i][66] || "",
                "PurchShare %": bidRulesData[i][67] || "",
                "My PurchCount": bidRulesData[i][68] || "",
                "Tot PurchCount": bidRulesData[i][69] || "",
                "My SQCVR %": bidRulesData[i][70] || "",
                "Tot SQCVR %": bidRulesData[i][71] || "",
                "CVRTrend": bidRulesData[i][72] || ""
            };
        }
    }
    return rules;
}

function pauseTarget(row, index, ruleNumber) {
    row[index] = "paused";
    row[4] = ruleNumber;
    return row;
};

function modifyBid(row, bidmod, bid, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ bidmod, bid, index, ruleNumber })
    var bidValue = parseFloat(bidmod.match(/[0-9.-]+/g).join(""));
    var hasPercent = bidmod.includes('%');
    if (isNaN(bid)) {
        //console.log(bid)
        return row;
    }
    if (hasPercent) {
        row[index] = (bid + (bid * bidValue) / 100).toFixed(4);
    } else {
        //console.log(bid, bid, bidValue);
        row[index] = (bid + bidValue).toFixed(4);
        //console.log(bid);
    }

    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);
    row[4] = ruleNumber;
    return row;
};

function setBidToFixed(row, bidmod, index, ruleNumber, deltaUB, deltaLB) {
    var fixedBid = parseFloat(bidmod.match(/[0-9.-]+/g).join(""));
    row[index] = fixedBid;

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
};

function setBid_Rev_Clicks_TgtAcos(row, targetAcos, sales, spend, index, ruleNumber) {
    //console.log({ targetAcos, sales, spend })
    row[index] = (sales / spend * targetAcos).toFixed(4);
    row[4] = ruleNumber;
    return row;
};

function setBid_TgtAcos_Acos_bid(row, targetAcos, acos, bid, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ targetAcos, acos, bid });
    row[index] = ((targetAcos / acos) * bid).toFixed(4);

    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
};

function setBid_TgtAcos_Acos_cpc(row, targetAcos, acos, cpc, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ targetAcos, acos, cpc });
    row[index] = ((targetAcos / acos) * cpc);

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
};

function setbid_1acos(row, acos, targetAcos, cpc, index, ruleNumber, deltaUB, deltaLB) {

    //1 - (ACOS - {Target ACOS})/2) * CPC

    var tmpVal = (acos - targetAcos) / 2;
    row[index] = ((1 - tmpVal) * cpc);
    const bid = row[index - 1];
    const newBid = row[index];
    //console.log({ acos, targetAcos, cpc, tmpVal, newBid })

    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
}

function setBid_sales_clicks_TgtAcos(row, sales, clicks, targetAcos, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ sales, clicks, targetAcos });
    row[index] = ((sales / clicks) * targetAcos);

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);
    row[4] = ruleNumber;
    return row;
};

function setBid_aov_clicks_TgtAcos(row, aov, clicks, targetAcos, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ aov, clicks, targetAcos });
    row[index] = ((aov / clicks) * targetAcos);

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);
    //console.log({aov ,clicks,  targetAcos,bid, newBid })
    row[4] = ruleNumber;
    return row;
};

function setBid_aov_est_clicks_TgtAcos(row, aov, estClicksOrders, clicks, targetAcos, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ aov, clicks, targetAcos });
    denominator = clicks + parseInt(estClicksOrders, 10)
    row[index] = ((aov / denominator) * targetAcos);

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);
    //console.log({aov , estClicksOrders,clicks, denominator, targetAcos,bid, newBid })
    row[4] = ruleNumber;
    return row;
};

function setBid_cpc_bidmod(row, cpc, bidmod, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ cpc, bidmod });
    row[index] = (cpc * bidmod);

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
};

function setBid_sales_clicks_tgtAcos_bid_cpc(row, sales, clicks, targetAcos, bid, cpc, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ sales, clicks, targetAcos, bid, cpc, index });
    row[index] = (((sales / clicks) * targetAcos) * (bid / cpc)).toFixed(4);

    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    //console.log({ result: row[index], rule: row[4] });
    return row;
};

function modifyBid_conditional(row, bidmod, cpcmod, cpc, index, ruleNumber, deltaUB, deltaLB) {
    //console.log({ bidmod, cpcmod, cpc, index, ruleNumber });
    var cpcValue = parseFloat(cpcmod.match(/[0-9.-]+/g).join(""));
    var bidValue = parseFloat(bidmod.match(/[0-9.-]+/g).join(""));
    var hasPercent = cpcmod.includes('%');
    if (isNaN(cpc)) {
        //console.log(cpc)
        return row;
    }
    if (hasPercent) {
        row[index] = (cpc + (cpc * cpcValue) / 100).toFixed(4);
    } else {
        row[index] = (cpc + cpcValue).toFixed(4);
    }

    if (row[index] < row[index - 1]) {
        row[index] = (parseFloat(row[index - 1]) + parseFloat(bidValue));
    }

    const bid = row[index - 1];
    const newBid = row[index];
    row[index] = applyDeltas(bid, newBid, deltaUB, deltaLB);

    row[4] = ruleNumber;
    return row;
};

function setCampaignBudgetTo(row, campMod, index, ruleNumber) {
    var fixedBudget = parseFloat(campMod.match(/[0-9.-]+/g).join(""));
    row[index] = fixedBudget;
    row[4] = ruleNumber;
    return row;
}

function modifyCampaignBudgetTo(row, campMod, camp, index, ruleNumber) {
    //console.log({ campMod, camp, index, ruleNumber })
    var modifiedBudget = parseFloat(campMod.match(/[0-9.-]+/g).join(""));
    var hasPercent = campMod.includes('%');
    if (isNaN(camp)) {
        //console.log(bid)
        return row;
    }
    if (hasPercent) {
        row[index] = (camp + (camp * modifiedBudget) / 100).toFixed(4);
    } else {
        //console.log(bid, bid, bidValue);
        row[index] = (camp + modifiedBudget).toFixed(4);
        //console.log(bid);
    }
    row[4] = ruleNumber;
    return row;
};

function setPercentage(row, pctMod, index, ruleNumber) {
    //console.log({ pctMod, index, ruleNumber })
    var fixedpct = pctMod.match(/[0-9.-]+/g).join("");
    row[index] = parseFloat(fixedpct);
    //console.log(row[index]);
    row[4] = ruleNumber;
    return row;
}

function modifyPercentage(row, pctMod, percentage, index, ruleNumber) {
    //console.log({ pctMod, percentage, index, ruleNumber })
    var modifiedpct = parseFloat(pctMod.match(/[0-9.-]+/g).join(""));
    if (isNaN(percentage)) {
        //console.log(bid)
        return row;
    }
    row[index] = (percentage + modifiedpct).toFixed(4);
    //console.log(bid);
    row[4] = ruleNumber;
    return row;
}

module.exports = router;