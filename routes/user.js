const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.put('/', userController.syncUserWithBackend);
router.put('/role', userController.updateUserRole);
router.put('/cognito-attributes', userController.adminUpdateCognitoAttributes);
router.post('/sync-cognito', userController.syncProfilesToCognito);


module.exports = router;
