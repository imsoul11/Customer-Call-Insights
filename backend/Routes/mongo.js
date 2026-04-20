const express = require('express');
const router = express.Router();
const { allData, eidData, deleteAllData, insertBulkData } = require('../Controller/mongoController');

// Route to get all data
router.get('/all', allData);

// Route to get data by EID
router.get('/eid', eidData);

// Route to delete all data from the collection
router.delete('/deleteAll', deleteAllData);

// Route to insert 50 new documents with 'cid' field
router.post('/insertBulk', insertBulkData);

module.exports = router;
