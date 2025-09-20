'use client';

import React, { useState, useEffect } from 'react';
import { useWorkbookAuth, AuthGuard, RoleGuard } from './WorkbookAuthProvider';
import { WorkbookLogin } from './WorkbookLogin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, AlertTriangle, LogOut, User } from 'lucide-react';

interface SecureWorkbookWrapperProps {
  children: React.ReactNode;
}

// Security banner component
function SecurityBanner() {
  const { session, canRecordAudio, canTranscribeAudio, canAccessVIPContent } =
    useWorkbookAuth();

  const getSecurityLevel = () => {
    if (canAccessVIPContent)
      return { level: 'VIP', color: 'text-tomb45-green', bg: 'bg-green-50' };
    if (canTranscribeAudio)
      return { level: 'Premium', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { level: 'Basic', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const security = getSecurityLevel();

  return (
    <div className={`${security.bg} border-l-4 border-l-tomb45-green p-4 mb-6`}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <Shield className={`w-5 h-5 ${security.color}`} />
          <div>
            <h3 className='font-medium text-text-primary'>
              Secure Session Active
            </h3>
            <p className='text-sm text-text-secondary'>
              Authenticated as{' '}
              <span className={`font-medium ${security.color}`}>
                {session?.name}
              </span>{' '}
              with{' '}
              <span className={`font-medium ${security.color} uppercase`}>
                {security.level}
              </span>{' '}
              access
            </p>
          </div>
        </div>
        <div className='flex items-center space-x-4'>
          <div className='text-right text-sm'>
            <p className='text-text-secondary'>Session expires:</p>
            <p className='font-medium text-text-primary'>
              {session?.exp
                ? new Date(session.exp * 1000).toLocaleTimeString()
                : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// User info panel
function UserInfoPanel() {
  const { session, logout } = useWorkbookAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Card className='mb-6 bg-background-secondary border-border-primary'>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <User className='w-5 h-5 text-tomb45-green' />
            Account Information
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleLogout}
            className='flex items-center gap-2'
          >
            <LogOut className='w-4 h-4' />
            Logout
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h4 className='font-medium text-text-primary mb-2'>User Details</h4>
            <div className='space-y-1 text-sm'>
              <div>
                <span className='text-text-secondary'>Email:</span>
                <span className='ml-2 text-text-primary'>{session?.email}</span>
              </div>
              <div>
                <span className='text-text-secondary'>Role:</span>
                <span className='ml-2 text-tomb45-green font-medium uppercase'>
                  {session?.role}
                </span>
              </div>
              <div>
                <span className='text-text-secondary'>User ID:</span>
                <span className='ml-2 text-text-primary font-mono text-xs'>
                  {session?.userId}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className='font-medium text-text-primary mb-2'>Permissions</h4>
            <div className='flex flex-wrap gap-1'>
              {session?.permissions.map(permission => (
                <span
                  key={permission}
                  className='px-2 py-1 bg-tomb45-green bg-opacity-10 text-tomb45-green text-xs rounded'
                >
                  {permission
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Security warning for restricted features
function SecurityWarning({
  feature,
  requiredLevel,
}: {
  feature: string;
  requiredLevel: string;
}) {
  return (
    <Card className='mb-4 border-yellow-200 bg-yellow-50'>
      <CardContent className='p-4'>
        <div className='flex items-center space-x-3'>
          <AlertTriangle className='w-5 h-5 text-yellow-600' />
          <div>
            <h3 className='font-medium text-yellow-800'>Access Restricted</h3>
            <p className='text-sm text-yellow-700'>
              {feature} requires {requiredLevel} access. Your current role may
              not have sufficient permissions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced permission wrapper
function PermissionGuard({
  children,
  permission,
  feature,
  requiredLevel = 'Premium',
}: {
  children: React.ReactNode;
  permission?: string;
  feature?: string;
  requiredLevel?: string;
}) {
  const { hasPermission } = useWorkbookAuth();

  if (permission && !hasPermission(permission)) {
    return (
      <SecurityWarning
        feature={feature || 'This feature'}
        requiredLevel={requiredLevel}
      />
    );
  }

  return <>{children}</>;
}

// Main wrapper component
export function SecureWorkbookWrapper({
  children,
}: SecureWorkbookWrapperProps) {
  const { isAuthenticated, isLoading, session } = useWorkbookAuth();
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Auto-hide user info panel after initial display
  useEffect(() => {
    if (isAuthenticated) {
      setShowUserInfo(true);
      const timer = setTimeout(() => setShowUserInfo(false), 10000); // Hide after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background-primary flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-tomb45-green mx-auto mb-4'></div>
          <p className='text-text-secondary'>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <WorkbookLogin />;
  }

  return (
    <div className='min-h-screen bg-background-primary'>
      {/* Security banner - always visible when authenticated */}
      <div className='bg-background-secondary border-b border-border-primary'>
        <div className='max-w-6xl mx-auto px-6 py-4'>
          <SecurityBanner />
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-6'>
        {/* User info panel - shows initially then can be toggled */}
        {showUserInfo && <UserInfoPanel />}

        {/* Toggle user info button */}
        {!showUserInfo && (
          <div className='mb-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowUserInfo(true)}
              className='flex items-center gap-2'
            >
              <User className='w-4 h-4' />
              Show Account Info
            </Button>
          </div>
        )}

        {/* Main content with permission guards */}
        <div className='space-y-6'>
          {/* Basic content - always accessible */}
          {children}

          {/* Audio recording permission guard */}
          {/* <PermissionGuard
            permission="record_audio"
            feature="Audio Recording"
            requiredLevel="Premium or VIP"
          >
            Audio features would be rendered here
          </PermissionGuard> */}

          {/* Transcription permission guard */}
          {/* <PermissionGuard
            permission="transcribe_audio"
            feature="Audio Transcription"
            requiredLevel="Premium or VIP"
          >
            Transcription features would be rendered here
          </PermissionGuard> */}

          {/* VIP content guard */}
          {/* <RoleGuard
            requiredPermission="access_vip_content"
            fallback={
              <SecurityWarning feature="VIP Exclusive Content" requiredLevel="VIP" />
            }
          >
            VIP content would be rendered here
          </RoleGuard> */}
        </div>
      </div>
    </div>
  );
}

export default SecureWorkbookWrapper;
