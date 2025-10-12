"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';

type Organization = {
  id: number;
  slug: string;
  name: string;
  billing_email: string;
  plan: 'free' | 'pro' | 'enterprise';
  max_workspaces: number;
  max_users: number;
  max_documents: number;
  created_at: string;
};

const planColors = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const planLabels = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    billing_email: '',
    plan: 'free' as 'free' | 'pro' | 'enterprise',
    max_workspaces: 5,
    max_users: 10,
    max_documents: 1000,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchOrganizations();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);

        // Check if user has admin privileges
        if (data.user.system_role !== 'super_admin' && data.user.system_role !== 'admin') {
          router.push('/workspaces');
        }
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      setSuccess('Organization created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingOrg) return;

    try {
      const response = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrg.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update organization');
      }

      setSuccess('Organization updated successfully');
      setShowEditModal(false);
      setEditingOrg(null);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    }
  };

  const handleDeleteOrg = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/organizations?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete organization');
      }

      setSuccess('Organization deleted successfully');
      fetchOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    }
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      billing_email: org.billing_email,
      plan: org.plan,
      max_workspaces: org.max_workspaces,
      max_users: org.max_users,
      max_documents: org.max_documents,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      billing_email: '',
      plan: 'free',
      max_workspaces: 5,
      max_users: 10,
      max_documents: 1000,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Organization Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage organizations, plans, and limits
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Organization
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
              <Building2 className="h-5 w-5" />
              All Organizations ({organizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Slug
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Plan
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Limits
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                      Created
                    </th>
                    {currentUser?.system_role === 'super_admin' && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {org.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {org.billing_email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm font-mono">
                        {org.slug}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={planColors[org.plan]}>
                          {planLabels[org.plan]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>Workspaces: {org.max_workspaces}</div>
                        <div>Users: {org.max_users}</div>
                        <div>Docs: {org.max_documents}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      {currentUser?.system_role === 'super_admin' && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(org)}
                              className="gap-1"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOrg(org.id, org.name)}
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Organization Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Create New Organization
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateOrg} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (!formData.slug || formData.slug === generateSlug(formData.name)) {
                      setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) });
                    }
                  }}
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., acme-corp"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs (lowercase, hyphens only)
                </p>
              </div>

              <div>
                <Label htmlFor="billing_email">Billing Email</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  placeholder="billing@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value: any) => {
                    const limits = {
                      free: { max_workspaces: 5, max_users: 10, max_documents: 1000 },
                      pro: { max_workspaces: 20, max_users: 50, max_documents: 10000 },
                      enterprise: { max_workspaces: 999, max_users: 999, max_documents: 999999 },
                    };
                    setFormData({ ...formData, plan: value, ...limits[value as keyof typeof limits] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="max_workspaces">Max Workspaces</Label>
                  <Input
                    id="max_workspaces"
                    type="number"
                    value={formData.max_workspaces}
                    onChange={(e) => setFormData({ ...formData, max_workspaces: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_users">Max Users</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_documents">Max Documents</Label>
                  <Input
                    id="max_documents"
                    type="number"
                    value={formData.max_documents}
                    onChange={(e) => setFormData({ ...formData, max_documents: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create Organization
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Organization Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                Edit Organization
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateOrg} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-name">Organization Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-billing_email">Billing Email</Label>
                <Input
                  id="edit-billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-plan">Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value: any) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="edit-max_workspaces">Max Workspaces</Label>
                  <Input
                    id="edit-max_workspaces"
                    type="number"
                    value={formData.max_workspaces}
                    onChange={(e) => setFormData({ ...formData, max_workspaces: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max_users">Max Users</Label>
                  <Input
                    id="edit-max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max_documents">Max Documents</Label>
                  <Input
                    id="edit-max_documents"
                    type="number"
                    value={formData.max_documents}
                    onChange={(e) => setFormData({ ...formData, max_documents: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrg(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Update Organization
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

