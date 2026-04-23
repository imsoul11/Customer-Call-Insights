const express = require('express');
const {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
} = require('../Controller/userController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAllUsers);
router.post('/', requireRole('admin'), createUser);
router.patch('/:eid/role', requireRole('admin'), updateUserRole);
router.delete('/:eid', requireRole('admin'), deleteUser);

module.exports = router;
