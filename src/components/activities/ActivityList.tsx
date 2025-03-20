import React, { useState } from 'react';
import ActivityCard, { Activity } from './ActivityCard';
import PaginationControls from '../PaginationControls';

interface ActivityListProps {
  activities: Activity[];
  title?: string;
  perPage?: number;
  onSelectActivity?: (activity: Activity) => void;
  emptyMessage?: string;
}

const ActivityList: React.FC<ActivityListProps> = ({ 
  activities, 
  title = 'Recent Activities', 
  perPage = 5,
  onSelectActivity,
  emptyMessage = 'No activities found'
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(activities.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleActivityClick = (activity: Activity) => {
    if (onSelectActivity) {
      onSelectActivity(activity);
    }
  };

  // Create pagination object to match PaginationControls component props
  const pagination = {
    total: activities.length,
    page: currentPage,
    limit: perPage,
    pages: totalPages
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-4" data-testid="activity-list">
      <h2 className="text-xl font-semibold mb-4" data-testid="activity-list-title">{title}</h2>
      
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500" data-testid="empty-message">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentActivities.map((activity) => (
              <ActivityCard 
                key={activity._id} 
                activity={activity} 
                onClick={handleActivityClick}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-6">
              <PaginationControls 
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityList; 