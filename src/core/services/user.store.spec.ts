import { UserStore } from './user.store';

describe('UserStore', () => {
  it('should filter menu items by role', () => {
    const store = new UserStore();
    store.setUser({ id: '1', name: 'Admin', email: 'admin@example.com', roles: ['admin'] });

    const menu = store.menu();

    expect(menu).toHaveLength(2);
    expect(menu.map((item) => item.id)).toEqual(['dashboard', 'ecommerce']);
  });

  it('should hide restricted menu items when role is missing', () => {
    const store = new UserStore();
    store.setUser({ id: '2', name: 'Manager', email: 'manager@example.com', roles: ['manager'] });

    const menu = store.menu();

    expect(menu).toHaveLength(1);
    expect(menu[0]?.id).toBe('dashboard');
  });

  it('should deduplicate roles when setting a user profile', () => {
    const store = new UserStore();
    store.setUser({
      id: '3',
      name: 'User',
      email: 'user@example.com',
      roles: ['admin', 'admin', 'manager']
    });

    expect(store.roles()).toEqual(['admin', 'manager']);
  });
});
