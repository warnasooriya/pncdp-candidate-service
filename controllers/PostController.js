const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const Profile = require('../models/Profile');
const Connection = require('../models/Connection');
const { getSignedUrl } = require('../services/StorageService');
const { ObjectId } = require('mongoose').Types;

// Create a new post
exports.createPost = async (req, res) => {
  try {
    let { userId, content, privacy = 'public', hashtags = [], mentions = [] } = req.body;
    
    // Parse hashtags and mentions if they come as JSON strings from FormData
    if (typeof hashtags === 'string') {
      try {
        hashtags = JSON.parse(hashtags);
      } catch (e) {
        hashtags = [];
      }
    }
    
    if (typeof mentions === 'string') {
      try {
        mentions = JSON.parse(mentions);
      } catch (e) {
        mentions = [];
      }
    }
    
    // Ensure hashtags and mentions are arrays
    hashtags = Array.isArray(hashtags) ? hashtags : [];
    mentions = Array.isArray(mentions) ? mentions : [];
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }

    let mediaUrl = null;
    let mediaType = 'none';
    let mediaFileName = null;

    // Handle media upload if present
    if (req.file && req.file.key) {
      const mediaFile = req.file;
      mediaUrl = mediaFile.key; // S3 key
      mediaFileName = mediaFile.originalname;
      
      // Determine media type based on file
      if (mediaFile.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (mediaFile.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else {
        mediaType = 'document';
      }
    }

    const newPost = new Post({
      userId,
      content,
      mediaType,
      mediaUrl,
      mediaFileName,
      privacy,
      hashtags: hashtags.map(tag => tag.toLowerCase().replace('#', '')),
      mentions,
    });

    await newPost.save();

    // Populate user data for response
    const populatedPost = await Post.findById(newPost._id).lean();
    const userProfile = await Profile.findOne({ userId }).select('fullName profileImage headline');
    
    const responsePost = {
      ...populatedPost,
      user: {
        fullName: userProfile?.fullName || 'Unknown User',
        profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
        headline: userProfile?.headline || '',
      },
      mediaUrl: mediaUrl ? await getSignedUrl(mediaUrl) : null,
    };

    res.status(201).json(responsePost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Get feed posts for a user
exports.getFeedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, privacy = 'public' , userId} = req.query;

    const skip = (page - 1) * limit;

    // Get user's connections for personalized feed
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });

    
    const connectedUserIds = connections.map(conn => 
      conn.requester === userId ? conn.recipient : conn.requester
    );

    
    // Include user's own posts and connections' posts
    const feedUserIds = [userId, ...connectedUserIds];

    

    // Build query based on privacy settings
    let query = {
      isActive: true,
      userId: { $in: feedUserIds }
    };

    if (privacy === 'public') {
      query.privacy = { $in: ['public'] };
    } else if (privacy === 'connections') {
      query.privacy = { $in: ['public', 'connections'] };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data and media URLs
    const populatedPosts = await Promise.all(posts.map(async (post) => {
      const userProfile = await Profile.findOne({ userId: post.userId })
        .select('fullName profileImage headline');
      
      // Get user's like status for this post
      const userLike = await Like.findOne({ userId, postId: post._id });
      
      // Get recent comments (limit to 3 for feed)
      const recentComments = await Comment.find({ 
        postId: post._id, 
        isActive: true,
        parentCommentId: null 
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      // Populate comment user data
      const populatedComments = await Promise.all(recentComments.map(async (comment) => {
        const commentUser = await Profile.findOne({ userId: comment.userId })
          .select('fullName profileImage');
        return {
          ...comment,
          user: {
            fullName: commentUser?.fullName || 'Unknown User',
            profileImage: commentUser?.profileImage ? await getSignedUrl(commentUser.profileImage) : null,
          }
        };
      }));

      return {
        ...post,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        },
        mediaUrl: post.mediaUrl ? await getSignedUrl(post.mediaUrl) : null,
        isLikedByUser: !!userLike,
        userLikeType: userLike?.likeType || null,
        recentComments: populatedComments,
      };
    }));

    res.status(200).json({
      posts: populatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(await Post.countDocuments(query) / limit),
        hasMore: populatedPosts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ error: 'Failed to fetch feed posts' });
  }
};

// Get posts by user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const requestingUserId = req.query.requestingUserId;
    
    const skip = (page - 1) * limit;

    // Determine privacy filter based on relationship
    let privacyFilter = ['public'];
    
    if (requestingUserId === userId) {
      // User viewing their own posts
      privacyFilter = ['public', 'connections', 'private'];
    } else if (requestingUserId) {
      // Check if users are connected
      const connection = await Connection.findOne({
        $or: [
          { requester: requestingUserId, recipient: userId, status: 'accepted' },
          { requester: userId, recipient: requestingUserId, status: 'accepted' }
        ]
      });
      
      if (connection) {
        privacyFilter = ['public', 'connections'];
      }
    }

    const posts = await Post.find({
      userId,
      isActive: true,
      privacy: { $in: privacyFilter }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user data and engagement info
    const populatedPosts = await Promise.all(posts.map(async (post) => {
      const userProfile = await Profile.findOne({ userId: post.userId })
        .select('fullName profileImage headline');
      
      const userLike = requestingUserId ? 
        await Like.findOne({ userId: requestingUserId, postId: post._id }) : null;

      return {
        ...post,
        user: {
          fullName: userProfile?.fullName || 'Unknown User',
          profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
          headline: userProfile?.headline || '',
        },
        mediaUrl: post.mediaUrl ? await getSignedUrl(post.mediaUrl) : null,
        isLikedByUser: !!userLike,
        userLikeType: userLike?.likeType || null,
      };
    }));

    res.status(200).json({
      posts: populatedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(await Post.countDocuments({
          userId,
          isActive: true,
          privacy: { $in: privacyFilter }
        }) / limit),
        hasMore: populatedPosts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    let { userId, content, privacy, hashtags } = req.body;
    
    // Parse hashtags if it comes as JSON string from FormData
    if (typeof hashtags === 'string') {
      try {
        hashtags = JSON.parse(hashtags);
      } catch (e) {
        hashtags = [];
      }
    }

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this post' });
    }

    // Update fields
    if (content !== undefined) post.content = content;
    if (privacy !== undefined) post.privacy = privacy;
    if (hashtags !== undefined && Array.isArray(hashtags)) {
      post.hashtags = hashtags.map(tag => tag.toLowerCase().replace('#', ''));
    }

    // Handle media upload if present
    if (req.file) {
      const mediaFile = req.file;
      post.mediaUrl = mediaFile.key; // S3 key
      post.mediaFileName = mediaFile.originalname;
      
      // Determine media type based on file
      if (mediaFile.mimetype.startsWith('image/')) {
        post.mediaType = 'image';
      } else if (mediaFile.mimetype.startsWith('video/')) {
        post.mediaType = 'video';
      } else {
        post.mediaType = 'document';
      }
    }

    await post.save();

    res.status(200).json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Get a single post with full details
exports.getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    const post = await Post.findById(postId).lean();
    
    if (!post || !post.isActive) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check privacy permissions
    if (post.privacy === 'private' && post.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (post.privacy === 'connections' && post.userId !== userId) {
      const connection = await Connection.findOne({
        $or: [
          { requester: userId, recipient: post.userId, status: 'accepted' },
          { requester: post.userId, recipient: userId, status: 'accepted' }
        ]
      });
      
      if (!connection) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Populate full post data
    const userProfile = await Profile.findOne({ userId: post.userId })
      .select('fullName profileImage headline');
    
    const userLike = userId ? 
      await Like.findOne({ userId, postId: post._id }) : null;

    const populatedPost = {
      ...post,
      user: {
        fullName: userProfile?.fullName || 'Unknown User',
        profileImage: userProfile?.profileImage ? await getSignedUrl(userProfile.profileImage) : null,
        headline: userProfile?.headline || '',
      },
      mediaUrl: post.mediaUrl ? await getSignedUrl(post.mediaUrl) : null,
      isLikedByUser: !!userLike,
      userLikeType: userLike?.likeType || null,
    };

    res.status(200).json(populatedPost);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

module.exports = exports;