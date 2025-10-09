import { Injectable, computed, signal } from '@angular/core';
import { MenuItem } from '../models/menu';
import { UserProfile } from '../models/user';

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: $localize`:menu.dashboard@@menuDashboard:Dashboard`,
    icon: 'dashboard',
    route: '/dashboard',
    roles: ['admin', 'manager'],
    exact: true
  },
  {
    id: 'ecommerce',
    label: $localize`:menu.ecommerce@@menuEcommerce:Ecommerce`,
    icon: 'shopping_cart',
    route: '/ecommerce',
    roles: ['admin']
  }
];

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly profileSignal = signal<UserProfile | null>({
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada.lovelace@example.com',
    roles: ['admin']
  });

  readonly roles = computed(() => this.profileSignal()?.roles ?? []);

  readonly menu = computed<MenuItem[]>(() => this.filterMenuByRoles(MENU_ITEMS, this.roles()));

  isAuthenticated(): boolean {
    return this.profileSignal() !== null;
  }

  profile(): UserProfile | null {
    return this.profileSignal();
  }

  private filterMenuByRoles(items: MenuItem[], roles: string[]): MenuItem[] {
    return items
      .filter((item) => item.roles.length === 0 || item.roles.some((role) => roles.includes(role)))
      .map((item) => ({
        ...item,
        children: item.children ? this.filterMenuByRoles(item.children, roles) : undefined
      }));
  }
}
