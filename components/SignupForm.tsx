"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Check, ArrowLeft, ArrowRight, Building2, Users } from 'lucide-react';

interface InvitationData {
  email: string;
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  role: string;
  expiresAt: string;
}

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: 'personal', // 'personal' or 'company'
    joinExisting: false,
    inviteCode: '',
    inviteToken: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic info, 2: Organization setup
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(false);

  // Check for invitation token on component mount
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      validateInvitation(inviteToken);
    }
  }, [searchParams]);

  const validateInvitation = async (token: string) => {
    setValidatingInvitation(true);
    setError('');
    
    try {
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setInvitationData(data.invitation);
        setFormData(prev => ({
          ...prev,
          email: data.invitation.email,
          inviteToken: token
        }));
        setError('');
      } else {
        setError(data.error || 'Invalid invitation');
      }
    } catch (err) {
      setError('Failed to validate invitation');
    } finally {
      setValidatingInvitation(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.checked,
    });
    setError(''); // Clear error when user types
  };

  const handleNextStep = () => {
    // Validate step 1 fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Skip step 2 if user has an invitation
    if (invitationData) {
      handleSubmit(new Event('submit') as any);
      return;
    }

    setStep(2);
    setError('');
  };

  const handlePrevStep = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate organization fields if creating new org and not invited
    if (!invitationData && !formData.joinExisting && !formData.organizationName) {
      setError('Please enter an organization name or choose to join an existing organization');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 firstName: formData.firstName,
                 lastName: formData.lastName,
                 email: formData.email,
                 password: formData.password,
                 organizationName: formData.organizationName,
                 organizationType: formData.organizationType,
                 joinExisting: formData.joinExisting,
                 inviteCode: formData.inviteCode,
                 inviteToken: formData.inviteToken,
               }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Account Created!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your account has been successfully created. Redirecting to sign in...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

         const renderStep1 = () => (
           <Card className="w-full max-w-md mx-auto">
             <CardHeader>
               <CardTitle className="text-2xl">
                 {invitationData ? 'Join ' + invitationData.organization.name : 'Create Account'}
               </CardTitle>
               <CardDescription>
                 {invitationData ? 
                   `You've been invited to join ${invitationData.organization.name} as a ${invitationData.role}` :
                   'Step 1: Your personal information'
                 }
               </CardDescription>
             </CardHeader>
             <CardContent>
        <div className="space-y-4">
          {validatingInvitation && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Validating invitation...</span>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {invitationData && (
            <Alert>
              <AlertDescription>
                <strong>Invitation Details:</strong><br />
                Organization: {invitationData.organization.name}<br />
                Role: {invitationData.role}<br />
                Email: {invitationData.email}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Smith"
                disabled={loading}
                required
              />
            </div>
          </div>

                 <div className="space-y-2">
                   <Label htmlFor="email">Email</Label>
                   <Input
                     id="email"
                     name="email"
                     type="email"
                     value={formData.email}
                     onChange={handleChange}
                     placeholder="john.smith@example.com"
                     disabled={loading || !!invitationData}
                     required
                   />
                   {invitationData && (
                     <p className="text-xs text-gray-500">
                       Email is pre-filled from your invitation
                     </p>
                   )}
                 </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              disabled={loading}
              required
            />
          </div>

          <Button
            type="button"
            onClick={handleNextStep}
            className="w-full"
            disabled={loading || validatingInvitation}
          >
            {invitationData ? 'Create Account' : 'Next: Organization Setup'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Organization Setup</CardTitle>
        <CardDescription>
          Step 2: Set up your organization or join an existing one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="joinExisting"
                name="joinExisting"
                checked={formData.joinExisting}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, joinExisting: checked as boolean })
                }
                disabled={loading}
              />
              <Label htmlFor="joinExisting" className="text-sm font-medium">
                I have an invite code to join an existing organization
              </Label>
            </div>

            {formData.joinExisting ? (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  placeholder="Enter your invite code"
                  disabled={loading}
                  required={formData.joinExisting}
                />
                <p className="text-xs text-gray-500">
                  Ask your organization admin for an invite code
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="My Company or Personal Name"
                    disabled={loading}
                    required={!formData.joinExisting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationType">Organization Type</Label>
                  <Select
                    name="organizationType"
                    value={formData.organizationType}
                    onValueChange={(value) => 
                      setFormData({ ...formData, organizationType: value })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">
                        <div className="flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Personal
                        </div>
                      </SelectItem>
                      <SelectItem value="company">
                        <div className="flex items-center">
                          <Building2 className="mr-2 h-4 w-4" />
                          Company
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1"
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-4">
            New accounts are created with <span className="font-semibold">Contributor</span> access,
            allowing you to add and edit research documents.
          </p>
        </form>
      </CardContent>
    </Card>
  );

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Account Created!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your account and organization have been successfully created. Redirecting to sign in...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return step === 1 ? renderStep1() : renderStep2();
}

