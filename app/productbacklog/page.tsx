import { Board } from '@/components/kanban/Board';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProductBacklogPage() {
  // Check authentication and SuperAdmin role
  const sessionId = await getSessionCookie();
  const user = await validateSession(sessionId);
  
  if (!user) {
    redirect('/login');
  }
  
  if (user.system_role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            This page is only available to Super Admins.
          </p>
          <p className="text-sm text-gray-500">
            Your current role: <span className="font-medium">{user.system_role || 'contributor'}</span>
          </p>
          <div className="mt-6">
            <a 
              href="/" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sol Kanban</h1>
              <p className="text-gray-600 mt-2">
                Local-only Kanban board for tracking your product backlog
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Super Admin
              </span>
            </div>
          </div>
        </div>
      </div>
      <Board />
    </div>
  );
}
