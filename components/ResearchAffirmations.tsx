"use client";

import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const researchQuotes = [
  {
    text: "Research is formalized curiosity. It is poking and prying with a purpose.",
    author: "Zora Neale Hurston"
  },
  {
    text: "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge.",
    author: "Daniel J. Boorstin"
  },
  {
    text: "If we knew what we were doing, it would not be called research.",
    author: "Albert Einstein"
  },
  {
    text: "Without data, you're just another person with an opinion.",
    author: "W. Edwards Deming"
  },
  {
    text: "The important thing is not to stop questioning.",
    author: "Albert Einstein"
  },
  {
    text: "Knowledge is of no value unless you put it into practice.",
    author: "Anton Chekhov"
  },
  {
    text: "Research isn't a report on a shelf; it's a conversation that should be happening every day.",
    author: ""
  },
  {
    text: "The customer's voice is the clearest signal in the noise—if only we listen.",
    author: ""
  },
  {
    text: "Great products aren't built on assumptions, they're built on questions asked relentlessly.",
    author: ""
  },
  {
    text: "Research democratized is research alive—shared, challenged, acted upon.",
    author: ""
  },
  {
    text: "Every insight is a seed. Growth comes when we plant it where decisions are made.",
    author: ""
  },
  {
    text: "Innovation starts when curiosity meets evidence.",
    author: ""
  },
  {
    text: "The faster insights move, the faster teams learn—and the better products become.",
    author: ""
  },
  {
    text: "Research is not about finding answers; it's about finding the right questions to ask next.",
    author: ""
  },
  {
    text: "The future belongs to organisations that make listening their strongest capability.",
    author: ""
  },
  {
    text: "Good research tells you what happened; great research tells you what to do next.",
    author: ""
  }
];

interface Quote {
  text: string;
  author: string;
}

interface ResearchAffirmationsProps {
  className?: string;
  quoteClassName?: string;
  authorClassName?: string;
  iconClassName?: string;
}

export default function ResearchAffirmations({ 
  className = "", 
  quoteClassName = "",
  authorClassName = "",
  iconClassName = ""
}: ResearchAffirmationsProps) {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    // Set random quote on component mount
    const randomIndex = Math.floor(Math.random() * researchQuotes.length);
    setCurrentQuote(researchQuotes[randomIndex]);

    // Rotate quotes every 30 seconds
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * researchQuotes.length);
      setCurrentQuote(researchQuotes[randomIndex]);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`text-center ${className}`}>
      {/* Main quote */}
      {currentQuote && (
        <blockquote className={`relative mx-auto max-w-2xl italic ${quoteClassName || 'text-lg text-muted-foreground'}`}>
          <Quote className={`absolute -left-6 top-0 h-5 w-5 ${iconClassName || 'text-muted'}`} />
          "{currentQuote.text}"
        </blockquote>
      )}
      
      {/* Author attribution */}
      {currentQuote && currentQuote.author && (
        <cite className={`mt-4 block text-sm ${authorClassName || 'text-muted-foreground'}`}>
          — {currentQuote.author}
        </cite>
      )}
    </div>
  );
}
