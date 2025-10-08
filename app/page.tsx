"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ResearchAffirmations from '@/components/ResearchAffirmations';
import SignupForm from '@/components/SignupForm';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <ResearchAffirmations />
      
      {/* Auth Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        {!showSignup ? (
          /* Login CTA */
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to organise your research?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Sign in to access your workspaces or create a new account to get started
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => router.push('/login')}
                size="lg"
                className="gap-2"
              >
                <LogIn className="h-5 w-5" />
                Sign In
              </Button>
              <Button 
                onClick={() => setShowSignup(true)}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <UserPlus className="h-5 w-5" />
                Create Account
              </Button>
            </div>
          </div>
        ) : (
          /* Signup Form */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Join Sol Repo
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Create your account and start contributing research insights
              </p>
            </div>
            <SignupForm />
            <div className="text-center mt-6">
              <button
                onClick={() => setShowSignup(false)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to sign in options
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
