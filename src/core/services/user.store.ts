import { Injectable, Signal, computed, signal } from '@angular/core';
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
  private readonly userSignal = signal<UserProfile | null>(null);

  readonly user = computed(() => this.userSignal());

  readonly roles = computed(() => this.user()?.roles ?? []);

  readonly menu = computed<MenuItem[]>(() => this.filterMenuByRoles(MENU_ITEMS, this.roles()));

  setUser(profile: UserProfile | null): void {
    this.userSignal.set(profile ? { ...profile, roles: [...new Set(profile.roles ?? [])] } : null);
  }

  clear(): void {
    this.userSignal.set(null);
  }

  isAuthenticated(): boolean {
    return this.userSignal() !== null;
  }

  hasRole(role: string): Signal<boolean> {
    return computed(() => this.roles().includes(role));
  }

  profile(): UserProfile | null {
    return this.userSignal();
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
