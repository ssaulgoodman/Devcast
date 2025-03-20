import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import handler from '@/pages/api/activities/process';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  getSession: jest.fn()
}));
jest.mock('@/src/utils/database', () => jest.fn());
jest.mock('@/src/models/Activity', () => ({
  Activity: {
    find: jest.fn(),
  }
}));

// Mock mongoose without requiring the actual module
jest.mock('mongoose', () => {
  // Create a mock ObjectId class
  class ObjectId {
    id: string;
    
    constructor(id: string) {
      this.id = id;
    }
    
    toString(): string {
      return this.id;
    }
    
    static isValid(id: string): boolean {
      return true;
    }
  }
  
  // Set up the jest mock for isValid
  jest.spyOn(ObjectId, 'isValid').mockImplementation(() => true);
  
  return {
    Types: {
      ObjectId
    }
  };
});

describe('Process Activities API', () => {
  // Set up request and response mocks
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse> & { 
    json: jest.Mock;
    status: jest.Mock;
    setHeader: jest.Mock;
  };
  
  // Import and mock Activity model
  const { Activity } = require('@/src/models/Activity');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up request and response for each test
    req = {
      method: 'POST',
      body: {
        activityIds: ['123456789012345678901234', '234567890123456789012345']
      }
    };
    
    // Create a properly typed mock response object
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    
    res = {
      json,
      status,
      setHeader
    } as any;
    
    // Mock authentication
    (getSession as jest.Mock).mockResolvedValue({
      user: {
        id: '987654321098765432109876'
      }
    });

    // Mock saving activities
    const mockSave = jest.fn().mockResolvedValue(true);
    
    // Mock activities found in database
    const mockActivities = [
      {
        _id: '123456789012345678901234',
        type: 'commit',
        repo: 'user/repo',
        title: 'Initial commit',
        description: 'Sets up the project',
        status: 'pending',
        userId: '987654321098765432109876',
        save: mockSave
      },
      {
        _id: '234567890123456789012345',
        type: 'pr',
        repo: 'user/repo',
        title: 'Add login feature',
        description: 'Implements user authentication',
        status: 'pending',
        userId: '987654321098765432109876',
        save: mockSave
      }
    ];
    
    Activity.find.mockResolvedValue(mockActivities);
  });

  it('returns 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method GET not allowed' });
  });

  it('returns 401 when not authenticated', async () => {
    (getSession as jest.Mock).mockResolvedValueOnce(null);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });

  it('returns 400 when no activity IDs provided', async () => {
    req.body = { activityIds: [] };
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No activity IDs provided' });
  });

  it('returns 404 when no matching activities found', async () => {
    Activity.find.mockResolvedValueOnce([]);
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No pending activities found with the provided IDs' });
  });

  it('processes activities successfully', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(Activity.find).toHaveBeenCalledWith({
      _id: { $in: ['123456789012345678901234', '234567890123456789012345'] },
      userId: expect.anything(),
      status: 'pending'
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: '2 activities processed successfully',
      activities: expect.arrayContaining([
        expect.objectContaining({
          _id: '123456789012345678901234',
          content: expect.any(String),
          status: 'processed',
          processedAt: expect.any(Date)
        }),
        expect.objectContaining({
          _id: '234567890123456789012345',
          content: expect.any(String),
          status: 'processed',
          processedAt: expect.any(Date)
        })
      ])
    });
  });
}); 