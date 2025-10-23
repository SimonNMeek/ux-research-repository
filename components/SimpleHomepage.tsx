"use client";

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import ResearchAffirmations from '@/components/ResearchAffirmations';

export default function SimpleHomepage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-gray-700 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative">
              <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
            </div>
            <span className="text-lg font-semibold">Sol</span>
          </div>

          <nav className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/login')}
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Sign in
            </Button>
            <Button 
              onClick={() => router.push('/signup')}
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-500"
            >
              Sign up
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ResearchAffirmations 
            quoteClassName="text-4xl font-bold text-white mb-6"
            authorClassName="text-lg text-gray-300"
            iconClassName="text-gray-400 h-8 w-8"
          />
        </div>
      </main>
    </div>
  );
}
