"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Key, 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  AlertTriangle,
  Copy,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface Organization {
  id: number;
  name: string;
}

interface CreateApiKeyRequest {
  name: string;
  expiresAt?: string;
}

export default function OrganizationApiKeysPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newKeyData, setNewKeyData] = useState<CreateApiKeyRequest>({ name: '' });
  const [createdKey, setCreatedKey] = useState<{ key: string; prefix: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/org/api-keys');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }
      const data = await response.json();
      setOrganization(data.organization);
      setApiKeys(data.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');

    try {
      const response = await fetch('/api/org/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      setCreatedKey(data.apiKey);
      setNewKeyData({ name: '' });
      fetchApiKeys(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleManageApiKey = async (keyId: number, action: 'revoke' | 'delete') => {
    if (!confirm(`Are you sure you want to ${action} this API key?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/org/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} API key`);
      }

      fetchApiKeys(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} API key`);
    }
  };

  const copyToClipboard = async (text: string, keyId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusBadge = (isActive: boolean, expiresAt: string | null) => {
    if (!isActive) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading API keys...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            API Keys
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage organization API keys for ChatGPT and Claude integration
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create API Key Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="mb-6">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Organization API Key</DialogTitle>
              <DialogDescription>
                This key will allow access to all workspaces in {organization?.name}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  placeholder="e.g., ChatGPT Integration"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newKeyData.expiresAt || ''}
                  onChange={(e) => setNewKeyData({ ...newKeyData, expiresAt: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createLoading} className="flex-1">
                  {createLoading ? 'Creating...' : 'Create Key'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Created Key Display */}
        {createdKey && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                API Key Created Successfully
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Copy this key now - you won't be able to see it again!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  value={createdKey.key}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(createdKey.key, -1)}
                >
                  {copiedKeyId === -1 ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Prefix: {createdKey.prefix}
              </p>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No API Keys
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first organization API key to enable ChatGPT and Claude integration.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {apiKey.name}
                        </h3>
                        {getStatusBadge(apiKey.is_active, apiKey.expires_at)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Prefix:</span> {apiKey.key_prefix}
                        </div>
                        <div>
                          <span className="font-medium">Last Used:</span> {formatDateTime(apiKey.last_used_at)}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(apiKey.created_at)}
                        </div>
                      </div>
                      {apiKey.expires_at && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Expires: {formatDateTime(apiKey.expires_at)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {apiKey.is_active ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManageApiKey(apiKey.id, 'revoke')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Revoke
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleManageApiKey(apiKey.id, 'delete')}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleManageApiKey(apiKey.id, 'delete')}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use Organization API Keys</CardTitle>
            <CardDescription>
              These keys provide access to all workspaces in your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">For ChatGPT Integration:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Copy your API key from above</li>
                <li>In ChatGPT, go to Settings → Integrations → Sol Research</li>
                <li>Paste your API key and save</li>
                <li>You can now ask ChatGPT to search your organization's research</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">For Claude Integration:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Copy your API key from above</li>
                <li>In Claude, go to Settings → Integrations → Sol Research</li>
                <li>Paste your API key and save</li>
                <li>You can now ask Claude to search your organization's research</li>
              </ol>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Note:</strong> Keep your API keys secure. Anyone with access to these keys can view all research in your organization. 
                Revoke keys immediately if they are compromised.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
