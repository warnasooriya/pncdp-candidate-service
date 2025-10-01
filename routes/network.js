const express = require('express');
const router = express.Router();
const networkController = require('../controllers/NetworkController');

// Get connections by category (connections, pending, sent, suggestions)
router.get('/:category/:id', networkController.getConnections);
router.get('/contacts/:id', networkController.getContacts);

// Connection management
router.post('/request', networkController.sendConnectionRequest);
router.put('/accept/:connectionId', networkController.acceptConnectionRequest);
router.put('/decline/:connectionId', networkController.declineConnectionRequest);
router.delete('/remove/:connectionId', networkController.removeConnection);

// Get connection status between two users
router.get('/status/:userId/:targetUserId', networkController.getConnectionStatus);

// Get batch connection statuses for multiple users
router.post('/status/batch', networkController.getBatchConnectionStatus);

// Get connected user profile
router.get('/profile/:userId/:targetUserId', networkController.getConnectedUserProfile);

module.exports = router;