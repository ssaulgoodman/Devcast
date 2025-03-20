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
    // Get the activity ID from the query
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    // Find the user ID
    const userId = session.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in session' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getActivity(req, res, id, userId);
      case 'PATCH':
        return await updateActivity(req, res, id, userId);
      case 'DELETE':
        return await deleteActivity(req, res, id, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Activity API Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Get a single activity
async function getActivity(req: NextApiRequest, res: NextApiResponse, id: string, userId: string) {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    // Find the activity
    const activity = await Activity.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId)
    });

    // Check if activity exists
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.status(200).json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
}

// Update an activity
async function updateActivity(req: NextApiRequest, res: NextApiResponse, id: string, userId: string) {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    const { status, title, description, content } = req.body;
    const updateData: any = {};

    // Add fields to update if they exist
    if (status) updateData.status = status;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;

    // Add timestamps based on status
    if (status === 'processed' && !updateData.processedAt) {
      updateData.processedAt = new Date();
    }
    if (status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // Update the activity
    const updatedActivity = await Activity.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { $set: updateData },
      { new: true }
    );

    // Check if activity exists
    if (!updatedActivity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.status(200).json(updatedActivity);
  } catch (error) {
    console.error('Error updating activity:', error);
    return res.status(500).json({ error: 'Failed to update activity' });
  }
}

// Delete an activity
async function deleteActivity(req: NextApiRequest, res: NextApiResponse, id: string, userId: string) {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    // Delete the activity
    const result = await Activity.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId)
    });

    // Check if activity exists
    if (!result) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return res.status(500).json({ error: 'Failed to delete activity' });
  }
} 