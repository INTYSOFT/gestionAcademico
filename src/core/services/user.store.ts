import { computed, Injectable, signal } from '@angular/core';
import { MenuItem, MENU_ITEMS } from '../models/menu';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly userSignal = signal<User | null>(null);
  private readonly menuSignal = signal<MenuItem[]>(MENU_ITEMS);

  readonly user = computed(() => this.userSignal());
  readonly roles = computed(() => this.userSignal()?.roles ?? []);
  readonly hasRole = computed(() => {
    const roles = this.roles();
    return (role: string) => roles.includes(role);
  });
  readonly menuComputed = computed(() => this.filterMenuByRoles(this.menuSignal(), this.roles()));

  setUser(user: User | null): void {
    this.userSignal.set(user ? { ...user, roles: user.roles ?? [] } : null);
  }

  updateUser(partial: Partial<User>): void {
    const current = this.userSignal();
    if (!current) {
      if (partial.id && partial.name && partial.email) {
        this.userSignal.set({
          id: partial.id,
          name: partial.name,
          email: partial.email,
          roles: partial.roles ?? [],
          avatarUrl: partial.avatarUrl
        });
      }
      return;
    }

    this.userSignal.set({
      ...current,
      ...partial,
      roles: partial.roles ?? current.roles
    });
  }

  clear(): void {
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
