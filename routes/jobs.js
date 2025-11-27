const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/JobsController');

router.get('/', jobsController.getFutureJobs);


const  {upload} =  require('../services/StorageService');
const uploadResume = upload.fields([{ name: 'resume', maxCount: 1 }]);

router.post('/apply', (req, res, next) => {
  uploadResume(req, res, (err) => {
    if (err) {
      console.error('S3 upload error:', err);
      return res.status(500).json({ error: 'Failed to upload resume', details: err.message || String(err) });
    }
    if (!req.files || !req.files.resume || req.files.resume.length === 0) {
      console.error('No resume file received in request');
      return res.status(400).json({ error: 'Resume is required' });
    }
    next();
  });
}, jobsController.applyForJob);

module.exports = router;
