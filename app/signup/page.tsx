"use client";

import SignupForm from '@/components/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <SignupForm />
      </div>
    </div>
  );
}