const express = require('express');
const { getAllUsers } = require('../Controller/userController');

const router = express.Router();

router.get('/', getAllUsers);

module.exports = router;
