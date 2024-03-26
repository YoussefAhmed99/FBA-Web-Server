const express = require('express');
const router = express.Router();
const usersAuthDataModel = require('../../db/Models/usersAuthData');

router.post('/', async (req, res) => {
    const userData = req.body;
    try {
        await usersAuthDataModel.insertOrUpdateUsers(userData);
        res.status(200).send('Update successful');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error updating users data');
    }
});

module.exports = router;
