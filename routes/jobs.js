const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/JobsController');

router.get('/', jobsController.getFutureJobs);


const  {upload} =  require('../services/StorageService');
router.post('/apply', upload.fields([
  { name: 'resume', maxCount: 1 },
]), jobsController.applyForJob);

module.exports = router;