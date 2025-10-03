/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Sun background colors
    'bg-slate-50', 'bg-slate-100', 'bg-slate-800', 'bg-slate-900',
    'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500',
    'bg-pink-200', 'bg-pink-400',
    'bg-red-200', 'bg-red-400', 'bg-red-500', 'bg-red-600',
    'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600',
    'from-slate-50', 'to-slate-100', 'from-slate-900', 'via-slate-800', 'to-slate-900',
    'from-orange-200', 'via-pink-200', 'to-orange-300', 'from-orange-400', 'via-pink-400', 'to-orange-500',
    'from-red-500', 'via-red-400', 'to-red-600', 'from-red-200', 'via-red-200', 'to-orange-300',
    'from-blue-500', 'via-blue-400', 'to-blue-600', 'from-blue-300', 'via-blue-200', 'to-blue-400',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
