import { computed, Injectable, signal } from '@angular/core';
import { MenuItem, MENU_ITEMS } from '../models/menu';
import { User } from '../models/user';

const MOCK_USER: User = {
  id: '1',
  name: 'Ada Lovelace',
  email: 'ada.lovelace@example.com',
  roles: ['admin', 'manager'],
  avatarUrl: 'https://i.pravatar.cc/150?img=5'
};

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly userSignal = signal<User | null>(null);
  private readonly menuSignal = signal<MenuItem[]>(MENU_ITEMS);

  readonly user = computed(() => this.userSignal());
  readonly roles = computed(() => this.userSignal()?.roles ?? []);
  readonly menuComputed = computed(() => this.filterMenuByRoles(this.menuSignal(), this.roles()));

  initialize(): void {
    if (!this.userSignal()) {
      this.userSignal.set(MOCK_USER);
    }
  }

  simulateLogin(): void {
    this.userSignal.set(MOCK_USER);
  }

  signOut(): void {
    this.userSignal.set(null);
  }

  private filterMenuByRoles(items: MenuItem[], roles: string[]): MenuItem[] {
    return items
      .map((item) => ({ ...item }))
      .map((item) => {
        const children = item.children ? this.filterMenuByRoles(item.children, roles) : undefined;
        return { ...item, children };
      })
      .filter((item) => {
        const isVisible = this.canAccess(item.roles, roles) || (item.children?.length ?? 0) > 0;
        return isVisible;
      });
  }

  private canAccess(requiredRoles: string[] | undefined, roles: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.some((role) => roles.includes(role));
  }
}
