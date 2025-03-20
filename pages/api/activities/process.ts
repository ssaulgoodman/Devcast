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

    // Find all the activities to process
    const activities = await Activity.find({
      _id: { $in: validIds },
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending'
    });

    if (activities.length === 0) {
      return res.status(404).json({ error: 'No pending activities found with the provided IDs' });
    }

    // Process each activity in parallel
    const processedActivities = await Promise.all(
      activities.map(async (activity) => {
        // In a real implementation, this would call an AI service
        // For now, we'll use a simple placeholder
        const generatedContent = generatePlaceholderContent(activity);
        
        // Update the activity with the generated content
        activity.content = generatedContent;
        activity.status = 'processed';
        activity.processedAt = new Date();
        
        // Save the updated activity
        await activity.save();
        
        return activity;
      })
    );

    return res.status(200).json({
      message: `${processedActivities.length} activities processed successfully`,
      activities: processedActivities
    });
  } catch (error) {
    console.error('Error processing activities:', error);
    return res.status(500).json({ error: 'Failed to process activities' });
  }
}

// Helper function to generate placeholder content
// In a real application, this would be replaced with an AI service call
function generatePlaceholderContent(activity: any): string {
  const { type, repo, title, description } = activity;
  
  let content = '';
  
  switch (type) {
    case 'commit':
      content = `I just pushed a new commit to my ${repo} repository: "${title}". `;
      if (description) {
        content += `This change ${description.toLowerCase()}. `;
      }
      content += `Check out my ongoing work on this project! #coding #github #developer`;
      break;
      
    case 'pr':
      content = `I opened a new pull request in ${repo}: "${title}". `;
      if (description) {
        content += `${description} `;
      }
      content += `This is part of my ongoing work to improve this project. #github #opensource #pullrequest`;
      break;
      
    case 'issue':
      content = `I created a new issue in my ${repo} project: "${title}". `;
      if (description) {
        content += `${description} `;
      }
      content += `Your feedback and contributions are welcome! #github #opensource #issues`;
      break;
      
    case 'release':
      content = `🎉 New release for ${repo}! "${title}" is now available. `;
      if (description) {
        content += `${description} `;
      }
      content += `Check it out and let me know what you think! #release #github #developer`;
      break;
      
    default:
      content = `New activity in ${repo}: ${title}. `;
      if (description) {
        content += `${description} `;
      }
      content += `#github #coding`;
  }
  
  return content;
} 