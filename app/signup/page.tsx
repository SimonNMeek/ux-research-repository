"use client";

import { Suspense } from 'react';
import SignupForm from '@/components/SignupForm';

function SignupFormFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading signup form...</p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Suspense fallback={<SignupFormFallback />}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}