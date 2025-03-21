import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../src/utils/database';
import { User } from '../../../src/models/User';
import { GitHubService } from '../../../src/services/githubService';
import crypto from 'crypto';

/**
 * GitHub webhook handler
 * 
 * Processes webhook events from GitHub to sync user activity in real-time
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Connect to the database
  await connectDB();

  try {
    // Verify GitHub signature
    const isValid = verifyGitHubSignature(req);
    if (!isValid) {
      console.error('Invalid GitHub webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }
    
    // Get the event type
    const event = req.headers['x-github-event'] as string;
    
    // Parse the webhook payload
    const payload = req.body;
    
    // Process different GitHub events
    switch (event) {
      case 'push':
        await handlePushEvent(payload);
        break;
        
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
        
      case 'issues':
        await handleIssueEvent(payload);
        break;
        
      case 'release':
        await handleReleaseEvent(payload);
        break;
        
      default:
        // Log unhandled events but return success to avoid GitHub retries
        console.log(`Ignoring unhandled GitHub event: ${event}`);
    }
    
    // Send success response
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
}

/**
 * Verify GitHub webhook signature
 * 
 * @param req The incoming request object
 * @returns Boolean indicating if the signature is valid
 */
function verifyGitHubSignature(req: NextApiRequest): boolean {
  const signature = req.headers['x-hub-signature-256'];
  
  // If there's no signature or webhook secret is not set, fail verification
  if (!signature || !process.env.GITHUB_WEBHOOK_SECRET) {
    console.warn('Webhook verification failed: Missing signature or secret');
    // In development, you might want to bypass this check
    return process.env.APP_ENV === 'development';
  }
  
  // Get raw body from Next.js context or fallback to stringify the parsed body
  const rawBody = (req as any).rawBody || 
                  JSON.stringify(req.body);
  
  // Create expected signature
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  
  // Compare signatures in constant time to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature as string)
  );
}

/**
 * Handle push events (commits)
 */
async function handlePushEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.repository.owner || !payload.repository.owner.login) {
      console.error('Invalid webhook payload: missing repository or owner information');
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    console.log(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      console.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      console.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Process the push event
    const githubService = new GitHubService(
      accessToken as string,
      (user._id as any).toString()
    );
    
    // Sync the user's activities
    const activitiesCount = await githubService.syncUserActivities();
    
    console.log(`Processed push event for user ${user._id} in repository ${repository.full_name}, synced ${activitiesCount} activities`);
  } catch (error) {
    console.error('Error handling push event:', error);
  }
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action) {
      console.error('Invalid pull request payload: missing repository or action information');
      return;
    }
    
    // Only process opened, closed, or merged PRs
    const action = payload.action;
    if (!['opened', 'closed', 'reopened'].includes(action)) {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    console.log(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      console.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      console.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Process the PR event
    const githubService = new GitHubService(
      accessToken as string,
      (user._id as any).toString()
    );
    
    // Sync the user's activities
    const activitiesCount = await githubService.syncUserActivities();
    
    console.log(`Processed PR event for user ${user._id} in repository ${repository.full_name}, synced ${activitiesCount} activities`);
  } catch (error) {
    console.error('Error handling pull request event:', error);
  }
}

/**
 * Handle issue events
 */
async function handleIssueEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action) {
      console.error('Invalid issue payload: missing repository or action information');
      return;
    }
    
    // Only process opened, closed, or reopened issues
    const action = payload.action;
    if (!['opened', 'closed', 'reopened'].includes(action)) {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    console.log(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      console.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      console.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Process the issue event
    const githubService = new GitHubService(
      accessToken as string,
      (user._id as any).toString()
    );
    
    // Sync the user's activities
    const activitiesCount = await githubService.syncUserActivities();
    
    console.log(`Processed issue event for user ${user._id} in repository ${repository.full_name}, synced ${activitiesCount} activities`);
  } catch (error) {
    console.error('Error handling issue event:', error);
  }
}

/**
 * Handle release events
 */
async function handleReleaseEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action) {
      console.error('Invalid release payload: missing repository or action information');
      return;
    }
    
    // Only process published releases
    const action = payload.action;
    if (action !== 'published') {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    console.log(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      console.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      console.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Process the release event
    const githubService = new GitHubService(
      accessToken as string,
      (user._id as any).toString()
    );
    
    // Sync the user's activities
    const activitiesCount = await githubService.syncUserActivities();
    
    console.log(`Processed release event for user ${user._id} in repository ${repository.full_name}, synced ${activitiesCount} activities`);
  } catch (error) {
    console.error('Error handling release event:', error);
  }
} 