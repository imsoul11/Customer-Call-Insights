const express = require('express');
const { importFirebaseData } = require('../Controller/migrationController');

const router = express.Router();

router.post('/firebase', importFirebaseData);

module.exports = router;
