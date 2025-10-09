import { MENU_ITEMS } from '../models/menu';
import { UserStore } from './user.store';

const MOCK_USER = {
  id: '1',
  name: 'Ada Lovelace',
  email: 'ada.lovelace@example.com',
  roles: ['admin', 'manager'],
  avatarUrl: 'https://i.pravatar.cc/150?img=5'
};

describe('UserStore', () => {
  let store: UserStore;

  beforeEach(() => {
    store = new UserStore();
  });

  it('sets and clears the user correctly', () => {
    expect(store.user()).toBeNull();
    store.setUser(MOCK_USER);
    expect(store.user()).toEqual(MOCK_USER);
    store.clear();
    expect(store.user()).toBeNull();
  });

  it('merges partial updates when user already exists', () => {
    store.setUser(MOCK_USER);
    store.updateUser({ name: 'Ada Byron', roles: ['admin'] });
    expect(store.user()).toEqual({ ...MOCK_USER, name: 'Ada Byron', roles: ['admin'] });
  });

  it('filters menu items based on available roles', () => {
    store.setUser(MOCK_USER);
    const menu = store.menuComputed();
    expect(menu.length).toBeGreaterThan(0);
    const dashboard = menu.find((item) => item.id === 'dashboard');
    expect(dashboard).toBeDefined();
    const adminOnlyChild = MENU_ITEMS.find((item) => item.id === 'ecommerce')?.children?.find(
      (child) => child.id === 'products'
    );
    if (!adminOnlyChild) {
      throw new Error('Mock data missing products child');
    }
    const ecommerce = menu.find((item) => item.id === 'ecommerce');
    expect(ecommerce?.children?.some((child) => child.id === adminOnlyChild.id)).toBe(true);
  });
});
