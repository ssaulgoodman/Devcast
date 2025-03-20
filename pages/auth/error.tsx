import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link may have expired or has already been used.';
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
      case 'OAuthAccountNotLinked':
        return 'There was a problem with your authentication. Please try again.';
      case 'EmailSignin':
        return 'The e-mail could not be sent.';
      case 'CredentialsSignin':
        return 'The sign in details you provided were invalid.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Head>
        <title>Authentication Error | DevCast</title>
      </Head>
      
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-red-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-red-600">
            {error ? getErrorMessage(error as string) : 'An error occurred during authentication.'}
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link href="/auth/signin" legacyBehavior>
            <a className="w-full py-3 px-4 rounded-md flex items-center justify-center font-medium text-white bg-blue-600 hover:bg-blue-700">
              Try Again
            </a>
          </Link>
          
          <Link href="/" legacyBehavior>
            <a className="w-full py-3 px-4 rounded-md flex items-center justify-center font-medium text-gray-700 bg-gray-200 hover:bg-gray-300">
              Go to Home Page
            </a>
          </Link>
        </div>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-800">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
}; 