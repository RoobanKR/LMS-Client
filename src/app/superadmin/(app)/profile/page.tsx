'use client';
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2, Mail, User as UserIcon } from 'lucide-react';
import { useSuperAdminAuthStore } from '@/stores/superAdminAuthStore';
import { superAdminChangePassword } from '@/apiServices/superadmin/authService';
import { toApiError } from '@/lib/superAdminApiClient';
import { showSuccessToast, showErrorToast } from '@/components/ui/toastUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, Panel } from '../../_components/ui';

export default function ProfilePage() {
  const superAdmin = useSuperAdminAuthStore((s) => s.superAdmin);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const changeMutation = useMutation({
    mutationFn: () => superAdminChangePassword(currentPassword, newPassword),
    onSuccess: () => {
      showSuccessToast('Password updated');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    },
    onError: (err) => showErrorToast(toApiError(err).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { showErrorToast('Both fields are required'); return; }
    if (newPassword.length < 8) { showErrorToast('New password must be at least 8 characters'); return; }
    if (newPassword !== confirm) { showErrorToast('Passwords do not match'); return; }
    changeMutation.mutate();
  };

  return (
    <div>
      <PageHeader title="Profile" description="Your platform owner account." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground sm:h-16 sm:w-16">
              {superAdmin?.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0">
              <div className="break-words text-lg font-semibold text-foreground">{superAdmin?.name}</div>
              <div className="text-sm text-muted-foreground">Platform Owner</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5">
              <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 break-words text-foreground">{superAdmin?.name}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 break-all text-foreground">{superAdmin?.email}</span>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" /> Change Password
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={changeMutation.isPending}>
              {changeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
