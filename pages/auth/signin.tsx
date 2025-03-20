import React from 'react';
import { GetServerSideProps } from 'next';
import { getProviders, signIn, getCsrfToken } from 'next-auth/react';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';

type SignInProps = {
  providers: Record<string, {
    id: string;
    name: string;
    type: string;
  }>;
  csrfToken: string;
};

export default function SignIn({ providers, csrfToken }: SignInProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Head>
        <title>Sign In | DevCast</title>
      </Head>
      
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to DevCast</h1>
          <p className="mt-2 text-gray-600">
            Automatically create social media content from your development activities
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          {Object.values(providers).map((provider) => (
            <div key={provider.id} className="w-full">
              <button
                onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                className={`w-full py-3 px-4 rounded-md flex items-center justify-center font-medium text-white
                  ${provider.id === 'github' ? 'bg-gray-800 hover:bg-gray-700' : ''}
                  ${provider.id === 'twitter' ? 'bg-blue-400 hover:bg-blue-500' : ''}
                `}
              >
                {provider.id === 'github' && (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" clipRule="evenodd" />
                  </svg>
                )}
                {provider.id === 'twitter' && (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                )}
                Sign in with {provider.name}
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-800">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  // Redirect to dashboard if already signed in
  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
  
  const providers = await getProviders();
  const csrfToken = await getCsrfToken(context);
  
  return {
    props: {
      providers: providers ?? {},
      csrfToken: csrfToken ?? '',
    },
  };
}; 