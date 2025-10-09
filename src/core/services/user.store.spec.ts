import { UserStore } from './user.store';

describe('UserStore', () => {
  it('should filter menu items by role', () => {
    const store = new UserStore();
    const menu = store.menu();

    expect(menu).toHaveLength(2);
    expect(menu[0]?.id).toBe('dashboard');
  });
});
