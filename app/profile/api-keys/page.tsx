"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.key);
        setSuccess('API key created successfully! Copy it now - you won\'t see it again.');
        setNewKeyName('');
        fetchKeys();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/keys?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('API key deleted successfully');
        fetchKeys();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete API key');
      }
    } catch (err) {
      setError('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewKeyName('');
    setNewlyCreatedKey(null);
    setShowKey(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              API Keys
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage API keys for LLM integrations (ChatGPT, Claude, Gemini)
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Your API Keys ({keys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No API keys yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create one to integrate with ChatGPT, Claude, or Gemini
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {key.name}
                        </h3>
                        {!key.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {key.key_prefix}••••••••••••
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                        {key.last_used_at && (
                          <span>
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id, key.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Security Best Practices
          </h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>• Never share your API keys or commit them to version control</li>
            <li>• Create separate keys for different integrations</li>
            <li>• Delete keys you're no longer using</li>
            <li>• If a key is compromised, delete it immediately</li>
          </ul>
        </div>

        {/* Create API Key Modal */}
        <Dialog open={showCreateModal} onOpenChange={closeCreateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Create API Key
              </DialogTitle>
            </DialogHeader>

            {newlyCreatedKey ? (
              <div className="space-y-4 mt-4">
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>Success!</strong> Copy your API key now. You won't be able to see it again.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>Your API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newlyCreatedKey}
                      readOnly
                      type={showKey ? 'text' : 'password'}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="shrink-0"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newlyCreatedKey)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={closeCreateModal} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., ChatGPT Integration"
                    disabled={creating}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a descriptive name to identify this key
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCreateModal}
                    disabled={creating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={creating || !newKeyName.trim()}
                    className="flex-1"
                  >
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

