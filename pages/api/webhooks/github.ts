import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../src/utils/database';
import { User } from '../../../src/models/User';
import { Activity } from '../../../src/models/Activity';
import { GitHubService } from '../../../src/services/githubService';
import crypto from 'crypto';
import logger from '../../../src/utils/logger';

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
      logger.github.error('Invalid GitHub webhook signature');
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
        logger.github.info(`Ignoring unhandled GitHub event: ${event}`);
    }
    
    // Send success response
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logger.github.error('Error processing GitHub webhook:', error);
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
    logger.github.warn('Webhook verification failed: Missing signature or secret');
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
      logger.github.error('Invalid webhook payload: missing repository or owner information');
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    logger.github.info(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      logger.github.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      logger.github.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Process only the new commits from the webhook payload
    const commits = payload.commits || [];
    let processedCount = 0;
    
    if (commits.length > 0) {
      for (const commit of commits) {
        // Check if this commit already exists in the database
        const existingActivity = await Activity.findOne({
          userId: user._id,
          type: 'commit',
          'metadata.commitSha': commit.id
        });
        
        // If the commit is already in the database, skip it
        if (existingActivity) {
          logger.github.debug(`Commit ${commit.id} already exists, skipping`);
          continue;
        }
        
        // Create a new activity for this commit
        const activity = {
          userId: user._id,
          type: 'commit',
          repo: repository.full_name,
          title: commit.message.split('\n')[0].trim(),
          description: commit.message.split('\n').slice(1).join('\n'),
          githubUrl: commit.url,
          status: 'pending',
          metadata: {
            branch: payload.ref.replace('refs/heads/', ''),
            commitSha: commit.id,
            authorName: commit.author?.name,
            authorEmail: commit.author?.email,
            authorDate: commit.timestamp,
          }
        };
        
        // Save the activity to the database
        await Activity.create(activity);
        processedCount++;
      }
    } else {
      logger.github.info(`No commits found in the webhook payload`);
    }
    
    logger.github.info(`Processed push event for user ${user._id} in repository ${repository.full_name}, created ${processedCount} new activities`);
  } catch (error) {
    logger.github.error('Error handling push event:', error);
  }
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action || !payload.pull_request) {
      logger.github.error('Invalid pull request payload: missing repository, action, or pull_request information');
      return;
    }
    
    // Only process opened, closed, or merged PRs
    const action = payload.action;
    if (!['opened', 'closed', 'reopened'].includes(action)) {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    const pr = payload.pull_request;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    logger.github.info(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      logger.github.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      logger.github.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Check if PR already exists in database
    const existingActivity = await Activity.findOne({
      userId: user._id,
      type: 'pr',
      repo: repository.full_name,
      'metadata.prNumber': pr.number
    });
    
    // Create activity object
    const activity = {
      userId: user._id,
      type: 'pr',
      repo: repository.full_name,
      title: pr.title,
      description: pr.body || '',
      githubUrl: pr.html_url,
      status: 'pending',
      metadata: {
        prNumber: pr.number,
        state: pr.state,
        merged: pr.merged || false,
        mergedAt: pr.merged_at,
        labels: pr.labels?.map((label: any) => label.name) || [],
      }
    };
    
    let processedCount = 0;
    
    if (!existingActivity) {
      // Create new PR activity
      await Activity.create(activity);
      processedCount = 1;
    } else {
      // Update existing PR if status changed
      const metadata = (existingActivity as any).metadata || {};
      if (metadata.state !== pr.state || metadata.merged !== (pr.merged || false)) {
        await Activity.findByIdAndUpdate(existingActivity._id, {
          title: pr.title,
          description: pr.body || '',
          metadata: activity.metadata
        });
        processedCount = 1;
      }
    }
    
    logger.github.info(`Processed PR event for user ${user._id} in repository ${repository.full_name}, updated ${processedCount} activities`);
  } catch (error) {
    logger.github.error('Error handling pull request event:', error);
  }
}

/**
 * Handle issue events
 */
async function handleIssueEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action || !payload.issue) {
      logger.github.error('Invalid issue payload: missing repository, action, or issue information');
      return;
    }
    
    // Only process opened, closed, or reopened issues
    const action = payload.action;
    if (!['opened', 'closed', 'reopened'].includes(action)) {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    const issue = payload.issue;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    logger.github.info(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      logger.github.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      logger.github.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Check if issue already exists in database
    const existingActivity = await Activity.findOne({
      userId: user._id,
      type: 'issue',
      repo: repository.full_name,
      'metadata.issueNumber': issue.number
    });
    
    // Create activity object
    const activity = {
      userId: user._id,
      type: 'issue',
      repo: repository.full_name,
      title: issue.title,
      description: issue.body || '',
      githubUrl: issue.html_url,
      status: 'pending',
      metadata: {
        issueNumber: issue.number,
        state: issue.state,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        labels: issue.labels?.map((label: any) => label.name) || [],
      }
    };
    
    let processedCount = 0;
    
    if (!existingActivity) {
      // Create new issue activity
      await Activity.create(activity);
      processedCount = 1;
    } else {
      // Update existing issue if status changed
      const metadata = (existingActivity as any).metadata || {};
      if (metadata.state !== issue.state) {
        await Activity.findByIdAndUpdate(existingActivity._id, {
          title: issue.title,
          description: issue.body || '',
          metadata: activity.metadata
        });
        processedCount = 1;
      }
    }
    
    logger.github.info(`Processed issue event for user ${user._id} in repository ${repository.full_name}, updated ${processedCount} activities`);
  } catch (error) {
    logger.github.error('Error handling issue event:', error);
  }
}

/**
 * Handle release events
 */
async function handleReleaseEvent(payload: any) {
  try {
    // Validate payload
    if (!payload.repository || !payload.action || !payload.release) {
      logger.github.error('Invalid release payload: missing repository, action, or release information');
      return;
    }
    
    // Only process published releases
    const action = payload.action;
    if (action !== 'published') {
      return;
    }
    
    // Get the repository information
    const repository = payload.repository;
    const release = payload.release;
    
    // Get the user by GitHub username
    const githubUsername = repository.owner.login;
    logger.github.info(`Looking for user with GitHub username: ${githubUsername}`);
    
    // Check both possible locations for the username (due to schema inconsistency)
    const user = await User.findOne({ 
      $or: [
        { 'github.username': githubUsername },
        { 'githubUsername': githubUsername }
      ]
    });
    
    if (!user) {
      logger.github.error(`No user found with GitHub username: ${githubUsername}`);
      return;
    }
    
    if (!user.github?.accessToken && !user.accessTokens?.github) {
      logger.github.error(`User found but missing GitHub access token for username: ${githubUsername}`);
      return;
    }
    
    // Get access token from either location
    const accessToken = user.github?.accessToken || user.accessTokens?.github;
    
    // Check if release already exists in database
    const existingActivity = await Activity.findOne({
      userId: user._id,
      type: 'release',
      repo: repository.full_name,
      'metadata.tagName': release.tag_name
    });
    
    // Skip if release activity already exists
    if (existingActivity) {
      logger.github.debug(`Release ${release.tag_name} already exists, skipping`);
      return;
    }
    
    // Create activity object
    const activity = {
      userId: user._id,
      type: 'release',
      repo: repository.full_name,
      title: `${release.name || release.tag_name}`,
      description: release.body || '',
      githubUrl: release.html_url,
      status: 'pending',
      metadata: {
        tagName: release.tag_name,
        releaseName: release.name,
        draft: release.draft,
        prerelease: release.prerelease,
        createdAt: release.created_at,
        publishedAt: release.published_at,
      }
    };
    
    // Save the activity to the database
    await Activity.create(activity);
    
    logger.github.info(`Processed release event for user ${user._id} in repository ${repository.full_name}, created 1 new activity`);
  } catch (error) {
    logger.github.error('Error handling release event:', error);
  }
} 