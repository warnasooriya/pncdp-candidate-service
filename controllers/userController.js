const Profile = require('../models/Profile');
const { ObjectId } = require('mongoose').Types;
const AWS = require('aws-sdk');
exports.syncUserWithBackend = async (req, res) => {
    try {
        const { sub, email ,given_name,picture,userType} = req.body;
        

        if (!sub ) {
            return res.status(400).json({ error: 'User ID and sign-in details are required' });
        }

       

        // Find the user profile by userId
        const profile = await Profile.findOne({userId: sub});
        if (!profile) {
            let uType =  userType;
             if(!userType){
             uType = "Candidate";
            }
            // If profile does not exist, create a new one
            const newProfile = new Profile({
                _id: new ObjectId(), // Generate a new ObjectId for the _id field
                userId: sub, // Generate a new ObjectId for the _id fielduserId,
                email,
                fullName:given_name,
                picture,
                userType:uType
            });
            await newProfile.save();

            // console.log('New user profile created:', newProfile);
        }else {
            // console.log('User profile found:', profile);
             return res.status(200).json({ status: 'User profile already exists' });
        }
    
        // Respond with success
        res.status(200).json({ message: 'User synced successfully', userId: sub });
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({ error: 'Failed to sync user' });
    }
    }
 
exports.updateUserRole = async (req, res) => {
    try {
        const { id, userType } = req.body;

        if (!id || !userType) {
            return res.status(400).json({ error: 'id and userType are required' });
        }

        const allowed = ['Candidate', 'Recruiter'];
        if (!allowed.includes(userType)) {
            return res.status(400).json({ error: 'Invalid userType' });
        }

        const profile = await Profile.findOneAndUpdate(
            { userId: id },
            { $set: { userType } },
            { new: true }
        );
 
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.status(200).json({ message: 'User role updated', profile });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }



}

exports.adminUpdateCognitoAttributes = async (req, res) => {
    try {
        const { id, attributes } = req.body;
        if (!id || !attributes || typeof attributes !== 'object') {
            return res.status(400).json({ error: 'id and attributes are required' });
        }

        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const region = process.env.AWS_REGION;
        const cognito = new AWS.CognitoIdentityServiceProvider({ region ,
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
         });

        const UserAttributes = Object.entries(attributes).map(([Name, Value]) => ({ Name, Value }));

        await cognito.adminUpdateUserAttributes({
            UserPoolId: userPoolId,
            Username: id,
            UserAttributes
        }).promise();

        return res.status(200).json({ message: 'Cognito attributes updated' });
    } catch (error) {
        console.error('Error updating Cognito attributes:', error);
        return res.status(500).json({ error: 'Failed to update Cognito attributes' });
    }
}

exports.syncProfilesToCognito = async (req, res) => {
    try {
        const { id, ids } = req.body || {};
        const userPoolId = process.env.COGNITO_USER_POOL_ID ;
        const region = process.env.AWS_REGION ;
        const cognito = new AWS.CognitoIdentityServiceProvider({ region ,
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
         });

        const ensureGroup = async (groupName) => {
            try {
                await cognito.getGroup({ GroupName: groupName, UserPoolId: userPoolId }).promise();
            } catch (err) {
                if (err.code === 'ResourceNotFoundException') {
                    await cognito.createGroup({ GroupName: groupName, UserPoolId: userPoolId }).promise();
                } else {
                    throw err;
                }
            }
        };

        await ensureGroup('Recruiter');

        let profiles;
        if (ids && Array.isArray(ids) && ids.length > 0) {
            profiles = await Profile.find({ userId: { $in: ids } }).lean();
        } else if (id) {
            profiles = await Profile.find({ userId: id }).lean();
        } else {
            profiles = await Profile.find({}).lean();
        }

        const results = [];

        for (const p of profiles) {
            const username = p.email;
            const attrs = [
                { Name: 'email', Value: p.email },
                { Name: 'email_verified', Value: 'true' },
            ];
            if (p.fullName) attrs.push({ Name: 'name', Value: p.fullName });
            if (p.userType) attrs.push({ Name: 'custom:userTypes', Value: p.userType });

            let action = 'none';
            try {
                await cognito.adminGetUser({ UserPoolId: userPoolId, Username: username }).promise();
                await cognito.adminUpdateUserAttributes({
                    UserPoolId: userPoolId,
                    Username: username,
                    UserAttributes: attrs,
                }).promise();
                action = 'updated';
            } catch (err) {
                if (err.code === 'UserNotFoundException') {
                    await cognito.adminCreateUser({
                        UserPoolId: userPoolId,
                        Username: username,
                        MessageAction: 'SUPPRESS',
                        TemporaryPassword: 'Temp#1234A',
                        UserAttributes: attrs,
                    }).promise();
                    action = 'created';
                } else {
                    results.push({ userId: p.userId, email: p.email, status: 'error', error: err.code || String(err) });
                    continue;
                }
            }

            if (p.userType === 'Recruiter') {
                try {
                    await cognito.adminAddUserToGroup({ UserPoolId: userPoolId, Username: username, GroupName: 'Recruiter' }).promise();
                } catch (e) {}
            }

            results.push({ userId: p.userId, email: p.email, status: action });
        }

        return res.status(200).json({ count: results.length, results });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to sync profiles to Cognito' });
    }
}
    
