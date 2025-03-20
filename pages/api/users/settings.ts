import { NextApiRequest, NextApiResponse } from 'next';
import connectDb from '../../../src/utils/database';
import { getSession } from 'next-auth/react';
import { User } from '../../../src/models/User';

// Define the settings type
type UserSettings = {
  postingFrequency: 'daily' | 'weekdays' | 'custom';
  customDays?: string[];
  postingTime: string;
  contentStyle: string;
  autoApprove: boolean;
};

// API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Connect to the database
  await connectDb();

  // Get the user session
  const session = await getSession({ req });
  
  // Check if the user is authenticated
  if (!session || !session.user) {
    return res.status(401).json({ error: 'You must be signed in to access this endpoint' });
  }
  
  const userId = session.user.id;
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getSettings(userId, res);
    case 'PUT':
      return updateSettings(userId, req, res);
    default:
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// GET: Retrieve user settings
async function getSettings(userId: string, res: NextApiResponse) {
  try {
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return the user's settings
    return res.status(200).json({ settings: user.settings });
  } catch (error) {
    console.error('Error retrieving settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve settings' });
  }
}

// PUT: Update user settings
async function updateSettings(
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { 
      postingFrequency, 
      customDays, 
      postingTime, 
      contentStyle, 
      autoApprove 
    } = req.body as UserSettings;
    
    // Validate required fields
    if (!postingFrequency || !postingTime || !contentStyle === undefined || autoApprove === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the settings object
    const settings: UserSettings = {
      postingFrequency,
      postingTime,
      contentStyle,
      autoApprove,
      // Include customDays only if postingFrequency is 'custom'
      ...(postingFrequency === 'custom' ? { customDays: customDays || [] } : { customDays: [] }),
    };
    
    // Update the user's settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { settings },
      { new: true } // Return the updated document
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return success message
    return res.status(200).json({ 
      message: 'Settings updated successfully',
      settings: updatedUser.settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
} 