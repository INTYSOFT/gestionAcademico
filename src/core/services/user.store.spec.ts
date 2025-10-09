import { UserStore } from './user.store';

describe('UserStore', () => {
  it('should filter menu items by role', () => {
    const store = new UserStore();
    store.setUser({ id: '1', name: 'Test User', email: 'test@example.com', roles: ['admin'] });
    const menu = store.menu();

    expect(menu).toHaveLength(2);
    expect(menu[0]?.id).toBe('dashboard');
  });

  it('should evaluate roles dynamically', () => {
    const store = new UserStore();
    const hasAdmin = store.hasRole('admin');

    expect(hasAdmin()).toBe(false);

    store.setUser({ id: '2', name: 'Admin', email: 'admin@example.com', roles: ['admin'] });

    expect(hasAdmin()).toBe(true);
  });
});
