import axios from 'axios';
import { Activity } from '@/components/activities/ActivityCard';

export interface ActivityResponse {
  activities: Activity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Fetches activity data from the API with pagination support
 */
export const fetchActivities = async (page = 1, limit = 10, status?: string): Promise<ActivityResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) {
      params.append('status', status);
    }

    const response = await axios.get<ActivityResponse>(`/api/activities?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching activities:', error);
    // Return empty result on error
    return {
      activities: [],
      pagination: {
        total: 0,
        page: page,
        limit: limit,
        pages: 0
      }
    };
  }
};

/**
 * Updates the status of an activity
 */
export const updateActivityStatus = async (activityId: string, status: string): Promise<Activity | null> => {
  try {
    const response = await axios.patch<Activity>(`/api/activities/${activityId}`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating activity status:', error);
    return null;
  }
};

/**
 * Creates a new activity for a given repository action
 */
export const createActivity = async (activityData: Omit<Activity, '_id'>): Promise<Activity | null> => {
  try {
    const response = await axios.post<Activity>('/api/activities', activityData);
    return response.data;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
};

/**
 * Deletes an activity
 */
export const deleteActivity = async (activityId: string): Promise<boolean> => {
  try {
    await axios.delete(`/api/activities/${activityId}`);
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    return false;
  }
};

/**
 * Processes pending activities (convert to content)
 */
export const processActivities = async (activityIds: string[]): Promise<boolean> => {
  try {
    await axios.post('/api/activities/process', { activityIds });
    return true;
  } catch (error) {
    console.error('Error processing activities:', error);
    return false;
  }
};

/**
 * Publishes processed activities to social media
 */
export const publishActivities = async (activityIds: string[]): Promise<boolean> => {
  try {
    await axios.post('/api/activities/publish', { activityIds });
    return true;
  } catch (error) {
    console.error('Error publishing activities:', error);
    return false;
  }
}; 