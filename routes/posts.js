const express = require('express');
const router = express.Router();
const PostController = require('../controllers/PostController');
const PostInteractionController = require('../controllers/PostInteractionController');
const { upload } = require('../services/StorageService');

// POST CRUD OPERATIONS

// Create a new post
router.post('/', upload.single('media'), PostController.createPost);

// Get feed posts (with pagination and filters)
router.get('/feed', PostController.getFeedPosts);

// Get posts by user
router.get('/user/:userId', PostController.getUserPosts);

// Get a specific post
router.get('/:postId', PostController.getPost);

// Update a post
router.put('/:postId', upload.single('media'), PostController.updatePost);

// Delete a post
router.delete('/:postId', PostController.deletePost);

// LIKE OPERATIONS

// Toggle like on a post
router.post('/:postId/like', PostInteractionController.toggleLike);

// Get likes for a post
router.get('/:postId/likes', PostInteractionController.getPostLikes);

// COMMENT OPERATIONS

// Add a comment to a post
router.post('/:postId/comments', PostInteractionController.addComment);

// Get comments for a post
router.get('/:postId/comments', PostInteractionController.getPostComments);

// Get replies for a comment
router.get('/comments/:commentId/replies', PostInteractionController.getCommentReplies);

// Update a comment
router.put('/comments/:commentId', PostInteractionController.updateComment);

// Delete a comment
router.delete('/comments/:commentId', PostInteractionController.deleteComment);

// SHARE OPERATIONS

// Share a post
router.post('/:postId/share', PostInteractionController.sharePost);

// Get shares for a post
router.get('/:postId/shares', PostInteractionController.getPostShares);

module.exports = router;