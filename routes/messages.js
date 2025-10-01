const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');

// Send a message
router.post('/send', MessageController.sendMessage);

// Get conversations for a user
router.get('/conversations/:userId', MessageController.getConversations);

// Get messages in a conversation
router.get('/conversation/:conversationId', MessageController.getMessages);

// Mark messages as read
router.put('/conversation/:conversationId/read', MessageController.markMessagesAsRead);

// Delete a message
router.delete('/:messageId', MessageController.deleteMessage);

// Edit a message
router.put('/:messageId', MessageController.editMessage);

// Get unread message count for user
router.get('/unread-count/:userId', MessageController.getUnreadCount);

module.exports = router;