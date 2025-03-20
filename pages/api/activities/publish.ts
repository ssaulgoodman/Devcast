import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectDb from '@/src/utils/database';
import { Activity } from '@/src/models/Activity';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Connect to the database
  await connectDb();

  // Check authentication
  const session = await getSession({ req });
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Find the user ID
    const userId = session.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in session' });
    }

    // Get activity IDs from request body
    const { activityIds } = req.body;
    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({ error: 'No activity IDs provided' });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = activityIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== activityIds.length) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    // Find all the activities to publish
    const activities = await Activity.find({
      _id: { $in: validIds },
      userId: new mongoose.Types.ObjectId(userId),
      status: 'processed'
    });

    if (activities.length === 0) {
      return res.status(404).json({ error: 'No processed activities found with the provided IDs' });
    }

    // Publish each activity in parallel
    const publishedActivities = await Promise.all(
      activities.map(async (activity) => {
        // In a real implementation, this would call the social media APIs
        // For now, we'll simulate a successful publish with mock social media IDs
        const socialMediaIds = await publishToSocialMedia(activity);
        
        // Update the activity with the social media IDs and status
        activity.socialMediaIds = socialMediaIds;
        activity.status = 'published';
        activity.publishedAt = new Date();
        
        // Save the updated activity
        await activity.save();
        
        return activity;
      })
    );

    return res.status(200).json({
      message: `${publishedActivities.length} activities published successfully`,
      activities: publishedActivities
    });
  } catch (error) {
    console.error('Error publishing activities:', error);
    return res.status(500).json({ error: 'Failed to publish activities' });
  }
}

// Helper function to simulate publishing to social media
// In a real application, this would be replaced with actual social media API calls
async function publishToSocialMedia(activity: any): Promise<{ twitter?: string; linkedin?: string; facebook?: string }> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate random IDs to simulate successful posts
  return {
    twitter: `tw_${Math.random().toString(36).substring(2, 15)}`,
    linkedin: `li_${Math.random().toString(36).substring(2, 15)}`,
    facebook: `fb_${Math.random().toString(36).substring(2, 15)}`
  };
} 