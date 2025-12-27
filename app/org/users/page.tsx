"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Edit, Trash2, Mail, UserPlus, Link, Copy, Check } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

interface OrganizationUsersResponse {
  organization: Organization;
  users: User[];
  currentUserRole: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by_name: string;
  invited_by_email: string;
}

export default function OrganizationUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member'
  });

  useEffect(() => {
    fetchOrganizationUsers();
    fetchPendingInvitations();
  }, []);

  const fetchOrganizationUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/org/users');
      if (!response.ok) {
        throw new Error('Failed to fetch organization users');
      }
      const data: OrganizationUsersResponse = await response.json();
      setUsers(data.users || []);
      setOrganization(data.organization || null);
      setCurrentUserRole(data.currentUserRole || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch('/api/org/invitations');
      if (!response.ok) {
        if (response.status === 403) {
          // User doesn't have admin access, that's fine
          return;
        }
        throw new Error('Failed to fetch pending invitations');
      }
      const data = await response.json();
      setPendingInvitations(data.invitations || []);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
      // Don't set error state for this, as it's not critical
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError('');

    try {
      const response = await fetch('/api/org/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite user');
      }

      setInviteData({ email: '', firstName: '', lastName: '', role: 'member' });
      setShowInviteForm(false);
      fetchOrganizationUsers(); // Refresh the list
      fetchPendingInvitations(); // Refresh pending invitations
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleGenerateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLinkLoading(true);
    setError('');

    try {
      const response = await fetch('/api/org/users/invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate invite link');
      }

      const data = await response.json();
      setGeneratedInviteLink(data.inviteLink);
      setLinkCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite link');
    } finally {
      setInviteLinkLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedInviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`/api/org/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      fetchOrganizationUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (!confirm(`Are you sure you want to remove ${user.name} from the organization?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/org/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      fetchOrganizationUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'member': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading organization users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Organization Users
          </h1>
          <p className="text-muted-foreground">
            Manage users in {organization?.name || 'your organization'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Search and Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} in your organization
                  </CardDescription>
                </div>
                {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                  <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Invite User Form */}
              {showInviteForm && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Invite New User</CardTitle>
                    <CardDescription>
                      Send an invitation to join your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleInviteUser} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={inviteData.firstName}
                            onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                            placeholder="John"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={inviteData.lastName}
                            onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                            placeholder="Smith"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteData.email}
                          onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                          placeholder="john.smith@example.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={inviteData.role}
                          onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={inviteLoading}>
                          {inviteLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Invite...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invite
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateInviteLink}
                          disabled={inviteLinkLoading}
                        >
                          {inviteLinkLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Link className="mr-2 h-4 w-4" />
                              Create Invite Link
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowInviteForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Generated Invite Link Display */}
              {generatedInviteLink && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link className="h-5 w-5" />
                      Generated Invite Link
                    </CardTitle>
                    <CardDescription>
                      Share this link with {inviteData.firstName} {inviteData.lastName} ({inviteData.email}) to join your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          value={generatedInviteLink}
                          readOnly
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          onClick={handleCopyLink}
                          variant="outline"
                          size="sm"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="mr-2 h-4 w-4 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>• This link will expire in 7 days</p>
                        <p>• The user can use this link to create an account and join your organization</p>
                        <p>• You can share this link via email, Slack, or any other method</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneratedInviteLink('');
                          setInviteData({ email: '', firstName: '', lastName: '', role: 'member' });
                        }}
                      >
                        Generate Another Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending Invitations Section */}
              {pendingInvitations.length > 0 && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Pending Invitations ({pendingInvitations.length})
                    </CardTitle>
                    <CardDescription>
                      Users who have been invited but haven't joined yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-card/50">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-card-foreground">
                                {invitation.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Invited by {invitation.invited_by_name} • {new Date(invitation.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Expires {new Date(invitation.expires_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Users List */}
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                              <UserPlus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-card-foreground">
                              {user.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(user.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                          {user.role !== 'owner' && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                            <>
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No users found matching your search.' : 'No users in your organization yet.'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
