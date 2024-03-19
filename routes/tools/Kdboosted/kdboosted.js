const express = require('express');
const router = express.Router();

// Require other modules or routers if necessary
const buildmenu = require('./buildmenu');

// Set up RankSpy-related routes
router.use('/buildmenu', buildmenu);

// Export the router
module.exports = router;