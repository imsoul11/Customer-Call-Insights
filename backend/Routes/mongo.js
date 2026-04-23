const express = require('express');
const router = express.Router();
const { allData } = require('../Controller/mongoController');

// Route to get all data
router.get('/all', allData);

module.exports = router;
