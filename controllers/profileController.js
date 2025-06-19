const Profile = require('../models/Profile');
const  {getSignedUrl} =  require('../services/StorageService');
exports.getProfile = async (req, res) => {

    const profileId = req.query.id;
    const profile = await Profile.findById(profileId).exec(); // Add user ID if needed

      

   if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
      const updatedProfile = {
      ...profile._doc,
      profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null,
      bannerImage: profile.bannerImage ? getSignedUrl(profile.bannerImage) : null,
    };


  res.json(updatedProfile);
};

exports.updateProfile = async (req, res) => {
  try {
    const { id, fullName, headline } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { _id: id }, // filter by _id
      { fullName, headline },
      {
        new: true,              // return the updated document
        upsert: true,           // insert if not found
        setDefaultsOnInsert: true // apply schema defaults if inserting
      }
    );

    res.json(profile);
  } catch (err) {
    console.error('Error updating or inserting profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.uploadImages = async (req, res) => {
  const updates = {};
  if (req.files?.profileImage) {
    updates.profileImage = `${req.files.profileImage[0].key}`;
  }
  if (req.files?.bannerImage) {
    updates.bannerImage = `${req.files.bannerImage[0].key}`;
  }

  const profile = await Profile.findOneAndUpdate({}, updates, { new: true });

   const updatedProfile = {
      ...profile._doc,
      profileImage: profile.profileImage ? getSignedUrl(profile.profileImage) : null,
      bannerImage: profile.bannerImage ? getSignedUrl(profile.bannerImage) : null
    };

  res.json(updatedProfile);
};


exports.updateAbout = async (req, res) => {
  try {
    const { id, description } = req.body;

   const profile = await Profile.findOneAndUpdate(
      { _id: id },
      { $set: { about: { Description: description } } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error('Error updating or inserting profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateExperiences = async (req, res) => {
  try {
    const { id, experiences } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { _id: id },
      { $set: { experiences } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error('Update experiences error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEducation = async (req, res) => {
  try {
    const { id, educations } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { _id: id },
      { $set: { educations } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error('Update experiences error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSkills = async (req, res) => {
  try {
    const { id, skills  } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { _id: id },
      { $set: { skills  } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error('Update skills  error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePortfolio = async (req, res) => {
  const { id, portfolio } = req.body;
  const profile = await Profile.findOneAndUpdate({ _id: id }, { portfolio }, { new: true, upsert: true });
  res.json(profile);
};

exports.updateCertifications = async (req, res) => {
  try {
    const { id, certifications } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { _id: id },
      { $set: { certifications } },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error("Update certifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};