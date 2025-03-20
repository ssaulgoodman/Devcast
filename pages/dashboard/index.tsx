import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession, useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

// Types
type Activity = {
  _id: string;
  type: 'commit' | 'pr' | 'issue' | 'release';
  repo: string;
  title: string;
  createdAt: string;
  status: 'pending' | 'processed' | 'published';
};

type Content = {
  _id: string;
  text: string;
  createdAt: string;
  activityIds: string[];
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'edited';
  postUrl?: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export default function Dashboard() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState<'activities' | 'content'>('activities');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityPagination, setActivityPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [contentPagination, setContentPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    if (session) {
      fetchActivities();
      fetchContent();
    }
  }, [session]);

  // Fetch activities from API
  const fetchActivities = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/activities?page=${page}&limit=10`);
      
      if (response.data.activities) {
        setActivities(response.data.activities);
        setActivityPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to fetch activities. Please try again later.');
      
      // Use empty array if fetch fails
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch content from API
  const fetchContent = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/content?page=${page}&limit=10`);
      
      if (response.data.content) {
        setContent(response.data.content);
        setContentPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
      setError('Failed to fetch content. Please try again later.');
      
      // Use empty array if fetch fails
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pagination for activities
  const handleActivityPageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= activityPagination.pages) {
      fetchActivities(newPage);
    }
  };

  // Handle pagination for content
  const handleContentPageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= contentPagination.pages) {
      fetchContent(newPage);
    }
  };

  // Handle content action (approve, reject, etc.)
  const handleContentAction = async (contentId: string, action: 'approve' | 'reject', text?: string) => {
    try {
      setIsLoading(true);
      
      const payload: any = { contentId, action };
      if (text) {
        payload.text = text;
      }
      
      await axios.put('/api/content', payload);
      
      // Refresh content after action
      fetchContent(contentPagination.page);
    } catch (err) {
      console.error(`Failed to ${action} content:`, err);
      setError(`Failed to ${action} content. Please try again later.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (contentId: string) => handleContentAction(contentId, 'approve');
  const handleReject = (contentId: string) => handleContentAction(contentId, 'reject');

  // Show loading state
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-700">Loading...</p>
      </div>
    );
  }

  // Render pagination controls
  const PaginationControls = ({ pagination, onPageChange }: { 
    pagination: Pagination, 
    onPageChange: (page: number) => void 
  }) => (
    <div className="mt-4 flex justify-center">
      <nav className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className={`px-3 py-1 rounded-md ${
            pagination.page === 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Previous
        </button>
        
        <span className="text-sm text-gray-700">
          Page {pagination.page} of {pagination.pages || 1}
        </span>
        
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages || pagination.pages === 0}
          className={`px-3 py-1 rounded-md ${
            pagination.page === pagination.pages || pagination.pages === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Next
        </button>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Dashboard | DevCast</title>
      </Head>
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center">
            <Link href="/dashboard/settings" legacyBehavior>
              <a className="mr-4 text-gray-600 hover:text-gray-900">Settings</a>
            </Link>
            <Link href="/auth/signout" legacyBehavior>
              <a className="text-red-600 hover:text-red-800">Sign Out</a>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button 
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* User info and stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center">
            {session.user?.image && (
              <img 
                src={session.user.image} 
                alt={session.user?.name || 'User'} 
                className="w-16 h-16 rounded-full mr-4" 
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{session.user?.name}</h2>
              <p className="text-gray-600">{session.user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-700">Activities</h3>
              <p className="text-3xl font-bold text-blue-900">{activityPagination.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-700">Pending Posts</h3>
              <p className="text-3xl font-bold text-green-900">
                {content.filter(c => c.status === 'pending' || c.status === 'approved').length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-700">Published Posts</h3>
              <p className="text-3xl font-bold text-purple-900">
                {content.filter(c => c.status === 'posted').length}
              </p>
            </div>
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-1 mr-8 font-medium text-sm border-b-2 ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              GitHub Activities
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`py-4 px-1 mr-8 font-medium text-sm border-b-2 ${
                activeTab === 'content'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generated Content
            </button>
          </nav>
        </div>
        
        {/* Activities tab content */}
        {activeTab === 'activities' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent GitHub Activities</h2>
            
            {isLoading && activeTab === 'activities' ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading activities...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <li key={activity._id} className="p-4">
                        <div className="flex items-start">
                          <div className="mr-4">
                            {activity.type === 'commit' && (
                              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {activity.type === 'pr' && (
                              <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            )}
                            {activity.type === 'issue' && (
                              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {activity.type === 'release' && (
                              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{activity.repo}</p>
                            <div className="mt-2">
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                  ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${activity.status === 'processed' ? 'bg-green-100 text-green-800' : ''}
                                  ${activity.status === 'published' ? 'bg-blue-100 text-blue-800' : ''}
                                `}
                              >
                                {activity.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-4 text-center text-gray-500">No activities found.</li>
                  )}
                </ul>
                
                {activities.length > 0 && (
                  <PaginationControls 
                    pagination={activityPagination} 
                    onPageChange={handleActivityPageChange} 
                  />
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Content tab content */}
        {activeTab === 'content' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Content</h2>
            
            {isLoading && activeTab === 'content' ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading content...</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {content.length > 0 ? (
                    content.map((item) => (
                      <li key={item._id} className="p-4">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${item.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                                ${item.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                                ${item.status === 'posted' ? 'bg-blue-100 text-blue-800' : ''}
                                ${item.status === 'edited' ? 'bg-purple-100 text-purple-800' : ''}
                              `}
                            >
                              {item.status}
                            </span>
                            <p className="text-sm text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="mt-2 text-gray-900">{item.text}</p>
                          
                          {item.status === 'posted' && item.postUrl && (
                            <a 
                              href={item.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View on Twitter
                            </a>
                          )}
                          
                          {item.status === 'pending' && (
                            <div className="mt-4 flex space-x-4">
                              <button 
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                                onClick={() => handleApprove(item._id)}
                                disabled={isLoading}
                              >
                                Approve
                              </button>
                              <button 
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                                onClick={() => handleReject(item._id)}
                                disabled={isLoading}
                              >
                                Reject
                              </button>
                              <button className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm">
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="p-4 text-center text-gray-500">No content generated yet.</li>
                  )}
                </ul>
                
                {content.length > 0 && (
                  <PaginationControls 
                    pagination={contentPagination} 
                    onPageChange={handleContentPageChange} 
                  />
                )}
              </div>
            )}
          </div>
        )}
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