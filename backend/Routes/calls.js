const express = require('express');
const { getAllCalls, getCallDetail } = require('../Controller/callController');

const router = express.Router();

router.get('/', getAllCalls);
router.get('/:cid', getCallDetail);

module.exports = router;
