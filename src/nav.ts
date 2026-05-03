// Navigation Structure
export interface NavItem {
  label: string;
  path: string;
  requiresAuth: boolean;
  roles?: string[];
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    requiresAuth: true,
  },
  {
    label: 'Categories',
    path: '/categories',
    requiresAuth: true,
  },
  {
    label: 'Bank Accounts',
    path: '/bank-accounts',
    requiresAuth: true,
  },
  {
    label: 'Import',
    path: '/import',
    requiresAuth: true,
  },
  {
    label: 'Transactions',
    path: '/transactions',
    requiresAuth: true,
  },
  {
    label: 'Reports',
    path: '/reconciliation',
    requiresAuth: true,
  },
];
