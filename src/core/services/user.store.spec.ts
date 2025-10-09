import { MENU_ITEMS } from '../models/menu';
import { UserStore } from './user.store';

describe('UserStore', () => {
  let store: UserStore;

  beforeEach(() => {
    store = new UserStore();
  });

  it('initializes the mock user when requested', () => {
    expect(store.user()).toBeNull();
    store.initialize();
    expect(store.user()).not.toBeNull();
  });

  it('clears the user on sign out', () => {
    store.simulateLogin();
    store.signOut();
    expect(store.user()).toBeNull();
  });

  it('filters menu items based on available roles', () => {
    store.simulateLogin();
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
