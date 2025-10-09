import { MenuItem } from '@core/models/menu';

import { UserStore } from './user.store';

describe('UserStore', () => {
  let store: UserStore;

  beforeEach(() => {
    store = new UserStore();
  });

  it('filters menu items according to user roles', () => {
    store.setUser({
      id: '1',
      name: 'Manager Jane',
      email: 'manager@example.com',
      roles: ['manager']
    });

    let menu = store.menuComputed();
    const ecommerce = menu.find((item) => item.id === 'ecommerce') as MenuItem | undefined;
    expect(ecommerce).toBeDefined();
    expect(ecommerce?.children?.some((child) => child.id === 'orders')).toBe(true);
    expect(ecommerce?.children?.some((child) => child.id === 'products')).toBe(false);

    store.updateUser({ roles: ['admin'] });
    menu = store.menuComputed();
    const ecommerceForAdmin = menu.find((item) => item.id === 'ecommerce');
    expect(ecommerceForAdmin?.children?.some((child) => child.id === 'products')).toBe(true);
  });

  it('clears menu when user has no matching roles', () => {
    store.setUser({
      id: '2',
      name: 'Analyst Ana',
      email: 'analyst@example.com',
      roles: ['analyst']
    });

    const menu = store.menuComputed();
    expect(menu.some((item) => item.id === 'dashboard')).toBe(true);
    expect(menu.some((item) => item.id === 'ecommerce')).toBe(false);
  });
});
