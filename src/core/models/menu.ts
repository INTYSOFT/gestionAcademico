export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  roles?: string[];
  exact?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'navigation.dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['admin', 'manager', 'analyst']
  },
  {
    id: 'ecommerce',
    label: 'navigation.ecommerce',
    icon: 'shopping_cart',
    route: '/ecommerce',
    roles: ['admin', 'manager'],
    children: [
      {
        id: 'orders',
        label: 'navigation.orders',
        icon: 'receipt_long',
        route: '/ecommerce#orders',
        roles: ['admin', 'manager']
      },
      {
        id: 'products',
        label: 'navigation.products',
        icon: 'inventory_2',
        route: '/ecommerce#products',
        roles: ['admin']
      }
    ]
  }
];
