const express = require('express');
const { login, getSession, logout } = require('../Controller/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/session', requireAuth, getSession);
router.post('/logout', logout);

module.exports = router;
