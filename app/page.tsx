"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, Share2, FolderKanban, Menu, Quote } from "lucide-react";
import { motion } from "framer-motion";
import ResearchAffirmations from '@/components/ResearchAffirmations';
import SimpleHomepage from '@/components/SimpleHomepage';

function Placeholder({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-muted/40 ${className}`}>
      <div className="absolute inset-0 grid [mask-image:radial-gradient(200px_circle_at_center,black,transparent)]">
        <div className="h-full w-full bg-[linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="relative flex h-full items-center justify-center p-6 text-sm text-muted-foreground">Placeholder</div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Check if we should show simple homepage (production)
  const isProduction = process.env.NODE_ENV === 'production';
  const useSimpleHomepage = isProduction || process.env.NEXT_PUBLIC_SIMPLE_HOMEPAGE === 'true';

  // Check authentication status and redirect if logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // User is logged in, redirect to workspaces
          router.push('/workspaces');
          return;
        }
      } catch (error) {
        // User is not logged in, show homepage
        console.log('User not authenticated, showing homepage');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative mx-auto mb-4">
            <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show simple homepage for production
  if (useSimpleHomepage) {
    return <SimpleHomepage />;
  }

  // Show full marketing homepage for development
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative">
                     <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
                   </div>
                   <span className="hidden text-lg font-semibold sm:inline">Sol</span>
                 </div>

          <nav className="hidden items-center gap-2 sm:flex">
            <Button variant="secondary">Request demo</Button>
            <Button variant="ghost" onClick={() => router.push('/login')}>Sign in</Button>
            <Button onClick={() => router.push('/signup')}>Sign up</Button>
          </nav>

          <button className="sm:hidden"><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }} 
              className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl"
            >
              From scattered research to shared understanding.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, delay: 0.05 }} 
              className="mt-4 max-w-xl text-pretty text-base text-muted-foreground md:text-lg"
            >
              Sol brings interviews, notes and findings together in one intelligent workspace — accessible, searchable, and ready to guide every team.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, delay: 0.1 }} 
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <Button size="lg" className="group" onClick={() => router.push('/signup')}>
                Get started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="secondary">Request demo</Button>
            </motion.div>
            <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="h-px w-10 bg-muted" />
              Trusted by product, research, and design teams.
            </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <div className="rounded-2xl border p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <div className="h-3 w-3 rounded-full bg-muted" />
                <div className="h-3 w-3 rounded-full bg-muted" />
              </div>
              <Placeholder className="aspect-[16/10]" />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Placeholder className="aspect-video" />
                <Placeholder className="aspect-video" />
                <Placeholder className="aspect-video" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="border-b bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What Sol does best</h2>
            <p className="mt-2 text-muted-foreground">Start simple. Grow powerful. These are the pillars you can ship with today.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border"><FolderKanban className="h-5 w-5" /></div>
                <CardTitle>Organise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Bring interviews, notes, and findings together in one place with workspaces and projects.</p>
                <Placeholder className="aspect-video" />
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border"><Sparkles className="h-5 w-5" /></div>
                <CardTitle>Analyse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Surface patterns with AI search and tagging. Never lose an insight again.</p>
                <Placeholder className="aspect-video" />
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border"><Share2 className="h-5 w-5" /></div>
                <CardTitle>Share</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Let insights flow through your whole org with links, summaries, and permissions.</p>
                <Placeholder className="aspect-video" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold md:text-2xl">How it works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">1. Import</span> — Upload interviews, notes, CSV/markdown, and docs.</li>
              <li><span className="font-medium text-foreground">2. Connect</span> — Auto-tag, link themes, and anonymise PII.</li>
              <li><span className="font-medium text-foreground">3. Share</span> — Publish findings and bring teams into the loop.</li>
            </ol>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="group" onClick={() => router.push('/signup')}>
                Get started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="secondary">Request demo</Button>
            </div>
          </div>
          <Placeholder className="aspect-[16/9]" />
        </div>
      </section>

      {/* Research Quote Section - moved above footer as requested */}
      <section className="border-t border-b bg-muted/5">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
          <ResearchAffirmations />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
                 <div>
                   <div className="mb-3 inline-flex items-center gap-2">
                     <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative">
                       <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
                     </div>
                     <span className="font-medium">Sol</span>
                   </div>
                   <p className="text-sm text-muted-foreground">The home for your customer understanding.</p>
                 </div>
          <div>
            <div className="mb-3 font-medium">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Features</li>
              <li>Pricing</li>
              <li>Docs</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>About</li>
              <li>Contact</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 font-medium">Legal</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Privacy</li>
              <li>Terms</li>
              <li>Security</li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Sol.</span>
            <span>Made with ♥ for researchers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
