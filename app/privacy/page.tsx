export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Privacy Policy</h1>
      
      <h2>Sol Research Platform</h2>
      <p><strong>Last updated:</strong> October 13, 2025</p>
      
      <h3>Data Collection and Use</h3>
      <p>
        Sol Research is a multi-tenant research repository platform. We collect and store:
      </p>
      <ul>
        <li>User account information (email, name) for authentication</li>
        <li>Research documents and metadata uploaded by users</li>
        <li>Workspace and project organization data</li>
        <li>API usage logs for security and analytics</li>
      </ul>
      
      <h3>Data Security</h3>
      <p>
        All data is stored securely with:
      </p>
      <ul>
        <li>Row-level security (RLS) for tenant isolation</li>
        <li>Encrypted API keys and authentication tokens</li>
        <li>Secure HTTPS connections</li>
        <li>Regular security updates and monitoring</li>
      </ul>
      
      <h3>Third-Party Integrations</h3>
      <p>
        We integrate with LLM services (ChatGPT, Claude, etc.) through secure API endpoints.
        Users control their own API keys and data access permissions.
      </p>
      
      <h3>Data Retention</h3>
      <p>
        User data is retained until account deletion. Research documents are preserved
        according to workspace settings and user preferences.
      </p>
      
      <h3>Contact</h3>
      <p>
        For privacy questions, contact: support@sol-research.com
      </p>
    </div>
  );
}
