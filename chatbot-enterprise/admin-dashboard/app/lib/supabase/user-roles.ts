'use server'

import { createClient, createAdminClient } from '@/app/lib/supabase/server';

export type UserRole = 'Super Admin' | 'Knowledge Manager' | 'Chatbot Manager' | 'Analyst/Reporter' | 'Support Agent';

/**
 * Assigns a role to a user
 * @param userId The user ID to assign the role to
 * @param roleName The name of the role to assign
 * @returns Success status and error message if applicable
 */
export async function assignRoleToUser(userId: string, roleName: UserRole) {
  try {
    const supabase = await createAdminClient();
    console.log('Role data:', roleName);
    
    // First, get the role ID for the specified role name
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', roleName)
      .single();
    
    if (roleError) {  
      return { success: false, error: `Error fetching role: ${roleError.message}` };
    }
    
    if (!roleData?.id) {
      return { success: false, error: `Role "${roleName}" not found` };
    }
    
    // Check if the user already has a role assigned
    const { data: existingMapping, error: existingError } = await supabase
      .from('user_role_mappings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (existingError) {
      return { success: false, error: `Error checking existing role: ${existingError.message}` };
    }
    
    if (existingMapping?.id) {
      // Update existing role mapping
      const { error: updateError } = await supabase
        .from('user_role_mappings')
        .update({ role_id: roleData.id })
        .eq('user_id', userId);
        
      if (updateError) {
        return { success: false, error: `Error updating role: ${updateError.message}` };
      }
    } else {
      // Create new role mapping
      const { error: insertError } = await supabase
        .from('user_role_mappings')
        .insert({
          user_id: userId,
          role_id: roleData.id
        });
        
      if (insertError) {
        return { success: false, error: `Error assigning role: ${insertError.message}` };
      }
    }
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Error in assignRoleToUser:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Gets the role for a user
 * @param userId The user ID to get the role for
 * @returns The role name or null if no role is assigned
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    
    // Get the role ID from the mapping
    const { data: mappingData, error: mappingError } = await supabase
      .from('user_role_mappings')
      .select('role_id')
      .eq('user_id', userId)
      .single();
      
    if (mappingError) {
      console.error('Error fetching role mapping:', mappingError);
      return null;
    }
    
    if (!mappingData?.role_id) {
      return null;
    }
    
    // Get the role name using the role ID
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('name')
      .eq('id', mappingData.role_id)
      .single();
      
    if (roleError) {
      console.error('Error fetching role:', roleError);
      return null;
    }
    
    return (roleData?.name as UserRole) || null;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

/**
 * Gets all available roles
 * @returns Array of role names
 */
export async function getAllRoles(): Promise<{ id: string; name: UserRole; permissions: Record<string, boolean> }[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('id, name, permissions');
      
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    return [];
  }
}
