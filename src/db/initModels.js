var usersAuthDataModel = require("./Models/usersAuthData");
var collectionsIndicesModel = require("./Models/collectionsIndices");
var disabledCopiesModel = require("./Models/disabledCopies");
var registeredCopiesModel = require("./Models/registeredCopiesModel");

const initModels = {
    init: function () { // Corrected method definition
        return Promise.all([
            usersAuthDataModel.init(),
            collectionsIndicesModel.init(),
            disabledCopiesModel.init(),
            registeredCopiesModel.init()
        ]);
    }
};

module.exports = initModels;
