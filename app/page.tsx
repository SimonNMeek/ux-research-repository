"use client";

import Header from '@/components/Header';
import ResearchAffirmations from '@/components/ResearchAffirmations';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <ResearchAffirmations />
    </div>
  );
}
