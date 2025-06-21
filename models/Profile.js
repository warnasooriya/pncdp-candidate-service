const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  Company: { type: String, required: true },
  Location: { type: String, required: true },
  StartDate: { type: Date, required: true },
  EndDate: { type: Date }, // Optional
  Description: { type: String, required: true },
  logo: { type: String, default: null },
});

const educationSchema = new mongoose.Schema({
  degree: {
    type: String,
    required: true,
  },
  university: {
    type: String,
    required: true,
  },
  duration: {
    type: String, // e.g., "2015 - 2019"
    required: true,
  },
  description: {
    type: String,
  },
  logo: {
    type: String,
    default: null,
  },
});

const certificationSchema = new mongoose.Schema({
   title: { type: String, required: true },
    issuer: { type: String, required: true },
    date: { type: String },
    description: { type: String },
    logo: { type: String }
});

const aboutSchema = new mongoose.Schema({
  Description: { type: String },
});

const portfolioSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  }
});

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    signInDetails: {
      loginId: {
        type: String,
        required: true,
        unique: true,
      },
      authFlowType: {
        type: String,
        required: true
      },
      
    } ,
    fullName: {
      type: String,
    //   required: true,
    },
    headline: {
      type: String,
    //   required: true,
    },
    bannerImage: {
      type: String, // image URLs or paths
      default: null,
    },
    profileImage: {
      type: String, // image URLs or paths
      default: null,
    },
    about: aboutSchema,
    experiences: [experienceSchema],
    educations: [educationSchema],
    skills: [
      {
        type: String,
      },
    ],
    certifications: [certificationSchema],
    portfolio: [portfolioSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Profile", ProfileSchema);
