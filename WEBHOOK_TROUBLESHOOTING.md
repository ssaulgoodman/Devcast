# GitHub Webhook Troubleshooting Guide

This document provides solutions to common issues with GitHub webhook integration in DevCast.

## Prerequisites
Before troubleshooting, ensure you have:

- MongoDB running (local or remote)
- Next.js development server running on port 3000
- ngrok or similar tool for exposing your local server to the internet
- `APP_ENV=development` in your `.env` file
- `GITHUB_WEBHOOK_SECRET` set in your `.env` file
- At least one user in the database

## Common Issues and Solutions

### Webhook Not Receiving Events

**Symptoms:**
- GitHub webhook shows 0 deliveries
- No new activities appearing in the database
- No logs showing webhook reception

**Possible Solutions:**
1. **Check Webhook URL Configuration:**
   - Verify the payload URL in GitHub is correct (should point to `/api/webhooks/github`)
   - For local development, ensure ngrok is running and the URL is up-to-date
   - Test with `curl -X POST your-webhook-url` to verify the endpoint is accessible

2. **Verify GitHub Repository Setup:**
   - Check that the webhook is active in your GitHub repository settings
   - Ensure you've selected the appropriate events (pushes, pull requests, issues, releases)
   - Look for any failed deliveries in the GitHub webhook panel

3. **Check Network Connectivity:**
   - Verify that your ngrok tunnel is active and forwarding requests correctly
   - Check the ngrok dashboard for any connection issues or error reports

### Signature Verification Failing

**Symptoms:**
- GitHub shows successful deliveries
- 401 responses in webhook delivery history
- "Invalid GitHub webhook signature" error in logs

**Possible Solutions:**
1. **Verify Webhook Secret:**
   - Ensure `GITHUB_WEBHOOK_SECRET` in `.env` matches the secret in GitHub webhook settings
   - Check for any whitespace or invisible characters in the secret
   - Try recreating the webhook with a new secret

2. **Check Body Parsing:**
   - Verify that Next.js is correctly handling the raw request body
   - Try using a custom API endpoint middleware to preserve the raw body

3. **Troubleshoot with Test Script:**
   - Use the `webhook-test.js` script to test signature generation
   - Compare the signature in GitHub deliveries with your calculated signature

### Activities Not Being Saved

**Symptoms:**
- Webhook receives events (logs show "Webhook processed successfully")
- No new activities in the database
- Error messages in logs may show validation failures

**Possible Solutions:**
1. **Check Database Connection:**
   - Verify MongoDB is running and accessible
   - Use `create-test-activity.js` to check direct database write access
   - Review database connection logs for any errors

2. **Verify User Exists:**
   - Check if a user with the GitHub username exists in the database
   - In development mode, create a test user with:
     ```
     db.users.insertOne({ 
       name: "Test User", 
       email: "test@example.com", 
       githubUsername: "your_github_username", 
       github: { accessToken: "test_access_token" } 
     })
     ```

3. **Review Field Names:**
   - Use `show-activities.js` to check the field structure of existing activities
   - Ensure the GitHubService is creating activities with the correct field names
   - Check the Activity model for any required fields

### Development Mode Issues

**Symptoms:**
- No test activities created in development mode
- "No user found for GitHub username" message in logs
- No "Creating test activity in development mode" log message

**Possible Solutions:**
1. **Verify Environment Setup:**
   - Check that `APP_ENV=development` is set in `.env`
   - Restart the Next.js server after changing environment variables
   - Use `process.env.APP_ENV === 'development'` check in code

2. **Test User Creation:**
   - Make sure at least one user exists in the database
   - The development mode uses the first user found for test activities
   - You can verify this with MongoDB Compass or the `check-database.js` script

3. **Debug GitHubService:**
   - Check if `createTestActivity()` is being called in development mode
   - Review the log output for "GitHubService running in development mode with test token"

## Testing Tools

DevCast includes several scripts to help test the webhook integration:

### Webhook Test Script

```bash
node webhook-test.js
```

This script simulates a GitHub webhook event by:
1. Creating a sample webhook payload
2. Generating the correct HMAC-SHA256 signature using your webhook secret
3. Sending a POST request to your webhook endpoint
4. Checking the database for new activities

Use this script to test the full webhook flow without needing actual GitHub events.

### Create Test Activity Script

```bash
node create-test-activity.js
```

This script creates a test activity directly in the database, bypassing the webhook flow. Use it to:
1. Verify database connectivity
2. Test activity creation with the correct field structure
3. Confirm that MongoDB is properly configured

### Show Activities Script

```bash
node show-activities.js
```

This script displays all activities in the database with detailed information, including:
1. Activity basic fields (type, title, repo, etc.)
2. Metadata fields specific to each activity type
3. Associated user information
4. Timestamps and status information

Use this script to verify that activities are being created correctly and have the expected structure.

## MongoDB Collections

Understanding the database structure can help with debugging:

### Users Collection

Required for webhook processing as the user's GitHub username is used to identify who owns the activity.

```javascript
{
  _id: ObjectId("..."),
  name: "User Name",
  email: "user@example.com",
  githubUsername: "github_username",
  github: {
    id: "github_id",
    accessToken: "github_token"
  }
}
```

### Activities Collection

Stores GitHub activities processed by the webhook.

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // References the user
  type: "commit",          // commit, pr, issue, release
  repo: "owner/repo",      // Repository full name
  title: "Commit message", // Title or summary
  description: "Details",  // Optional description
  githubUrl: "https://github.com/...", // Link to GitHub
  status: "pending",       // pending, processed, published
  createdAt: ISODate("..."),
  updatedAt: ISODate("..."),
  metadata: {             // Type-specific data
    commitSha: "hash",    // For commits
    prNumber: 123,        // For pull requests
    issueNumber: 456,     // For issues
    // other fields...
  }
}
```

## Advanced Troubleshooting

### Webhook Payload Inspection

To inspect the raw webhook payload:

1. Add temporary logging in `pages/api/webhooks/github.ts`:
   ```typescript
   console.log('Webhook Payload:', JSON.stringify(req.body, null, 2));
   console.log('Webhook Headers:', req.headers);
   ```

2. Trigger a webhook event and check your server logs

### Manual Webhook Testing

Use cURL to manually test your webhook endpoint:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=signature" \
  -d '{"repository":{"owner":{"login":"username"}}}' \
  http://localhost:3000/api/webhooks/github
```

### Database Validation

Check MongoDB validation rules:

```javascript
// In MongoDB shell or Compass
db.getCollectionInfos({name: "activities"})[0].options.validator
```

## Contact and Support

If you encounter persistent issues with the webhook integration, please:

1. Check the GitHub Issues section for similar problems
2. Create a new issue with detailed information about the problem
3. Include relevant logs, error messages, and steps to reproduce

For urgent support, contact the maintainers directly through the project's communication channels. 