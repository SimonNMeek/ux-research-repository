import { User } from './auth';

// System role permissions
export const PERMISSIONS = {
  // Workspace management
  CREATE_WORKSPACE: 'create_workspace',
  MANAGE_WORKSPACE: 'manage_workspace',
  
  // Project management
  CREATE_PROJECT: 'create_project',
  MANAGE_PROJECT: 'manage_project',
  
  // Document management
  CREATE_DOCUMENT: 'create_document',
  EDIT_DOCUMENT: 'edit_document',
  DELETE_DOCUMENT: 'delete_document',
  
  // User management
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // General permissions
  VIEW_ALL: 'view_all',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Define which roles have which permissions
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    PERMISSIONS.CREATE_WORKSPACE,
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.MANAGE_PROJECT,
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_ALL,
  ],
  admin: [
    PERMISSIONS.CREATE_WORKSPACE,
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.MANAGE_PROJECT,
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
  ],
  contributor: [
    PERMISSIONS.CREATE_DOCUMENT,
    PERMISSIONS.EDIT_DOCUMENT,
  ],
  viewer: [
    // No create/edit permissions
  ],
};

/**
 * Check if a user has a specific permission based on their system role
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user || !user.system_role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.system_role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user can create workspaces
 * This checks system roles, but organization-level permissions are checked separately in the API
 */
export function canCreateWorkspace(user: User | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_WORKSPACE);
}

/**
 * Check if a user can create projects
 */
export function canCreateProject(user: User | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_PROJECT);
}

/**
 * Check if a user can manage documents (create/edit/delete)
 */
export function canManageDocuments(user: User | null): boolean {
  return hasPermission(user, PERMISSIONS.CREATE_DOCUMENT) || 
         hasPermission(user, PERMISSIONS.EDIT_DOCUMENT);
}

/**
 * Check if a user can manage users and roles
 */
export function canManageUsers(user: User | null): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_USERS);
}

/**
 * Get a user-friendly error message for insufficient permissions
 */
export function getPermissionErrorMessage(permission: Permission): string {
  const messages: Record<Permission, string> = {
    [PERMISSIONS.CREATE_WORKSPACE]: 'Only admins and super admins can create workspaces',
    [PERMISSIONS.MANAGE_WORKSPACE]: 'You do not have permission to manage this workspace',
    [PERMISSIONS.CREATE_PROJECT]: 'Only admins and super admins can create projects',
    [PERMISSIONS.MANAGE_PROJECT]: 'You do not have permission to manage this project',
    [PERMISSIONS.CREATE_DOCUMENT]: 'You do not have permission to create documents',
    [PERMISSIONS.EDIT_DOCUMENT]: 'You do not have permission to edit documents',
    [PERMISSIONS.DELETE_DOCUMENT]: 'You do not have permission to delete documents',
    [PERMISSIONS.MANAGE_USERS]: 'Only super admins can manage users',
    [PERMISSIONS.MANAGE_ROLES]: 'Only super admins can manage roles',
    [PERMISSIONS.VIEW_ALL]: 'You do not have permission to view this content',
  };
  
  return messages[permission] || 'You do not have permission to perform this action';
}

