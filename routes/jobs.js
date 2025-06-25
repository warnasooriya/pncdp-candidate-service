const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/JobsController');

router.get('/', jobsController.getFutureJobs);


module.exports = router;