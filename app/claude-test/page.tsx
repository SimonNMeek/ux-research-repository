"use client";

import { useState } from 'react';

export default function ClaudeTestPage() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    try {
      // This simulates how Claude would call your tool
      const toolResponse = await fetch('/api/claude-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-xd1mN9kYC5BcFn8YGu527FvXz9B515bNOZCQGSUV9pMa1ZW9',
        },
        body: JSON.stringify({
          tool_name: 'list_workspaces',
          parameters: {}
        }),
      });

      const data = await toolResponse.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testProjects = async () => {
    setLoading(true);
    try {
      const toolResponse = await fetch('/api/claude-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-xd1mN9kYC5BcFn8YGu527FvXz9B515bNOZCQGSUV9pMa1ZW9',
        },
        body: JSON.stringify({
          tool_name: 'list_projects',
          parameters: { workspace: 'farm-to-fork' }
        }),
      });

      const data = await toolResponse.json();
      console.log('Response:', data);
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testDocuments = async () => {
    setLoading(true);
    try {
      const toolResponse = await fetch('/api/claude-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-xd1mN9kYC5BcFn8YGu527FvXz9B515bNOZCQGSUV9pMa1ZW9',
        },
        body: JSON.stringify({
          tool_name: 'list_documents',
          parameters: { workspace: 'farm-to-fork', project: 'user-research' }
        }),
      });

      const data = await toolResponse.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Claude Tool Integration Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Available Tools</h2>
        <p>This page tests the Claude tool integration. Use these buttons to test different endpoints:</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={testProjects}
            disabled={loading}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            Test Projects
          </button>
          
          <button 
            onClick={testDocuments}
            disabled={loading}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            Test Documents
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Response</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px', 
          overflow: 'auto',
          minHeight: '200px',
          whiteSpace: 'pre-wrap'
        }}>
          {loading ? 'Loading...' : response || 'Click a button above to test the integration'}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Claude Integration Instructions</h2>
        <p>To use this with Claude API, you would:</p>
        <ol>
          <li>Get an Anthropic API key from <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></li>
          <li>Use the tools schema from <a href="/claude-tools.json" target="_blank">/claude-tools.json</a></li>
          <li>Configure Claude to call the webhook at <code>/api/claude-tool</code></li>
          <li>Pass your Sol Research API key in the <code>x-api-key</code> header</li>
        </ol>
        
        <h3>Example Claude API Call</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
{`curl -X POST https://api.anthropic.com/v1/messages \\
  -H "x-api-key: YOUR_ANTHROPIC_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1000,
    "tools": [{
      "name": "list_workspaces",
      "description": "List all workspaces",
      "input_schema": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }],
    "messages": [{
      "role": "user",
      "content": "List my workspaces"
    }]
  }'`}
        </pre>
      </div>
    </div>
  );
}
