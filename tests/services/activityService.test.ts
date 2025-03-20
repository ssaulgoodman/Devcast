import axios from 'axios';
import {
  fetchActivities,
  updateActivityStatus,
  createActivity,
  deleteActivity,
  processActivities,
  publishActivities
} from '@/src/services/activityService';
import { Activity } from '@/src/components/activities/ActivityCard';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Add missing properties to the mock
mockedAxios.get = jest.fn();
mockedAxios.post = jest.fn();
mockedAxios.put = jest.fn();
mockedAxios.patch = jest.fn();
mockedAxios.delete = jest.fn();

describe('Activity Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchActivities', () => {
    it('fetches activities with correct parameters', async () => {
      const mockResponse = {
        data: {
          activities: [
            { _id: '1', title: 'Test Activity', repo: 'user/repo', type: 'commit', status: 'pending', createdAt: '2023-06-15' }
          ],
          pagination: { total: 1, page: 1, limit: 10, pages: 1 }
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchActivities(1, 10, 'pending');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/activities?page=1&limit=10&status=pending');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await fetchActivities(1, 10);
      
      expect(result).toEqual({
        activities: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 0 }
      });
    });
  });

  describe('updateActivityStatus', () => {
    it('updates an activity status correctly', async () => {
      const mockActivity = { 
        _id: '1', 
        title: 'Test Activity', 
        repo: 'user/repo', 
        type: 'commit' as const, 
        status: 'processed' as const, 
        createdAt: '2023-06-15' 
      };
      
      mockedAxios.patch.mockResolvedValueOnce({ data: mockActivity });
      
      const result = await updateActivityStatus('1', 'processed');
      
      expect(mockedAxios.patch).toHaveBeenCalledWith('/api/activities/1', { status: 'processed' });
      expect(result).toEqual(mockActivity);
    });

    it('returns null on error', async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await updateActivityStatus('1', 'processed');
      
      expect(result).toBeNull();
    });
  });

  describe('createActivity', () => {
    it('creates a new activity correctly', async () => {
      const newActivity: Omit<Activity, '_id'> = {
        title: 'New Activity',
        repo: 'user/repo',
        type: 'pr',
        status: 'pending',
        createdAt: '2023-06-15'
      };
      
      const createdActivity: Activity = {
        _id: '2',
        ...newActivity
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: createdActivity });
      
      const result = await createActivity(newActivity);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/activities', newActivity);
      expect(result).toEqual(createdActivity);
    });

    it('returns null on error', async () => {
      const newActivity: Omit<Activity, '_id'> = {
        title: 'New Activity',
        repo: 'user/repo',
        type: 'pr',
        status: 'pending',
        createdAt: '2023-06-15'
      };
      
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await createActivity(newActivity);
      
      expect(result).toBeNull();
    });
  });

  describe('deleteActivity', () => {
    it('deletes an activity correctly', async () => {
      mockedAxios.delete.mockResolvedValueOnce({});
      
      const result = await deleteActivity('1');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/activities/1');
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mockedAxios.delete.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await deleteActivity('1');
      
      expect(result).toBe(false);
    });
  });

  describe('processActivities', () => {
    it('processes activities correctly', async () => {
      mockedAxios.post.mockResolvedValueOnce({});
      
      const result = await processActivities(['1', '2', '3']);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/activities/process', { activityIds: ['1', '2', '3'] });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await processActivities(['1', '2', '3']);
      
      expect(result).toBe(false);
    });
  });

  describe('publishActivities', () => {
    it('publishes activities correctly', async () => {
      mockedAxios.post.mockResolvedValueOnce({});
      
      const result = await publishActivities(['1', '2', '3']);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/activities/publish', { activityIds: ['1', '2', '3'] });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await publishActivities(['1', '2', '3']);
      
      expect(result).toBe(false);
    });
  });
}); 