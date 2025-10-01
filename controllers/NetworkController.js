const Profile = require("../models/Profile");
const Connection = require("../models/Connection");
const { getSignedUrl } = require('../services/StorageService');
const { ObjectId } = require('mongodb');

// Get all connections based on category
exports.getConnections = async (req, res) => {
    try {
        const userId = req.params.id;
        const category = req.params.category || 'connections';

        let result = [];

        switch (category) {
            case 'connections':
                // Get accepted connections
                result = await getAcceptedConnections(userId);
                break;
            case 'pending':
                // Get pending connection requests (received)
                result = await getPendingRequests(userId);
                break;
            case 'sent':
                // Get sent connection requests
                result = await getSentRequests(userId);
                break;
            case 'suggestions':
                // Get connection suggestions (users not connected)
                result = await getConnectionSuggestions(userId);
                break;
            default:
                result = await getConnectionSuggestions(userId);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: 'Failed to fetch connections' });
    }
};

// Send connection request
exports.sendConnectionRequest = async (req, res) => {
    try {
        const { requesterId, recipientId, message } = req.body;

        if (!requesterId || !recipientId) {
            return res.status(400).json({ error: 'Requester and recipient IDs are required' });
        }

        // Check if profiles exist
        const requesterProfile = await Profile.findOne({ userId: requesterId });
        const recipientProfile = await Profile.findById(recipientId);

        if (!requesterProfile || !recipientProfile) {
            return res.status(404).json({ error: 'Requester or recipient profile not found' });
        }

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { requester: requesterProfile.userId, recipient: recipientProfile.userId },
                { requester: recipientProfile.userId, recipient: requesterProfile.userId }
            ]
        });

        if (existingConnection) {
            return res.status(400).json({ error: 'Connection request already exists' });
        }

        // Check if trying to connect to self
        if (requesterId === recipientId) {
            return res.status(400).json({ error: 'Cannot connect to yourself' });
        }

        const newConnection = new Connection({
            requester: requesterProfile.userId,
            recipient: recipientProfile.userId,
            requestMessage: message || '',
            status: 'pending'
        });

        await newConnection.save();
        res.status(201).json({ message: 'Connection request sent successfully', connection: newConnection });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ error: 'Failed to send connection request' });
    }
};

// Accept connection request
exports.acceptConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { userId } = req.body;

        const connection = await Connection.findById(connectionId);
        
        if (!connection) {
            return res.status(404).json({ error: 'Connection request not found' });
        }

        if (connection.recipient !== userId) {
            return res.status(403).json({ error: 'Unauthorized to accept this request' });
        }

        if (connection.status !== 'pending') {
            return res.status(400).json({ error: 'Connection request is not pending' });
        }

        connection.status = 'accepted';
        connection.connectionDate = new Date();
        await connection.save();

        res.status(200).json({ message: 'Connection request accepted', connection });
    } catch (error) {
        console.error('Error accepting connection request:', error);
        res.status(500).json({ error: 'Failed to accept connection request' });
    }
};

// Decline connection request
exports.declineConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { userId } = req.body;

        const connection = await Connection.findById(connectionId);
        
        if (!connection) {
            return res.status(404).json({ error: 'Connection request not found' });
        }

        if (connection.recipient !== userId) {
            return res.status(403).json({ error: 'Unauthorized to decline this request' });
        }

        if (connection.status !== 'pending') {
            return res.status(400).json({ error: 'Connection request is not pending' });
        }

        connection.status = 'declined';
        await connection.save();

        res.status(200).json({ message: 'Connection request declined', connection });
    } catch (error) {
        console.error('Error declining connection request:', error);
        res.status(500).json({ error: 'Failed to decline connection request' });
    }
};

// Remove connection
exports.removeConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { userId } = req.body;

        const connection = await Connection.findById(connectionId);
        
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        if (connection.requester !== userId && connection.recipient !== userId) {
            return res.status(403).json({ error: 'Unauthorized to remove this connection' });
        }

        await Connection.findByIdAndDelete(connectionId);
        res.status(200).json({ message: 'Connection removed successfully' });
    } catch (error) {
        console.error('Error removing connection:', error);
        res.status(500).json({ error: 'Failed to remove connection' });
    }
};

// Get connection status between two users
exports.getConnectionStatus = async (req, res) => {
    try {
        const { userId, targetUserId } = req.params;

        const connection = await Connection.findOne({
            $or: [
                { requester: userId, recipient: targetUserId },
                { requester: targetUserId, recipient: userId }
            ]
        });

        if (!connection) {
            return res.status(200).json({ status: 'none', canConnect: true });
        }

        const isRequester = connection.requester === userId;
        
        res.status(200).json({
            status: connection.status,
            connectionId: connection._id,
            isRequester,
            canConnect: false,
            connectionDate: connection.connectionDate,
            requestMessage: connection.requestMessage
        });
    } catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ error: 'Failed to get connection status' });
    }
};

// Get batch connection statuses for multiple users
exports.getBatchConnectionStatus = async (req, res) => {
    try {
        const { userId, targetUserIds } = req.body;

        if (!userId || !targetUserIds || !Array.isArray(targetUserIds)) {
            return res.status(400).json({ error: 'userId and targetUserIds array are required' });
        }

        // Find all connections involving the user and target users
        const connections = await Connection.find({
            $or: [
                { requester: userId, recipient: { $in: targetUserIds } },
                { requester: { $in: targetUserIds }, recipient: userId }
            ]
        });

        // Create a map of connection statuses
        const statusMap = {};
        
        // Initialize all target users with 'none' status
        targetUserIds.forEach(targetUserId => {
            statusMap[targetUserId] = {
                status: 'none',
                canConnect: true,
                isRequester: false,
                connectionId: null,
                connectionDate: null,
                requestMessage: null
            };
        });

        // Update with actual connection data
        connections.forEach(connection => {
            const targetUserId = connection.requester === userId ? connection.recipient : connection.requester;
            const isRequester = connection.requester === userId;
            
            statusMap[targetUserId] = {
                status: connection.status,
                connectionId: connection._id,
                isRequester,
                canConnect: false,
                connectionDate: connection.connectionDate,
                requestMessage: connection.requestMessage
            };
        });

        res.status(200).json({ statuses: statusMap });
    } catch (error) {
        console.error('Error getting batch connection status:', error);
        res.status(500).json({ error: 'Failed to get batch connection status' });
    }
};

exports.getContacts = async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await Profile.findOne({ userId: userId }).select('_id userId fullName profileImage headline').exec();
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
};

// Get connected user profile
exports.getConnectedUserProfile = async (req, res) => {
    try {
        const { userId, targetUserId } = req.params;

        if (!userId || !targetUserId) {
            return res.status(400).json({ error: 'User ID and target user ID are required' });
        }

        const profile = await Profile.findById(targetUserId);
        if (!profile) {
            return res.status(404).json({ error: 'Target user profile not found' });
        }
        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { requester: userId, recipient: profile.userId, status: 'accepted' },
                { requester: profile.userId, recipient: userId, status: 'accepted' }
            ]
        });

        if (!connection) {
            return res.status(403).json({ error: 'You can only view profiles of connected users' });
        }

        
       
        // Generate signed URLs for images if they exist
        let profileImageUrl = null;
        let bannerImageUrl = null;

        if (profile.profileImage) {
            try {
                profileImageUrl = await getSignedUrl(profile.profileImage);
            } catch (error) {
                console.warn('Failed to generate signed URL for profile image:', error);
            }
        }

        if (profile.bannerImage) {
            try {
                bannerImageUrl = await getSignedUrl(profile.bannerImage);
            } catch (error) {
                console.warn('Failed to generate signed URL for banner image:', error);
            }
        }

        // Prepare response with connection info
        const profileData = {
            ...profile.toObject(),
            profileImageUrl,
            bannerImageUrl,
            connectionInfo: {
                connectionId: connection._id,
                connectionDate: connection.connectionDate,
                isRequester: connection.requester === userId
            }
        };

        res.status(200).json({ profile: profileData });
    } catch (error) {
        console.error('Error fetching connected user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

// Helper functions
async function getAcceptedConnections(userId) {
    const connections = await Connection.find({
        $or: [
            { requester: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' }
        ]
    }).populate('requester recipient', 'userId fullName profileImage headline');

    const result = [];
    for (const conn of connections) {
        const otherUserId = conn.requester === userId ? conn.recipient : conn.requester;
        const profile = await Profile.findOne({ userId: otherUserId }).select('userId fullName profileImage headline');
        
        if (profile) {
            result.push({
                ...profile.toObject(),
                connectionId: conn._id,
                connectionDate: conn.connectionDate,
                profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
            });
        }
    }
    return result;
}

async function getPendingRequests(userId) {
    const connections = await Connection.find({
        recipient: userId,
        status: 'pending'
    });

    const result = [];
    for (const conn of connections) {
        const profile = await Profile.findOne({ "userId": conn.requester }).select('userId fullName profileImage headline');
        
        if (profile) {
            result.push({
                ...profile.toObject(),
                connectionId: conn._id,
                requestMessage: conn.requestMessage,
                requestDate: conn.createdAt,
                profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
            });
        }
    }
    return result;
}

async function getSentRequests(userId) {
    const connections = await Connection.find({
        requester: userId,
        status: 'pending'
    });

    const result = [];
    for (const conn of connections) {
        const profile = await Profile.findOne({ userId: conn.recipient }).select('userId fullName profileImage headline');

        if (profile) {
            result.push({
                ...profile.toObject(),
                connectionId: conn._id,
                requestMessage: conn.requestMessage,
                requestDate: conn.createdAt,
                profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
            });
        }
    }
    return result;
}

async function getConnectionSuggestions(userId) {
    // Get all user IDs that are already connected or have pending requests
    const existingConnections = await Connection.find({
        $or: [
            { requester: userId },
            { recipient: userId }
        ]
    }).select('requester recipient');

    const connectedUserIds = new Set();
    connectedUserIds.add(userId); // Add self to exclude from suggestions

    existingConnections.forEach(conn => {
        connectedUserIds.add(conn.requester);
        connectedUserIds.add(conn.recipient);
    });

    // Get profiles that are not connected
    const suggestions = await Profile.find({
        userId: { $nin: Array.from(connectedUserIds) }
    }).select('userId fullName profileImage headline').limit(20);

    return suggestions.map(profile => ({
        ...profile.toObject(),
        profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null
    }));
}