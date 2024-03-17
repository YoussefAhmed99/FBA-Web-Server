const express = require('express');
const router = express.Router();

// Require other modules or routers if necessary
const rainForest = require('./rainForest');

// Set up RankSpy-related routes
router.use('/rainforest', rainForest);

// Export the router
module.exports = router;
