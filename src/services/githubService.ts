import { Octokit } from "octokit";
import { User } from "@/models/User";
import { Activity } from "@/models/Activity";

/**
 * GitHub service class to handle all GitHub API operations
 */
export class GitHubService {
  private octokit: Octokit;
  private userId: string;

  /**
   * Initialize GitHub service with user access token
   */
  constructor(accessToken: string, userId: string) {
    this.octokit = new Octokit({ auth: accessToken });
    this.userId = userId;
  }

  /**
   * Get authenticated user information
   */
  async getAuthenticatedUser() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return data;
  }

  /**
   * Get user repositories
   */
  async getUserRepositories() {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      visibility: "all",
      sort: "updated",
      per_page: 100,
    });
    return data;
  }

  /**
   * Get commits for a specific repository
   */
  async getRepositoryCommits(owner: string, repo: string, since?: string) {
    const { data } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      per_page: 30,
    });
    return data;
  }

  /**
   * Get pull requests for a specific repository
   */
  async getRepositoryPullRequests(owner: string, repo: string, state: "open" | "closed" | "all" = "all") {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      sort: "updated",
      direction: "desc",
      per_page: 30,
    });
    return data;
  }

  /**
   * Get issues for a specific repository
   */
  async getRepositoryIssues(owner: string, repo: string, state: "open" | "closed" | "all" = "all") {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      sort: "updated",
      direction: "desc",
      per_page: 30,
    });
    return data.filter(issue => !issue.pull_request); // Filter out PRs
  }

  /**
   * Sync recent activities for all user repositories
   */
  async syncUserActivities(since?: Date): Promise<number> {
    const repos = await this.getUserRepositories();
    let activitiesCount = 0;

    // Use last sync date if no since date provided
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to 24 hours ago
    const sinceString = sinceDate.toISOString();

    for (const repo of repos) {
      // Only process non-fork repositories unless they have recent activity
      if (!repo.fork || new Date(repo.updated_at || new Date()) > sinceDate) {
        const [commits, pullRequests, issues] = await Promise.all([
          this.getRepositoryCommits(repo.owner.login, repo.name, sinceString),
          this.getRepositoryPullRequests(repo.owner.login, repo.name),
          this.getRepositoryIssues(repo.owner.login, repo.name)
        ]);

        // Process commits
        for (const commit of commits) {
          if (commit.commit?.author?.date && new Date(commit.commit.author.date) > sinceDate) {
            await this.saveCommitActivity(repo, commit);
            activitiesCount++;
          }
        }

        // Process pull requests
        for (const pr of pullRequests) {
          if (new Date(pr.updated_at) > sinceDate) {
            await this.savePullRequestActivity(repo, pr);
            activitiesCount++;
          }
        }

        // Process issues
        for (const issue of issues) {
          if (new Date(issue.updated_at) > sinceDate) {
            await this.saveIssueActivity(repo, issue);
            activitiesCount++;
          }
        }
      }
    }

    return activitiesCount;
  }

  /**
   * Save commit activity to database
   */
  private async saveCommitActivity(repo: any, commit: any) {
    const activity = {
      user: this.userId,
      type: 'commit',
      repository: repo.full_name,
      title: commit.commit.message.split('\n')[0],
      description: commit.commit.message.split('\n').slice(1).join('\n'),
      url: commit.html_url,
      branch: commit.parents.length > 1 ? 'merge' : repo.default_branch,
      commitSha: commit.sha,
      metadata: {
        authorName: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        authorDate: commit.commit.author.date,
        stats: commit.stats,
      }
    };

    // Check if activity already exists to avoid duplicates
    const existingActivity = await Activity.findOne({
      user: this.userId,
      type: 'commit',
      commitSha: commit.sha
    });

    if (!existingActivity) {
      await Activity.create(activity);
    }
  }

  /**
   * Save pull request activity to database
   */
  private async savePullRequestActivity(repo: any, pr: any) {
    const activity = {
      user: this.userId,
      type: 'pull_request',
      repository: repo.full_name,
      title: pr.title,
      description: pr.body,
      url: pr.html_url,
      prNumber: pr.number,
      metadata: {
        state: pr.state,
        merged: pr.merged,
        mergedAt: pr.merged_at,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        labels: pr.labels.map((label: any) => label.name),
      }
    };

    // Check if activity already exists to avoid duplicates
    const existingActivity = await Activity.findOne({
      user: this.userId,
      type: 'pull_request',
      repository: repo.full_name,
      prNumber: pr.number
    });

    if (!existingActivity) {
      await Activity.create(activity);
    } else {
      // Update if status changed
      const metadata = (existingActivity as any).metadata || {};
      if (metadata.state !== pr.state || 
          metadata.merged !== pr.merged) {
        await Activity.findByIdAndUpdate(existingActivity._id, {
          title: pr.title,
          description: pr.body,
          metadata: activity.metadata
        });
      }
    }
  }

  /**
   * Save issue activity to database
   */
  private async saveIssueActivity(repo: any, issue: any) {
    const activity = {
      user: this.userId,
      type: 'issue',
      repository: repo.full_name,
      title: issue.title,
      description: issue.body,
      url: issue.html_url,
      issueNumber: issue.number,
      metadata: {
        state: issue.state,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        labels: issue.labels.map((label: any) => label.name),
      }
    };

    // Check if activity already exists to avoid duplicates
    const existingActivity = await Activity.findOne({
      user: this.userId,
      type: 'issue',
      repository: repo.full_name,
      issueNumber: issue.number
    });

    if (!existingActivity) {
      await Activity.create(activity);
    } else {
      // Update if status changed
      const metadata = (existingActivity as any).metadata || {};
      if (metadata.state !== issue.state) {
        await Activity.findByIdAndUpdate(existingActivity._id, {
          title: issue.title,
          description: issue.body,
          metadata: activity.metadata
        });
      }
    }
  }
} 