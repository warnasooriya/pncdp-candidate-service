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

router.put('/about', profileController.updateAbout);
router.put('/experiences', profileController.updateExperiences);   
router.put('/education', profileController.updateEducation);   
router.put("/skills", profileController.updateSkills);
router.put("/certifications", profileController.updateCertifications);
router.put("/portfolio", profileController.updatePortfolio);

module.exports = router;
