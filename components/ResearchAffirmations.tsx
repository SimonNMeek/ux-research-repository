"use client";

import { useState, useEffect } from 'react';

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
    text: "The future belongs to organizations that make listening their strongest capability.",
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

export default function ResearchAffirmations() {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  useEffect(() => {
    // Set random quote on component mount
    const randomIndex = Math.floor(Math.random() * researchQuotes.length);
    setCurrentQuote(researchQuotes[randomIndex]);
  }, []);

  return (
    <div className="text-center py-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Main quote */}
        {currentQuote && (
          <blockquote className="text-4xl font-bold text-gray-800 dark:text-gray-200 leading-relaxed mb-6">
            "{currentQuote.text}"
          </blockquote>
        )}
        
        {/* Author attribution */}
        {currentQuote && currentQuote.author && (
          <cite className="text-lg italic text-gray-600 dark:text-gray-400 mb-8 block">
            — {currentQuote.author}
          </cite>
        )}
        
        {/* Subtitle */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          Research insights that guide product excellence
        </p>

        {/* Additional small tagline */}
        <div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
          Sol Research Platform
        </div>
      </div>
    </div>
  );
}
