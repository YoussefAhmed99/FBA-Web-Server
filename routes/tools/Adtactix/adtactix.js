const express = require('express');
const router = express.Router();

// Require other modules or routers if necessary
const autopilot = require('./autopilot');

// Set up RankSpy-related routes
router.use('/autopilot', autopilot);

// Export the router
module.exports = router;