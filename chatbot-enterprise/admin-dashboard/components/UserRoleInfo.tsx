'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/context';
import { getAllRoles, assignRoleToUser } from '@/app/lib/supabase/user-roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type UserRole = 'Super Admin' | 'Knowledge Manager' | 'Chatbot Manager' | 'Analyst/Reporter' | 'Support Agent';

interface RoleData {
  id: string;
  name: UserRole;
  permissions: Record<string, boolean>;
}

export default function UserRoleInfo() {
  const { user, userRole, isLoading } = useSupabase();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  useEffect(() => {
    const loadRoles = async () => {
      if (user) {
        console.log('Loading roles with userRole:', userRole);
        setLoadingRoles(true);
        try {
          const roleData = await getAllRoles();
          console.log('Roles loaded:', roleData);
          setRoles(roleData);
        } catch (error) {
          console.error('Error loading roles:', error);
        } finally {
          setLoadingRoles(false);
        }
      }
    };

    loadRoles();
  }, [user]);

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return;
    
    setChangingRole(true);
    try {
      const { success, error } = await assignRoleToUser(user.id, newRole);
      
      if (success) {
        toast.success(`Role changed to ${newRole}`);
        // Force a page refresh to update the UI
        window.location.reload();
      } else {
        toast.error(`Failed to change role: ${error}`);
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('An error occurred while changing role');
    } finally {
      setChangingRole(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Role Information</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Role Information</CardTitle>
          <CardDescription>Please log in to view your role information.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Information</CardTitle>
        <CardDescription>
          Your current role: <span className="font-semibold">{userRole || 'No role assigned'}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {user && (
          <div className="mt-4">
            <h3 className="font-medium text-lg mb-2">Change Your Role</h3>
            <div className="flex flex-wrap gap-2">
              {loadingRoles ? (
                <p>Loading roles...</p>
              ) : roles.length === 0 ? (
                <p>No roles available. Please check database configuration.</p>
              ) : (
                roles.map((role) => (
                  <Button
                    key={role.id}
                    variant={userRole === role.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleRoleChange(role.name)}
                    disabled={changingRole || userRole === role.name}
                  >
                    {role.name}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <h3 className="font-medium text-lg mb-2">Role Permissions</h3>
          <div className="text-sm">
            {userRole === 'Super Admin' && (
              <p>As a Super Admin, you have full access to all features of the system.</p>
            )}
            {userRole === 'Knowledge Manager' && (
              <p>As a Knowledge Manager, you can create, edit, and delete knowledge bases and documents.</p>
            )}
            {userRole === 'Chatbot Manager' && (
              <p>As a Chatbot Manager, you can create, configure, and manage chatbots.</p>
            )}
            {userRole === 'Analyst/Reporter' && (
              <p>As an Analyst/Reporter, you can view analytics, reports, and chat history.</p>
            )}
            {userRole === 'Support Agent' && (
              <p>As a Support Agent, you can intervene in conversations and handle customer interactions.</p>
            )}
            {!userRole && (
              <p>You don&apos;t have any role assigned. Please contact an administrator.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
