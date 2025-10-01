const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activityController');

// Get user activities
router.get('/user/:userId', ActivityController.getUserActivities);

// Create a new activity
router.post('/', ActivityController.createActivity);

// Get connection count for a user
router.get('/connections/count/:userId', ActivityController.getConnectionCount);

// Get mutual connections between two users
router.get('/connections/mutual/:userId/:otherUserId', ActivityController.getMutualConnections);

module.exports = router;