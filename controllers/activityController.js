const Activity = require('../models/Activity');
const Profile = require('../models/Profile');
const Connection = require('../models/Connection');
const { getSignedUrl } = require('../services/StorageService');
 

// Get user activities
exports.getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const requestingUserId = req.query.requestingUserId;
    
    const skip = (page - 1) * limit;

    // Determine privacy filter based on relationship
    let privacyFilter = ['public'];
    
    if (requestingUserId === userId) {
      // User viewing their own activities
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

    const activities = await Activity.find({
      userId,
      isVisible: true,
      privacy: { $in: privacyFilter }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get user profile for activity display
    const userProfile = await Profile.findOne({ userId })
      .select('fullName profileImage headline');

    const enrichedActivities = activities.map(activity => ({
      ...activity,
      user: {
        fullName: userProfile?.fullName || 'Unknown User',
        profileImage: userProfile?.profileImage ? getSignedUrl(userProfile.profileImage) : null,
        headline: userProfile?.headline || '',
      },
      timeAgo: getTimeAgo(activity.createdAt)
    }));

    res.status(200).json({
      activities: enrichedActivities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(await Activity.countDocuments({
          userId,
          isVisible: true,
          privacy: { $in: privacyFilter }
        }) / limit),
        hasMore: enrichedActivities.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
};

// Create a new activity
exports.createActivity = async (req, res) => {
  try {
    const {
      userId,
      activityType,
      description,
      relatedEntityId,
      relatedEntityType,
      metadata = {},
      privacy = 'public'
    } = req.body;

    if (!userId || !activityType || !description) {
      return res.status(400).json({ error: 'User ID, activity type, and description are required' });
    }

    const activity = new Activity({
      userId,
      activityType,
      description,
      relatedEntityId,
      relatedEntityType,
      metadata,
      privacy
    });

    await activity.save();

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

// Get connection count for a user
exports.getConnectionCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const connectionCount = await Connection.countDocuments({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });

    res.status(200).json({ connectionCount });
  } catch (error) {
    console.error('Error fetching connection count:', error);
    res.status(500).json({ error: 'Failed to fetch connection count' });
  }
};

// Get mutual connections between two users
exports.getMutualConnections = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    // Get connections for both users
    const userConnections = await Connection.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    }).lean();

    const profile = await Profile.findById(otherUserId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const otherUserConnections = await Connection.find({
      $or: [
        { requester: profile.userId, status: 'accepted' },
        { recipient: profile.userId, status: 'accepted' }
      ]
    }).lean();

    // Extract connection IDs
    const userConnectionIds = new Set();
    userConnections.forEach(conn => {
      userConnectionIds.add(conn.requester === userId ? conn.recipient : conn.requester);
    });

    const otherUserConnectionIds = new Set();
    otherUserConnections.forEach(conn => {
      otherUserConnectionIds.add(conn.requester === profile.userId ? conn.recipient : conn.requester);
    });

    // Find mutual connections
    const mutualConnectionIds = [...userConnectionIds].filter(id => otherUserConnectionIds.has(id));

    // Get profiles for mutual connections
    const mutualConnections = await Profile.find({
      userId: { $in: mutualConnectionIds }
    })
      .select('userId fullName profileImage headline')
      .lean();

    const enrichedMutualConnections = mutualConnections.map(profile => ({
      ...profile,
      profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
    }));

    // get other connections 
    // get other connections ids
    const otherUserConnectionIdsList = [...otherUserConnectionIds].filter(id => id !== userId && !mutualConnectionIds.includes(id));

    const otherUserConnectionsProfiles = await Profile.find({
      userId: { $in: otherUserConnectionIdsList }
    }).select('userId fullName profileImage headline')
      .lean();

    const otherConnections = otherUserConnectionsProfiles.map(profile => ({
      ...profile,
      profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
    }));




    res.status(200).json({
      mutualConnections: enrichedMutualConnections,
      otherConnections,
    });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    res.status(500).json({ error: 'Failed to fetch mutual connections' });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}