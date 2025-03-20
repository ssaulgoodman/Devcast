import { createMocks } from 'node-mocks-http';
import settingsHandler from '../../../../pages/api/users/settings';
import { getSession } from 'next-auth/react';
import { User } from '../../../../src/models/User';

// Mocking the next-auth session
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));

// Mocking the database connection and User model
jest.mock('../../../../src/utils/database', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve()),
}));

jest.mock('../../../../src/models/User', () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

describe('/api/users/settings', () => {
  const mockUser = {
    _id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    settings: {
      postingFrequency: 'daily',
      customDays: [],
      postingTime: '18:00',
      contentStyle: 'professional',
      autoApprove: false,
    },
  };

  const mockSession = {
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
    user: { 
      name: "Test User", 
      email: "test@example.com", 
      id: "user_123"
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUser,
      settings: {
        ...mockUser.settings,
        contentStyle: 'casual',
      },
    });
  });

  it('returns 401 if user is not authenticated', async () => {
    // Mock an unauthenticated session
    (getSession as jest.Mock).mockResolvedValueOnce(null);
    
    const { req, res } = createMocks({
      method: 'GET',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ 
      error: 'You must be signed in to access this endpoint' 
    });
  });

  it('returns user settings for GET request', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await settingsHandler(req, res);

    expect(User.findById).toHaveBeenCalledWith('user_123');
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ 
      settings: mockUser.settings 
    });
  });

  it('updates user settings for PUT request', async () => {
    const updatedSettings = {
      postingFrequency: 'daily',
      postingTime: '19:00',
      contentStyle: 'casual',
      autoApprove: true,
    };

    const { req, res } = createMocks({
      method: 'PUT',
      body: updatedSettings,
    });

    await settingsHandler(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user_123',
      {
        settings: {
          postingFrequency: 'daily',
          customDays: [],
          postingTime: '19:00',
          contentStyle: 'casual',
          autoApprove: true,
        },
      },
      { new: true }
    );
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty('message', 'Settings updated successfully');
  });

  it('returns 400 for PUT request with missing fields', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        // Missing required fields
        autoApprove: true,
      },
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ 
      error: 'Missing required fields' 
    });
  });

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
    });

    await settingsHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ 
      error: 'Method DELETE not allowed' 
    });
  });
}); 