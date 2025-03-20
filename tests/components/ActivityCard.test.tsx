import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityCard, { Activity } from '@/src/components/activities/ActivityCard';

describe('ActivityCard', () => {
  const mockActivity: Activity = {
    _id: '1',
    type: 'commit',
    repo: 'user/test-repo',
    title: 'Initial commit',
    createdAt: '2023-06-15T10:00:00Z',
    status: 'pending'
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders activity card with correct information', () => {
    render(<ActivityCard activity={mockActivity} />);
    
    expect(screen.getByTestId('activity-card')).toBeInTheDocument();
    expect(screen.getByTestId('activity-title')).toHaveTextContent('Initial commit');
    expect(screen.getByTestId('activity-repo')).toHaveTextContent('user/test-repo');
    expect(screen.getByTestId('activity-status')).toHaveTextContent('pending');
    
    // Check for date formatting
    const dateElement = screen.getByTestId('activity-date');
    expect(dateElement).toBeInTheDocument();
    // We're not testing the exact formatted date since it depends on the user's locale
    // Just verifying it contains the year 2023
    expect(dateElement.textContent).toContain('2023');
  });

  it('calls onClick handler when clicked', () => {
    render(<ActivityCard activity={mockActivity} onClick={mockOnClick} />);
    
    const card = screen.getByTestId('activity-card');
    fireEvent.click(card);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(mockActivity);
  });

  it('displays different styles based on status', () => {
    // Test for pending status
    const { rerender } = render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByTestId('activity-status')).toHaveClass('bg-yellow-100');
    expect(screen.getByTestId('activity-status')).toHaveClass('text-yellow-800');

    // Test for processed status
    rerender(<ActivityCard activity={{ ...mockActivity, status: 'processed' }} />);
    expect(screen.getByTestId('activity-status')).toHaveClass('bg-green-100');
    expect(screen.getByTestId('activity-status')).toHaveClass('text-green-800');

    // Test for published status
    rerender(<ActivityCard activity={{ ...mockActivity, status: 'published' }} />);
    expect(screen.getByTestId('activity-status')).toHaveClass('bg-blue-100');
    expect(screen.getByTestId('activity-status')).toHaveClass('text-blue-800');
  });

  it('renders different icons based on activity type', () => {
    const { rerender } = render(<ActivityCard activity={mockActivity} />);
    
    // For commit type (default in our mock)
    let svg = screen.getByTestId('activity-card').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-gray-500');
    
    // Test PR type
    rerender(<ActivityCard activity={{ ...mockActivity, type: 'pr' }} />);
    svg = screen.getByTestId('activity-card').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-purple-500');
    
    // Test issue type
    rerender(<ActivityCard activity={{ ...mockActivity, type: 'issue' }} />);
    svg = screen.getByTestId('activity-card').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-red-500');
    
    // Test release type
    rerender(<ActivityCard activity={{ ...mockActivity, type: 'release' }} />);
    svg = screen.getByTestId('activity-card').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-blue-500');
  });
}); 