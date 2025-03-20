import React from 'react';

export type ActivityType = 'commit' | 'pr' | 'issue' | 'release';
export type ActivityStatus = 'pending' | 'processed' | 'published';

export interface Activity {
  _id: string;
  type: ActivityType;
  repo: string;
  title: string;
  description?: string;
  createdAt: string;
  status: ActivityStatus;
}

interface ActivityCardProps {
  activity: Activity;
  onClick?: (activity: Activity) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onClick }) => {
  const { type, title, repo, createdAt, status } = activity;
  
  const handleClick = () => {
    if (onClick) {
      onClick(activity);
    }
  };
  
  // Format date to a more readable format
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  // Status badge styles based on activity status
  const getStatusStyles = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Icon based on activity type
  const getActivityIcon = () => {
    switch (type) {
      case 'commit':
        return (
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'pr':
        return (
          <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        );
      case 'issue':
        return (
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'release':
        return (
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
      data-testid="activity-card"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getActivityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate" data-testid="activity-title">
              {title}
            </p>
            <p className="text-sm text-gray-500" data-testid="activity-date">
              {formattedDate}
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-1" data-testid="activity-repo">
            {repo}
          </p>
          <div className="mt-2">
            <span 
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}
              data-testid="activity-status"
            >
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard; 