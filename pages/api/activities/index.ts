import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectDb from '@/src/utils/database';
import { Activity } from '@/src/models/Activity';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // Different logic based on HTTP method
    switch (req.method) {
      case 'GET':
        return await getActivities(req, res, userId);
      case 'POST':
        return await createActivity(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Activities API Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Get activities with pagination
async function getActivities(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  // Calculate pagination skip
  const skip = (page - 1) * limit;

  // Build query
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };
  if (status) {
    query.status = status;
  }

  // Execute query with pagination
  const [activities, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Activity.countDocuments(query)
  ]);

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  // Return paginated response
  return res.status(200).json({
    activities,
    pagination: {
      total,
      page,
      limit,
      pages
    }
  });
}

// Create a new activity
async function createActivity(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { type, repo, title, description, githubUrl } = req.body;

  // Validate required fields
  if (!type || !repo || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create new activity
  const activity = new Activity({
    type,
    repo,
    title,
    description,
    githubUrl,
    userId: new mongoose.Types.ObjectId(userId),
    status: 'pending',
    createdAt: new Date()
  });

  // Save to database
  await activity.save();

  return res.status(201).json(activity);
} 