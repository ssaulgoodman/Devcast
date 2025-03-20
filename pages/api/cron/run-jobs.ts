import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/utils/database';
import { Scheduler } from '@/services/scheduler';

/**
 * API handler for running scheduled jobs
 * 
 * This endpoint should be called by a cron service (e.g., Vercel Cron Jobs)
 * to run the scheduled jobs for content generation and posting.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is authorized with a secret key
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.CRON_API_KEY;
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Connect to the database
  await connectDB();

  try {
    // Initialize scheduler
    const scheduler = new Scheduler();
    
    // Determine which job to run
    const jobType = req.query.job as string;
    
    switch (jobType) {
      case 'sync-activities':
        await scheduler.syncAllUsersActivities();
        break;
        
      case 'generate-content':
        await scheduler.generateContentForAllUsers();
        break;
        
      case 'post-content':
        await scheduler.postApprovedContent();
        break;
        
      case 'update-analytics':
        await scheduler.updateContentAnalytics();
        break;
        
      case 'all':
      default:
        // Run all jobs
        await scheduler.runAllJobs();
    }
    
    // Return success
    res.status(200).json({ success: true, message: `Successfully ran job: ${jobType || 'all'}` });
  } catch (error) {
    console.error('Error running scheduled jobs:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 