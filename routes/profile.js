const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
 
 

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

const  {upload} =  require('../services/StorageService');
router.post('/upload', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
]), profileController.uploadImages);

module.exports = router;
