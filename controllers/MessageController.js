const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Connection = require("../models/Connection");
const Profile = require("../models/Profile");

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, content, messageType = 'text', mediaUrl, mediaFileName } = req.body;

        if (!senderId || !receiverId || !content) {
            return res.status(400).json({ error: 'Sender ID, receiver ID, and content are required' });
        }

        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { requester: senderId, recipient: receiverId, status: 'accepted' },
                { requester: receiverId, recipient: senderId, status: 'accepted' }
            ]
        });

        if (!connection) {
            return res.status(403).json({ error: 'You can only message connected users' });
        }

        // Find or create conversation
        const conversation = await Conversation.findOrCreateDirectConversation(senderId, receiverId);
        
        // Create message
        const newMessage = new Message({
            conversationId: conversation._id.toString(),
            senderId,
            receiverId,
            content,
            messageType,
            mediaUrl,
            mediaFileName
        });

        await newMessage.save();

        // Update conversation's last message and unread count
        conversation.lastMessage = {
            content,
            senderId,
            timestamp: newMessage.createdAt,
            messageType
        };

        // Increment unread count for receiver
        const receiverUnreadIndex = conversation.unreadCounts.findIndex(uc => uc.userId === receiverId);
        if (receiverUnreadIndex !== -1) {
            conversation.unreadCounts[receiverUnreadIndex].count += 1;
        } else {
            conversation.unreadCounts.push({ userId: receiverId, count: 1 });
        }

        await conversation.save();

        // Populate sender info for response
        const senderProfile = await Profile.findOne({ userId: senderId });
        const messageWithSender = {
            ...newMessage.toObject(),
            sender: {
                userId: senderId,
                fullName: senderProfile?.fullName || 'Unknown User',
                profileImage: senderProfile?.profileImage || null
            }
        };

        res.status(201).json({ 
            message: 'Message sent successfully', 
            data: messageWithSender 
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// Get conversations for a user
exports.getConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true
        })
        .sort({ 'lastMessage.timestamp': -1 })
        .skip(skip)
        .limit(limit);

        // Populate participant profiles
        const conversationsWithProfiles = await Promise.all(
            conversations.map(async (conversation) => {
                const otherParticipants = conversation.participants.filter(p => p !== userId);
                const participantProfiles = await Profile.find({
                    userId: { $in: otherParticipants }
                });

                const userUnreadCount = conversation.unreadCounts.find(uc => uc.userId === userId)?.count || 0;

                return {
                    ...conversation.toObject(),
                    participants: participantProfiles.map(profile => ({
                        userId: profile.userId,
                        fullName: profile.fullName,
                        profileImage: profile.profileImage,
                        headline: profile.headline
                    })),
                    unreadCount: userUnreadCount
                };
            })
        );

        res.status(200).json({
            conversations: conversationsWithProfiles,
            pagination: {
                page,
                limit,
                total: await Conversation.countDocuments({
                    participants: userId,
                    isActive: true
                })
            }
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// Get messages in a conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        if (!conversationId || !userId) {
            return res.status(400).json({ error: 'Conversation ID and user ID are required' });
        }

        // Verify user is part of the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        const messages = await Message.find({
            conversationId,
            isDeleted: false
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('replyTo', 'content senderId createdAt');

        // Populate sender profiles
        const senderIds = [...new Set(messages.map(m => m.senderId))];
        const senderProfiles = await Profile.find({
            userId: { $in: senderIds }
        });

        const messagesWithSenders = messages.map(message => {
            const sender = senderProfiles.find(p => p.userId === message.senderId);
            return {
                ...message.toObject(),
                sender: {
                    userId: message.senderId,
                    fullName: sender?.fullName || 'Unknown User',
                    profileImage: sender?.profileImage || null
                }
            };
        }).reverse(); // Reverse to show oldest first

        res.status(200).json({
            messages: messagesWithSenders,
            pagination: {
                page,
                limit,
                total: await Message.countDocuments({
                    conversationId,
                    isDeleted: false
                })
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;

        if (!conversationId || !userId) {
            return res.status(400).json({ error: 'Conversation ID and user ID are required' });
        }

        // Verify user is part of the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        // Mark unread messages as read
        await Message.updateMany(
            {
                conversationId,
                receiverId: userId,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        // Reset unread count for user
        const userUnreadIndex = conversation.unreadCounts.findIndex(uc => uc.userId === userId);
        if (userUnreadIndex !== -1) {
            conversation.unreadCounts[userUnreadIndex].count = 0;
        }

        await conversation.save();

        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body;

        if (!messageId || !userId) {
            return res.status(400).json({ error: 'Message ID and user ID are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only sender can delete their message
        if (message.senderId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};

// Edit a message
exports.editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, content } = req.body;

        if (!messageId || !userId || !content) {
            return res.status(400).json({ error: 'Message ID, user ID, and content are required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only sender can edit their message
        if (message.senderId !== userId) {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        res.status(200).json({ 
            message: 'Message updated successfully',
            data: message
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
};

// Get unread message count for user
exports.getUnreadCount = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const conversations = await Conversation.find({
            participants: userId,
            isActive: true
        });

        const totalUnreadCount = conversations.reduce((total, conversation) => {
            const userUnreadCount = conversation.unreadCounts.find(uc => uc.userId === userId)?.count || 0;
            return total + userUnreadCount;
        }, 0);

        res.status(200).json({ unreadCount: totalUnreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};