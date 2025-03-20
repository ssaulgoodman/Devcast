import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession, useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

// Types for settings
type UserSettings = {
  postingFrequency: 'daily' | 'weekdays' | 'custom';
  customDays?: string[];
  postingTime: string;
  contentStyle: string;
  autoApprove: boolean;
};

export default function Settings() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings>({
    postingFrequency: 'daily',
    customDays: [],
    postingTime: '18:00',
    contentStyle: 'professional',
    autoApprove: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch user settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (session) {
        try {
          const response = await axios.get('/api/users/settings');
          if (response.data.settings) {
            setSettings(response.data.settings);
          }
        } catch (error) {
          console.error('Failed to fetch settings:', error);
          setMessage({
            text: 'Failed to load your settings. Using defaults.',
            type: 'error'
          });
        } finally {
          setIsFetching(false);
        }
      }
    };

    fetchSettings();
  }, [session]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setSettings({ ...settings, [name]: checked });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  // Handle custom days selection
  const handleDayToggle = (day: string) => {
    const currentDays = settings.customDays || [];
    
    if (currentDays.includes(day)) {
      setSettings({
        ...settings,
        customDays: currentDays.filter(d => d !== day)
      });
    } else {
      setSettings({
        ...settings,
        customDays: [...currentDays, day]
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.put('/api/users/settings', settings);
      
      setMessage({
        text: 'Settings updated successfully!',
        type: 'success'
      });
      
      // Update settings with the response (in case server did any normalization)
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setMessage({
        text: 'Failed to update settings. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-700">Loading...</p>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-700">Loading your settings...</p>
      </div>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Settings | DevCast</title>
      </Head>
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <div className="flex items-center">
            <Link href="/dashboard" legacyBehavior>
              <a className="text-gray-600 hover:text-gray-900">Back to Dashboard</a>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings form */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">Posting Preferences</h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure when and how your content is posted to Twitter/X.
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Notification message */}
              {message && (
                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {message.type === 'success' ? (
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {message.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Posting Frequency */}
              <div>
                <label htmlFor="postingFrequency" className="block text-sm font-medium text-gray-700">
                  Posting Frequency
                </label>
                <select
                  id="postingFrequency"
                  name="postingFrequency"
                  value={settings.postingFrequency}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays Only</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>
              
              {/* Custom Days (only shown if custom frequency is selected) */}
              {settings.postingFrequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Days
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {days.map((day) => (
                      <div key={day} className="flex items-center">
                        <input
                          id={`day-${day}`}
                          name={`day-${day}`}
                          type="checkbox"
                          checked={settings.customDays?.includes(day) || false}
                          onChange={() => handleDayToggle(day)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`day-${day}`} className="ml-2 block text-sm text-gray-700">
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Posting Time */}
              <div>
                <label htmlFor="postingTime" className="block text-sm font-medium text-gray-700">
                  Posting Time (UTC)
                </label>
                <input
                  type="time"
                  name="postingTime"
                  id="postingTime"
                  value={settings.postingTime}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">All times are in UTC.</p>
              </div>
              
              {/* Content Style */}
              <div>
                <label htmlFor="contentStyle" className="block text-sm font-medium text-gray-700">
                  Content Style
                </label>
                <select
                  id="contentStyle"
                  name="contentStyle"
                  value={settings.contentStyle}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
              
              {/* Auto Approve */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="autoApprove"
                    name="autoApprove"
                    type="checkbox"
                    checked={settings.autoApprove}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="autoApprove" className="font-medium text-gray-700">
                    Auto Approve Posts
                  </label>
                  <p className="text-gray-500">
                    Automatically approve and post content without Telegram approval.
                  </p>
                </div>
              </div>
              
              {/* Telegram Connect Button (placeholder) */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-lg font-medium text-gray-900">Telegram Connection</h3>
                <p className="mt-1 text-sm text-gray-500 mb-4">
                  Connect your Telegram account to receive notifications and approve posts.
                </p>
                
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.04.01-.19-.08-.27-.09-.08-.21-.05-.3-.03-.13.03-2.19 1.39-6.26 4.07-.59.41-1.13.6-1.6.58-.53-.02-1.54-.3-2.3-.55-.93-.31-1.67-.47-1.61-.99.03-.27.38-.54 1.05-.82 4.13-1.79 6.88-2.97 8.25-3.54 3.92-1.63 4.74-1.91 5.27-1.91.12 0 .37.03.54.16.15.12.19.28.21.45-.01.15-.02.3-.03.41z" />
                  </svg>
                  Connect with Telegram
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 text-right">
              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Danger Zone */}
        <div className="bg-white shadow overflow-hidden rounded-lg mt-8">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete All Content</h3>
              <p className="mt-1 text-sm text-gray-500">
                This will remove all your generated content. This action cannot be undone.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete All Content
              </button>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900">Disconnect Accounts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Disconnect your GitHub or Twitter/X account.
              </p>
              <div className="mt-3 flex space-x-4">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Disconnect GitHub
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Disconnect Twitter/X
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  // Redirect to sign in if not authenticated
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      session,
    },
  };
}; 