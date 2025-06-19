const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  Company: { type: String, required: true },
  Location: { type: String, required: true },
  StartDate: { type: Date, required: true },
  EndDate: { type: Date }, // Optional
  Description: { type: String, required: true },
  logo: { type: String, default: null }
});

const aboutSchema = new mongoose.Schema({
  Description: { type: String },
});

const ProfileSchema = new mongoose.Schema(
    {
        fullName: {
            type:String,
             required: true
        },
        headline: {
            type: String,
            required: true
        },
        bannerImage: {
            type: String, // image URLs or paths
            default: null
        },
        profileImage: {
            type: String, // image URLs or paths
            default: null
        },
        about: aboutSchema,
        experiences: [experienceSchema]
    },
    {
        timestamps: true
    }
  );

module.exports = mongoose.model('Profile', ProfileSchema);



 