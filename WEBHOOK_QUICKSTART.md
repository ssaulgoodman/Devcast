# GitHub Webhook Quick Start Guide

This guide will help you quickly set up and test the GitHub webhook integration for DevCast.

## Prerequisites

- Node.js (v18+)
- MongoDB installed and running
- Docker (optional)
- ngrok (for local development)
- A GitHub account and test repository

## Setup Steps

### 1. Environment Configuration

Ensure your `.env` file has these variables set:

```
APP_ENV=development
MONGODB_URI=mongodb://localhost:27017/devcast
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

For the webhook secret, use a secure random string (e.g., `openssl rand -hex 20`).

### 2. Database Setup

Start MongoDB:

```bash
# Using local MongoDB
mongod --dbpath ~/data/db

# Or using Docker
docker run --name mongodb -p 27017:27017 -d mongo
```

Create a test user in the database:

```bash
node -e "
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

async function createUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const result = await db.collection('users').insertOne({
    _id: new ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    githubUsername: 'your-github-username',
    github: {
      id: 'github_id',
      username: 'your-github-username',
      accessToken: 'test_access_token'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log('Created test user with ID:', result.insertedId);
  await client.close();
}

createUser().catch(console.error);
"
```

### 3. Start the Development Server

```bash
npm run dev
```

This will start the Next.js development server, typically on port 3000.

### 4. Expose Your Local Server

Use ngrok to expose your local server:

```bash
ngrok http 3000
```

Ngrok will provide a public URL (e.g., `https://abc123.ngrok-free.app`). Save this URL as you'll need it to configure the GitHub webhook.

### 5. Configure the GitHub Webhook

1. Go to your test GitHub repository
2. Navigate to Settings → Webhooks → Add webhook
3. Configure the webhook:
   - Payload URL: `https://your-ngrok-url.ngrok-free.app/api/webhooks/github`
   - Content type: `application/json`
   - Secret: The same secret you used in your `.env` file
   - Events: Select "Send me everything" or choose specific events (Pushes, Pull Requests, Issues)
   - Click "Add webhook"

### 6. Test Local Webhook Simulation

Use the built-in test script to simulate a webhook event:

```bash
node webhook-test.js
```

This script will:
1. Generate a proper webhook signature using your secret
2. Send a test payload to your webhook endpoint
3. Check if activities were created in the database

### 7. Test with Real GitHub Events

Make a change to your GitHub repository to trigger an actual webhook:

1. Create or edit a file in your repository
2. Commit and push the change
3. Check GitHub webhook deliveries (in repository Settings → Webhooks) to confirm a 200 OK response
4. Verify the activity was created in your database:

```bash
node show-activities.js
```

## Debugging

If you encounter issues, check these common areas:

1. **Webhook Reception**: 
   - GitHub webhook dashboard should show successful deliveries
   - Server logs should show webhook requests

2. **Database Connection**: 
   - Use `node create-test-activity.js` to verify direct database connections

3. **User Lookup**: 
   - Ensure the GitHub username in the test repository matches the user in your database

4. **MongoDB Running**: 
   - Check that MongoDB is running (`docker ps` or `ps aux | grep mongo`)

For more detailed troubleshooting, see `WEBHOOK_TROUBLESHOOTING.md`.

## Testing Scripts

DevCast includes these handy scripts for webhook testing:

- `webhook-test.js`: Test the webhook endpoint with a simulated GitHub payload
- `create-test-activity.js`: Create a test activity directly in the database
- `show-activities.js`: Display all activities in the database
- `check-database.js`: Check database connection and show users and activities

## Webhook Event Flow

1. **GitHub Event** → GitHub generates webhook payload
2. **Webhook Reception** → `/api/webhooks/github` receives and validates the payload
3. **User Lookup** → System finds the user associated with the repository
4. **Activity Creation** → GitHubService creates new activities
5. **Database Storage** → Activities are stored in MongoDB

## Next Steps

Once you've verified webhook functionality:

1. Implement front-end components to display activities
2. Connect activities to content generation
3. Build the approval workflow for generated content
4. Develop social media posting functionality

Refer to the main `README.md` for the complete project roadmap. 