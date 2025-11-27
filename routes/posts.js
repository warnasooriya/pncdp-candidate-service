const express = require('express');
const router = express.Router();
const PostController = require('../controllers/PostController');
const PostInteractionController = require('../controllers/PostInteractionController');
const { upload } = require('../services/StorageService');

// POST CRUD OPERATIONS

// Create a new post with robust upload error handling
const uploadMediaSingle = upload.single('media');
router.post('/', (req, res, next) => {
  uploadMediaSingle(req, res, (err) => {
    if (err) {
      console.error('S3 upload error (create post):', err);
      return res.status(500).json({ error: 'Failed to upload media', details: err.message || String(err) });
    }
    next();
  });
}, PostController.createPost);

// Get feed posts (with pagination and filters)
router.get('/feed', PostController.getFeedPosts);

// Get posts by user
router.get('/user/:userId', PostController.getUserPosts);

// Get a specific post
router.get('/:postId', PostController.getPost);

// Update a post with robust upload error handling
router.put('/:postId', (req, res, next) => {
  uploadMediaSingle(req, res, (err) => {
    if (err) {
      console.error('S3 upload error (update post):', err);
      return res.status(500).json({ error: 'Failed to upload media', details: err.message || String(err) });
    }
    next();
  });
}, PostController.updatePost);

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
