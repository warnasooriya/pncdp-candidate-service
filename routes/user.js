const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.put('/', userController.syncUserWithBackend);
router.put('/role', userController.updateUserRole);


module.exports = router;
