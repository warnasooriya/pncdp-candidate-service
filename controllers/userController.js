const Profile = require('../models/Profile');
const { ObjectId } = require('mongoose').Types;
exports.syncUserWithBackend = async (req, res) => {
    try {
        const { userId, signInDetails } = req.body;
        
        if (!userId || !signInDetails) {
            return res.status(400).json({ error: 'User ID and sign-in details are required' });
        }

        // Find the user profile by userId
        const profile = await Profile.findOne({userId: userId});
        if (!profile) {
            // If profile does not exist, create a new one
            const newProfile = new Profile({
                _id: new ObjectId(), // Generate a new ObjectId for the _id field
                userId: userId, // Generate a new ObjectId for the _id fielduserId,
                signInDetails:signInDetails
            });
            await newProfile.save();

            // console.log('New user profile created:', newProfile);
        }else {
            // console.log('User profile found:', profile);
             return res.status(200).json({ status: 'User profile already exists' });
        }
    
        // Respond with success
        res.status(200).json({ message: 'User synced successfully', userId: userId });
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({ error: 'Failed to sync user' });
    }
    }
    