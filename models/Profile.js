const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  fullName: String,
  headline: String,
  profileImage: String, // image URLs or paths
  bannerImage: String
});

module.exports = mongoose.model('Profile', ProfileSchema);