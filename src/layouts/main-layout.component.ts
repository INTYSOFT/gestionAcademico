import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../shared/ui/topbar/topbar.component';
import { SidebarComponent } from '../shared/ui/sidebar/sidebar.component';
import { UserStore } from '../core/services/user.store';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <div class="min-h-screen bg-base-100 text-base-content">
      <app-topbar (toggleSidenav)="toggleSidenav()"></app-topbar>
      <app-sidebar
        [opened]="sidenavOpen()"
        [menuItems]="menu()"
        (closed)="closeSidenav()"
      >
        <div class="p-6">
          <router-outlet></router-outlet>
        </div>
      </app-sidebar>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  private readonly userStore = inject(UserStore);
  private readonly sidenavOpenSignal = signal(true);

  readonly menu = computed(() => this.userStore.menu());

  readonly sidenavOpen = computed(() => this.sidenavOpenSignal());

  toggleSidenav(): void {
    this.sidenavOpenSignal.set(!this.sidenavOpenSignal());
  }

  closeSidenav(): void {
    this.sidenavOpenSignal.set(false);
  }
}
