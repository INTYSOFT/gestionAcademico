import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar.component';
import { TopbarComponent } from '@shared/ui/topbar/topbar.component';
import { UserStore } from '@core/services/user.store';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    NgIf,
    SidebarComponent,
    TopbarComponent
  ],
  template: `
    <mat-sidenav-container class="h-screen bg-slate-100 dark:bg-slate-950">
      <mat-sidenav
        mode="side"
        [opened]="opened()"
        class="w-72 border-0 bg-white dark:bg-slate-900"
      >
        <app-sidebar [menu]="menu()"></app-sidebar>
      </mat-sidenav>

      <mat-sidenav-content>
        <app-topbar [user]="user()" (toggle)="toggle()" (logout)="logout()"></app-topbar>
        <main class="p-6">
          <div class="mx-auto max-w-7xl space-y-6">
            <router-outlet></router-outlet>
          </div>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      mat-sidenav-container {
        height: 100vh;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  private readonly userStore = inject(UserStore);
  private readonly openedSignal = signal(true);

  readonly user = this.userStore.user;
  readonly menu = this.userStore.menuComputed;

  toggle(): void {
    this.openedSignal.update((value) => !value);
  }

  logout(): void {
    this.userStore.signOut();
  }

  opened(): boolean {
    return this.openedSignal();
  }
}
