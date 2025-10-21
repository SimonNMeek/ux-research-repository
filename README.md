This is Sol Research — a tiny Next.js app that lets you add, tag, search, and open text notes, with an MCP server for agent access.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MCP Server

Run the MCP server (uses same SQLite DB as the web app):

```bash
npm run mcp
```

Tools exposed:
- `search_notes { q?: string; tag?: string }`
- `get_note { id: number }`
- `add_note { filename: string; content: string; tags?: string[] }`
- `list_tags {}`
- `add_tag { noteId: number; tag: string }`

Sample usage (stdin/stdout MCP client required). The server prints no HTTP port; it speaks MCP over stdio.
# AWS Recovery Test - Tue Oct 21 07:53:53 BST 2025
# Testing Vercel deployment - Tue Oct 21 07:56:38 BST 2025
