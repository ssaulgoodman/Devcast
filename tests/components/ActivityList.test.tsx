import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityList from '@/src/components/activities/ActivityList';
import { Activity } from '@/src/components/activities/ActivityCard';

// Mock the PaginationControls component to simplify testing
jest.mock('@/src/components/PaginationControls', () => {
  return function MockPaginationControls({ pagination, onPageChange }: any) {
    return (
      <div data-testid="pagination-controls">
        <button 
          data-testid="prev-page"
          onClick={() => pagination.page > 1 && onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Previous
        </button>
        <span data-testid="current-page">{pagination.page}</span>
        <button 
          data-testid="next-page"
          onClick={() => pagination.page < pagination.pages && onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
        >
          Next
        </button>
      </div>
    );
  };
});

describe('ActivityList', () => {
  const mockActivities: Activity[] = [
    {
      _id: '1',
      type: 'commit',
      repo: 'user/repo-1',
      title: 'Initial commit',
      createdAt: '2023-06-15T10:00:00Z',
      status: 'pending'
    },
    {
      _id: '2',
      type: 'pr',
      repo: 'user/repo-1',
      title: 'Feature: Add login page',
      createdAt: '2023-06-16T10:00:00Z',
      status: 'processed'
    },
    {
      _id: '3',
      type: 'issue',
      repo: 'user/repo-2',
      title: 'Bug: Fix navigation',
      createdAt: '2023-06-17T10:00:00Z',
      status: 'published'
    },
    {
      _id: '4',
      type: 'release',
      repo: 'user/repo-2',
      title: 'Release v1.0.0',
      createdAt: '2023-06-18T10:00:00Z',
      status: 'published'
    },
    {
      _id: '5',
      type: 'commit',
      repo: 'user/repo-3',
      title: 'Fix: Update dependencies',
      createdAt: '2023-06-19T10:00:00Z',
      status: 'pending'
    },
    {
      _id: '6',
      type: 'pr',
      repo: 'user/repo-3',
      title: 'Feature: Add settings page',
      createdAt: '2023-06-20T10:00:00Z',
      status: 'processed'
    },
  ];

  const mockOnSelectActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title', () => {
    render(<ActivityList activities={mockActivities} title="Test Title" />);
    expect(screen.getByTestId('activity-list-title')).toHaveTextContent('Test Title');
  });

  it('shows empty message when no activities are provided', () => {
    render(<ActivityList activities={[]} emptyMessage="Custom empty message" />);
    expect(screen.getByTestId('empty-message')).toHaveTextContent('Custom empty message');
  });

  it('renders activity cards for current page only', () => {
    render(<ActivityList activities={mockActivities} perPage={3} />);
    
    // Check that we have exactly 3 cards on the first page (default)
    const activityCards = screen.getAllByTestId('activity-card');
    expect(activityCards).toHaveLength(3);
    
    // Verify first page items
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText('Feature: Add login page')).toBeInTheDocument();
    expect(screen.getByText('Bug: Fix navigation')).toBeInTheDocument();
    
    // Verify second page items are not visible
    expect(screen.queryByText('Release v1.0.0')).not.toBeInTheDocument();
  });

  it('shows pagination controls when there are multiple pages', () => {
    render(<ActivityList activities={mockActivities} perPage={3} />);
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
  });

  it('does not show pagination controls when all items fit on one page', () => {
    render(<ActivityList activities={mockActivities} perPage={10} />);
    expect(screen.queryByTestId('pagination-controls')).not.toBeInTheDocument();
  });

  it('calls onSelectActivity when an activity card is clicked', () => {
    render(<ActivityList 
      activities={mockActivities} 
      onSelectActivity={mockOnSelectActivity}
    />);
    
    const firstCard = screen.getAllByTestId('activity-card')[0];
    fireEvent.click(firstCard);
    
    expect(mockOnSelectActivity).toHaveBeenCalledTimes(1);
    expect(mockOnSelectActivity).toHaveBeenCalledWith(mockActivities[0]);
  });

  it('changes page when pagination controls are used', () => {
    render(<ActivityList activities={mockActivities} perPage={2} />);
    
    // Verify first page items
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText('Feature: Add login page')).toBeInTheDocument();
    
    // Go to next page
    fireEvent.click(screen.getByTestId('next-page'));
    
    // Verify second page items
    expect(screen.getByText('Bug: Fix navigation')).toBeInTheDocument();
    expect(screen.getByText('Release v1.0.0')).toBeInTheDocument();
    
    // Verify first page items are no longer visible
    expect(screen.queryByText('Initial commit')).not.toBeInTheDocument();
  });
}); 