const Jobs = require('../models/Jobs');
const  {getSignedUrl} =  require('../services/StorageService');

exports.getFutureJobs = async (req, res) => {
    try {
        const jobs = await Jobs.find({
            deadline: { $gte: new Date() }
        }).sort({ deadline: 1 });

        if (!jobs || jobs.length === 0) {
            return res.status(404).json({ message: 'No future jobs found' });
        }

        const jobsWithUrls = await Promise.all(jobs.map(async (job) => {
            const url = await getSignedUrl(job.banner);
            return { ...job.toObject(), banner: url };
        }));


        res.status(200).json(jobsWithUrls);

    } catch (error) {
        console.error('Error fetching future jobs:', error);
        res.status(500).json({ error: 'Failed to fetch future jobs' });
    }
};