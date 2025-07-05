const Profile = require("../models/Profile");
const  {getSignedUrl} =  require('../services/StorageService');

exports.getConnections = async (req, res) => {
    try {

        const userId = req.params.id;
        const connections = await Profile.find({ userId: { $ne: userId }    }).select('_id userId fullName profileImage headline').exec();

        connections.forEach(connection => {
            connection.profileImage = connection.profileImage ? getSignedUrl(connection.profileImage) : null;
        });

        res.status(200).json(connections);
    } catch (error) {
        console.error('Error fetching future jobs:', error);
        res.status(500).json({ error: 'Failed to fetch future jobs' });
    }
};

exports.getContacts = async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await Profile.findOne({ userId: userId }).select('_id userId fullName profileImage headline').exec();
        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching future jobs:', error);
        res.status(500).json({ error: 'Failed to fetch future jobs' });
    }
};  