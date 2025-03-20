import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import connectDB from '@/utils/database';
import { Content } from '@/models/Content';

// Connect to database
connectDB();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Check authentication
  if (!session || !session.user) {
    return res.status(401).json({ error: 'You must be signed in to access this endpoint' });
  }

  // Get user ID
  const userId = session.user.id;

  // Handle GET request - fetch user content
  if (req.method === 'GET') {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Get filter parameters
      const status = req.query.status as string;
      
      // Build query
      const query: any = { userId };
      
      if (status) {
        query.status = status;
      }
      
      // Fetch content
      const content = await Content.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Count total matching content for pagination
      const total = await Content.countDocuments(query);
      
      return res.status(200).json({
        content,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching user content:', error);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  } 
  
  // Handle PUT request - update content status
  else if (req.method === 'PUT') {
    try {
      const { contentId, action } = req.body;
      
      if (!contentId || !action) {
        return res.status(400).json({ error: 'Content ID and action are required' });
      }
      
      // Check if content exists and belongs to the user
      const existingContent = await Content.findOne({
        _id: contentId,
        userId
      });
      
      if (!existingContent) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // Update content status based on action
      let updateData: any = {};
      
      switch (action) {
        case 'approve':
          updateData.status = 'approved';
          break;
        case 'reject':
          updateData.status = 'rejected';
          break;
        case 'edit':
          const { text } = req.body;
          if (!text) {
            return res.status(400).json({ error: 'Text is required for edit action' });
          }
          updateData.text = text;
          updateData.status = 'edited';
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
      
      // Update the content
      const updatedContent = await Content.findByIdAndUpdate(
        contentId,
        updateData,
        { new: true }
      );
      
      return res.status(200).json({
        message: 'Content updated successfully',
        content: updatedContent
      });
    } catch (error) {
      console.error('Error updating content:', error);
      return res.status(500).json({ error: 'Failed to update content' });
    }
  } 
  
  // Handle unsupported methods
  else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 