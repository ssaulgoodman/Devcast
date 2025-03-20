import React from 'react';
import { signOut } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';

export default function SignOut() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Head>
        <title>Sign Out | DevCast</title>
      </Head>
      
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign Out</h1>
          <p className="mt-2 text-gray-600">
            Are you sure you want to sign out of DevCast?
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full py-3 px-4 rounded-md flex items-center justify-center font-medium text-white bg-red-500 hover:bg-red-600"
          >
            Yes, Sign Me Out
          </button>
          
          <Link href="/dashboard" legacyBehavior>
            <a className="w-full py-3 px-4 rounded-md flex items-center justify-center font-medium text-gray-700 bg-gray-200 hover:bg-gray-300">
              No, Take Me Back
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  // Redirect to home if not signed in
  if (!session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}; 