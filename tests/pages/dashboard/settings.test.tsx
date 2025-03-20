import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from '@/pages/dashboard/settings';
import { useSession } from 'next-auth/react';
import axios from 'axios';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  getSession: jest.fn(),
}));

// Mock axios
jest.mock('axios');

describe('Settings Page', () => {
  // Mock user session
  const mockSession = {
    expires: '1',
    user: { email: 'test@example.com', name: 'Test User', id: 'user_123' },
  };

  // Mock settings
  const mockSettings = {
    postingFrequency: 'daily',
    customDays: [],
    postingTime: '18:00',
    contentStyle: 'professional',
    autoApprove: false,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock session
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    // Mock axios.get for fetching settings
    (axios.get as jest.Mock).mockResolvedValue({
      data: { settings: mockSettings },
    });

    // Mock axios.put for updating settings
    (axios.put as jest.Mock).mockResolvedValue({
      data: { message: 'Settings updated successfully!', settings: mockSettings },
    });
  });

  it('renders loading state initially', () => {
    render(<Settings />);
    expect(screen.getByText('Loading your settings...')).toBeInTheDocument();
  });

  it('renders the settings form after loading', async () => {
    render(<Settings />);
    
    // After fetching settings, the form should be displayed
    await waitFor(() => {
      expect(screen.getByText('Posting Preferences')).toBeInTheDocument();
    });

    // Check for form elements
    expect(screen.getByLabelText(/Posting Frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Posting Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Content Style/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Auto Approve Posts/i)).toBeInTheDocument();
  });

  it('updates settings on form submit', async () => {
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Posting Preferences')).toBeInTheDocument();
    });

    // Change content style
    fireEvent.change(screen.getByLabelText(/Content Style/i), { 
      target: { value: 'casual' } 
    });

    // Toggle auto approve
    fireEvent.click(screen.getByLabelText(/Auto Approve Posts/i));

    // Submit form
    fireEvent.click(screen.getByText('Save Settings'));

    // Check loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Check if axios.put was called with updated settings
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/users/settings', {
        ...mockSettings,
        contentStyle: 'casual',
        autoApprove: true,
      });
    });

    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Settings updated successfully!')).toBeInTheDocument();
    });
  });

  it('shows custom days selection when custom schedule is selected', async () => {
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Posting Preferences')).toBeInTheDocument();
    });

    // Change posting frequency to custom
    fireEvent.change(screen.getByLabelText(/Posting Frequency/i), { 
      target: { value: 'custom' } 
    });

    // Check if the custom days selection is visible
    expect(screen.getByText('Select Days')).toBeInTheDocument();
    expect(screen.getByLabelText(/Monday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sunday/i)).toBeInTheDocument();

    // Select a day
    fireEvent.click(screen.getByLabelText(/Wednesday/i));

    // Submit form
    fireEvent.click(screen.getByText('Save Settings'));

    // Check if axios.put was called with updated settings including the selected day
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/users/settings', {
        ...mockSettings,
        postingFrequency: 'custom',
        customDays: ['Wednesday'],
      });
    });
  });

  it('displays an error message when settings fetch fails', async () => {
    // Mock axios.get to reject
    (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load your settings. Using defaults.')).toBeInTheDocument();
    });

    // Form should still be displayed with default values
    expect(screen.getByLabelText(/Posting Frequency/i)).toBeInTheDocument();
  });

  it('displays an error message when settings update fails', async () => {
    // Mock axios.put to reject
    (axios.put as jest.Mock).mockRejectedValue(new Error('Network Error'));

    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Posting Preferences')).toBeInTheDocument();
    });

    // Submit form
    fireEvent.click(screen.getByText('Save Settings'));

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Failed to update settings. Please try again.')).toBeInTheDocument();
    });
  });
}); 