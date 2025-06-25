const Jobs = require('../models/Jobs');
const Profile = require('../models/Profile');
const  {getSignedUrl} =  require('../services/StorageService');

exports.getFutureJobs = async (req, res) => {
    try {


        const query=[
            {
                $match: {
                    deadline: { $gte: new Date() }
                }
            },
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { deadline: 1 }
            }
        ];
        const jobs = await Jobs.aggregate(query);
        // const jobs = await Jobs.find({ deadline: { $gte: new Date() } })
        if (!jobs || jobs.length === 0) {
            return res.status(404).json({ message: 'No future jobs found' });
        }

        // Fetch signed URLs for job banners and user profile images
        // Using Promise.all to handle asynchronous operations for each job
        
        const jobsWithUrls = jobs.map(async (job) => {
            const url = await getSignedUrl(job.banner);
            const profile = await Profile.findOne({ userId: job.userId }, 'profileImage fullName');
            if (profile) {
                const profImage = await getSignedUrl(profile.profileImage);
                job['user'] = {
                    name: profile.fullName,
                    picture: profImage
                };
            } else {
                job['user'] = {
                    name: '',
                    picture: null // or a default image URL
                };
            }
            return { ...job, banner: url };
        });
        const resolvedJobsWithUrls = await Promise.all(jobsWithUrls);
        res.status(200).json(resolvedJobsWithUrls);

    } catch (error) {
        console.error('Error fetching future jobs:', error);
        res.status(500).json({ error: 'Failed to fetch future jobs' });
    }
};