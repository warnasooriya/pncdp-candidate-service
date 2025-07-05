const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/NetworkController');

router.get('/connections/:id', jobsController.getConnections);
router.get('/contacts/:id', jobsController.getContacts);

module.exports = router;