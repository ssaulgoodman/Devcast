import { render, screen } from '@testing-library/react';
import SignIn from '@/pages/auth/signin';
import { getProviders, getCsrfToken } from 'next-auth/react';

// Mock the getProviders and getCsrfToken functions
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react');
  return {
    __esModule: true,
    ...originalModule,
    getProviders: jest.fn(),
    getCsrfToken: jest.fn(),
  };
});

describe('SignIn Page', () => {
  const mockProviders = {
    github: {
      id: 'github',
      name: 'GitHub',
      type: 'oauth',
    },
    twitter: {
      id: 'twitter',
      name: 'Twitter',
      type: 'oauth',
    },
  };

  beforeEach(() => {
    (getProviders as jest.Mock).mockResolvedValue(mockProviders);
    (getCsrfToken as jest.Mock).mockResolvedValue('mock-csrf-token');
  });

  it('renders signin page with provider buttons', () => {
    render(
      <SignIn 
        providers={mockProviders} 
        csrfToken="mock-csrf-token" 
      />
    );

    // Check for main heading and description
    expect(screen.getByText('Welcome to DevCast')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Automatically create social media content from your development activities'
      )
    ).toBeInTheDocument();

    // Check for provider buttons
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Twitter')).toBeInTheDocument();

    // Check for terms and privacy links
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('displays the correct provider icons', () => {
    render(
      <SignIn 
        providers={mockProviders} 
        csrfToken="mock-csrf-token" 
      />
    );

    // Find the SVG icons
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBe(2); // One for GitHub, one for Twitter
  });
}); 