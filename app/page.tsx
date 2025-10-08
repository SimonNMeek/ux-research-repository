"use client";

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ResearchAffirmations from '@/components/ResearchAffirmations';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <ResearchAffirmations />
      
      {/* Login CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to organise your research?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Sign in to access your workspaces and projects
        </p>
        <Button 
          onClick={() => router.push('/login')}
          size="lg"
          className="gap-2"
        >
          <LogIn className="h-5 w-5" />
          Sign In
        </Button>
      </div>
    </div>
  );
}
