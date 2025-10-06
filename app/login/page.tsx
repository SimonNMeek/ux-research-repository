export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Login</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Authentication is currently disabled. Continue to
        <a href="/workspaces" className="ml-1 underline text-blue-600 dark:text-blue-400">Workspaces</a>.
      </p>
    </div>
  );
}


