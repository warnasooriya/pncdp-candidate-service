const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const Profile = require('../models/Profile');
const { getSignedUrl } = require('../services/StorageService');
const { ObjectId } = require('mongoose').Types;

// LIKE OPERATIONS

// Toggle like on a post
exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, likeType = 'like' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user already liked this post
    const existingLike = await Like.findOne({ userId, postId });

    if (existingLike) {
      // Unlike the post
      await Like.deleteOne({ _id: existingLike._id });
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();

      res.status(200).json({ 
        message: 'Post unliked successfully',
        isLiked: false,
        likesCount: post.likesCount
      });
    } else {
      // Like the post
      const newLike = new Like({
        userId,
        postId,
        likeType
      });
      await newLike.save();

      post.likesCount += 1;
      await post.save();

      res.status(200).json({ 
        message: 'Post liked successfully',
        isLiked: true,
        likeType,
        likesCount: post.likesCount
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Get likes for a post
exports.getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;

    const likes = await Like.find({ postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data for likes
    const populatedLikes = await Promise.all(likes.map(async (like) => {
      const userProfile = await Profile.findOne({ userId: like.userId })
        .select('fullName profileImage headline');
      
      return {
        ...like,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        }
      };
    }));

    res.status(200).json({
      likes: populatedLikes,
      pagination: {
        currentPage: parseInt(page),
        hasMore: populatedLikes.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching post likes:', error);
    res.status(500).json({ error: 'Failed to fetch post likes' });
  }
};

// COMMENT OPERATIONS

// Add a comment to a post
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content, parentCommentId = null, mentions = [] } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If it's a reply, check if parent comment exists
    let isReply = false;
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || !parentComment.isActive) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      isReply = true;
    }

    const newComment = new Comment({
      userId,
      postId,
      content,
      parentCommentId,
      isReply,
      mentions
    });

    await newComment.save();

    // Update counts
    if (isReply && parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    }
    post.commentsCount += 1;
    await post.save();

    // Populate user data for response
    const userProfile = await Profile.findOne({ userId })
      .select('fullName profileImage headline');

    const populatedComment = {
      ...newComment.toObject(),
      user: {
        fullName: userProfile?.fullName || 'Unknown User',
        profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
        headline: userProfile?.headline || '',
      }
    };

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Get comments for a post
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;
    
    const skip = (page - 1) * limit;

    // Build sort criteria
    let sortCriteria = { createdAt: -1 }; // newest first
    if (sortBy === 'oldest') {
      sortCriteria = { createdAt: 1 };
    } else if (sortBy === 'popular') {
      sortCriteria = { likesCount: -1, createdAt: -1 };
    }

    // Get top-level comments (not replies)
    const comments = await Comment.find({ 
      postId, 
      isActive: true,
      parentCommentId: null 
    })
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data and replies for each comment
    const populatedComments = await Promise.all(comments.map(async (comment) => {
      const userProfile = await Profile.findOne({ userId: comment.userId })
        .select('fullName profileImage headline');
      
      // Get replies for this comment (limit to 3 initially)
      const replies = await Comment.find({ 
        parentCommentId: comment._id, 
        isActive: true 
      })
        .sort({ createdAt: 1 })
        .limit(3)
        .lean();

      // Populate reply user data
      const populatedReplies = await Promise.all(replies.map(async (reply) => {
        const replyUserProfile = await Profile.findOne({ userId: reply.userId })
          .select('fullName profileImage');
        return {
          ...reply,
          user: {
            fullName: replyUserProfile?.fullName || 'Unknown User',
            profileImage: replyUserProfile?.profileImage ? await getSignedUrl(replyUserProfile.profileImage) : null,
          }
        };
      }));

      return {
        ...comment,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        },
        replies: populatedReplies,
        hasMoreReplies: comment.repliesCount > 3
      };
    }));

    res.status(200).json({
      comments: populatedComments,
      pagination: {
        currentPage: parseInt(page),
        hasMore: populatedComments.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching post comments:', error);
    res.status(500).json({ error: 'Failed to fetch post comments' });
  }
};

// Get replies for a comment
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;

    const replies = await Comment.find({ 
      parentCommentId: commentId, 
      isActive: true 
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data for replies
    const populatedReplies = await Promise.all(replies.map(async (reply) => {
      const userProfile = await Profile.findOne({ userId: reply.userId })
        .select('fullName profileImage headline');
      
      return {
        ...reply,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        }
      };
    }));

    res.status(200).json({
      replies: populatedReplies,
      pagination: {
        currentPage: parseInt(page),
        hasMore: populatedReplies.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    res.status(500).json({ error: 'Failed to fetch comment replies' });
  }
};

// Update a comment
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, content } = req.body;

    const comment = await Comment.findById(commentId);
    
    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this comment' });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    res.status(200).json({ message: 'Comment updated successfully', comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    const comment = await Comment.findById(commentId);
    
    if (!comment || !comment.isActive) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    // Soft delete
    comment.isActive = false;
    await comment.save();

    // Update post comment count
    const post = await Post.findById(comment.postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    // Update parent comment reply count if it's a reply
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, { 
        $inc: { repliesCount: -1 } 
      });
    }

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// SHARE OPERATIONS

// Share a post
exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, shareComment = null, shareType = 'direct', privacy = 'public' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const originalPost = await Post.findById(postId);
    if (!originalPost || !originalPost.isActive) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user can access the post
    if (originalPost.privacy === 'private' && originalPost.userId !== userId) {
      return res.status(403).json({ error: 'Cannot share private post' });
    }

    let sharedPostId = null;

    // If sharing with comment, create a new post
    if (shareType === 'with_comment' && shareComment) {
      const sharedPost = new Post({
        userId,
        content: shareComment,
        privacy,
        originalPost: postId,
        isShared: true,
        shareComment
      });
      await sharedPost.save();
      sharedPostId = sharedPost._id;
    }

    // Create share record
    const newShare = new Share({
      userId,
      originalPostId: postId,
      sharedPostId,
      shareComment,
      shareType,
      privacy
    });

    await newShare.save();

    // Update original post share count
    originalPost.sharesCount += 1;
    await originalPost.save();

    res.status(201).json({ 
      message: 'Post shared successfully',
      share: newShare,
      sharedPostId
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ error: 'Failed to share post' });
  }
};

// Get shares for a post
exports.getPostShares = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;

    const shares = await Share.find({ originalPostId: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data for shares
    const populatedShares = await Promise.all(shares.map(async (share) => {
      const userProfile = await Profile.findOne({ userId: share.userId })
        .select('fullName profileImage headline');
      
      return {
        ...share,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        }
      };
    }));

    res.status(200).json({
      shares: populatedShares,
      pagination: {
        currentPage: parseInt(page),
        hasMore: populatedShares.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching post shares:', error);
    res.status(500).json({ error: 'Failed to fetch post shares' });
  }
};

module.exports = exports;