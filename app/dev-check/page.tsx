"use client";

import { useEffect, useMemo, useState } from "react";

type Check = {
  name: string;
  status: "ok" | "warn" | "error" | "unknown";
  details?: string;
};

export default function DevSelfCheckPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const results: Check[] = [];

    // 1) CSS asset: try to locate the layout.css link in the current document
    try {
      const link = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
        .find(l => l.href.includes("/_next/static/css/app/layout.css"));
      if (!link) {
        results.push({ name: "Next layout.css link", status: "warn", details: "No /_next/static/css/app/layout.css link found in head" });
      } else {
        const res = await fetch(link.href, { method: "HEAD", cache: "no-cache" });
        results.push({ name: "Next layout.css fetch", status: res.ok ? "ok" : "error", details: `${res.status} ${res.statusText}` });
      }
    } catch (e: any) {
      results.push({ name: "Next layout.css fetch", status: "error", details: e?.message || String(e) });
    }

    // 2) Session cookie presence (client-visible only; httpOnly cookie value isn't readable)
    try {
      const hasSession = document.cookie.includes("session_id=");
      results.push({ name: "Client cookie (session_id) present", status: hasSession ? "ok" : "warn", details: hasSession ? "found in document.cookie" : "not visible (may be httpOnly as expected)" });
    } catch (e: any) {
      results.push({ name: "Client cookie check", status: "error", details: e?.message || String(e) });
    }

    // 3) Server session status
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        results.push({ name: "Auth session (/api/auth/me)", status: "ok", details: `user ${data?.user?.email || data?.user?.id}` });
      } else {
        results.push({ name: "Auth session (/api/auth/me)", status: "warn", details: `${res.status} ${res.statusText}` });
      }
    } catch (e: any) {
      results.push({ name: "Auth session (/api/auth/me)", status: "error", details: e?.message || String(e) });
    }

    // 4) Middleware quick check: protected route should 307 -> /login when not authed
    try {
      const res = await fetch("/w/demo-co", { redirect: "manual" });
      const redirected = res.status === 307 || res.status === 308 || (res.status >= 300 && res.status < 400);
      results.push({ name: "Auth redirect (/w/demo-co)", status: redirected ? "ok" : "warn", details: `${res.status}` });
    } catch (e: any) {
      results.push({ name: "Auth redirect (/w/demo-co)", status: "error", details: e?.message || String(e) });
    }

    setChecks(results);
    setRunning(false);
  };

  const runHealthChecks = async () => {
    setRunning(true);
    const results: Check[] = [];

    // Helper to fetch with manual redirect and capture status without following
    const getStatus = async (url: string, init?: RequestInit) => {
      try {
        const res = await fetch(url, { redirect: "manual", cache: "no-store", ...init });
        return { ok: true, status: res.status, statusText: res.statusText };
      } catch (e: any) {
        return { ok: false, status: 0, statusText: e?.message || String(e) };
      }
    };

    // 1) Authentication: unauthenticated should be 401
    {
      const r = await getStatus("/api/auth/me");
      const pass = r.status === 401;
      results.push({ name: "Auth: /api/auth/me (unauth = 401)", status: pass ? "ok" : "warn", details: `${r.status} ${r.statusText}` });
    }

    // 2) Workspace page should redirect to login when unauthenticated
    {
      const r = await getStatus("/w/demo-co");
      const isRedirect = r.status >= 300 && r.status < 400;
      results.push({ name: "Workspace: /w/demo-co redirects", status: isRedirect ? "ok" : "warn", details: `${r.status} ${r.statusText}` });
    }

    // 3) Search & Favourites page (protected route) should redirect when unauthenticated
    {
      const r = await getStatus("/w/demo-co/search");
      const isRedirect = r.status >= 300 && r.status < 400;
      results.push({ name: "Search page redirects (unauth)", status: isRedirect ? "ok" : "warn", details: `${r.status} ${r.statusText}` });
    }

    // 4) Kanban board page (product backlog) - just verify not 500
    {
      const r = await getStatus("/productbacklog");
      const ok = r.status !== 500;
      results.push({ name: "Kanban board page no 500", status: ok ? "ok" : "error", details: `${r.status} ${r.statusText}` });
    }

    // 5) Organization management page should redirect when unauthenticated
    {
      const r = await getStatus("/org/users");
      const isRedirect = r.status >= 300 && r.status < 400;
      results.push({ name: "Org users page redirects (unauth)", status: isRedirect ? "ok" : "warn", details: `${r.status} ${r.statusText}` });
    }

    // 6) Database connectivity sanity: workspace API should not 500
    {
      const r = await getStatus("/w/demo-co/api/workspace");
      const ok = r.status !== 500;
      results.push({ name: "DB connectivity: /w/demo-co/api/workspace", status: ok ? "ok" : "error", details: `${r.status} ${r.statusText}` });
    }

    // 7) Search API basic: should not 500 (may be 307 unauth via middleware)
    {
      const r = await getStatus("/w/demo-co/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: "test", limit: 1 }) });
      const ok = r.status !== 500;
      results.push({ name: "Search API basic", status: ok ? "ok" : "error", details: `${r.status} ${r.statusText}` });
    }

    setChecks(results);
    setRunning(false);
  };

  useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overall = useMemo<Check["status"]>(() => {
    if (checks.some(c => c.status === "error")) return "error";
    if (checks.some(c => c.status === "warn")) return "warn";
    if (checks.length === 0) return "unknown";
    return "ok";
  }, [checks]);

  const badge = (s: Check["status"]) =>
    s === "ok" ? "bg-green-100 text-green-800" : s === "warn" ? "bg-yellow-100 text-yellow-800" : s === "error" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dev Self‑Check</h1>
          <button
            className="rounded-md border px-3 py-1 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            onClick={runChecks}
            disabled={running}
          >
            {running ? "Running…" : "Run again"}
          </button>
        </div>

        <div className="mb-4">
          <button
            className="rounded-md border px-3 py-1 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            onClick={runHealthChecks}
            disabled={running}
          >
            {running ? "Running…" : "Run full health checks"}
          </button>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm ${badge(overall)}`}>
          Overall: {overall.toUpperCase()}
        </div>

        <div className="mt-6 space-y-3">
          {checks.map((c, i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                {c.details ? <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">{c.details}</div> : null}
              </div>
              <span className={`text-xs rounded px-2 py-0.5 ${badge(c.status)}`}>{c.status.toUpperCase()}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick actions</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              className="rounded-md border px-3 py-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  await runChecks();
                } catch {}
              }}
            >
              Log out (clear session)
            </button>
            <button
              className="rounded-md border px-3 py-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              onClick={() => {
                try { localStorage.clear(); sessionStorage.clear(); } catch {}
                alert('Local/session storage cleared. For cookies/cache, clear site data in browser settings.');
              }}
            >
              Clear local storage
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            If the Next CSS still 404s: stop dev server, delete <code>.next</code>, then restart. If needed, reinstall dependencies.
          </p>
        </div>
      </div>
    </div>
  );
}


