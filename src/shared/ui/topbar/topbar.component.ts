import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { OidcAuthService } from '../../../core/auth/oidc-auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AsyncPipe, NgIf, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-20">
      <button mat-icon-button type="button" (click)="toggleSidenav.emit()" aria-label="Toggle menu">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="ml-4 text-lg font-semibold">Gestión Académica</span>
      <span class="flex-1"></span>
      <ng-container *ngIf="user$ | async as user">
        <button mat-button type="button" [matMenuTriggerFor]="userMenu" aria-label="User menu" class="flex items-center gap-3">
          <ng-container *ngIf="user.picture; else initialsAvatar">
            <img
              [src]="user.picture"
              alt="{{ user.name }}"
              class="h-9 w-9 rounded-full border border-white/40 object-cover"
            />
          </ng-container>
          <ng-template #initialsAvatar>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold uppercase">
              {{ user.name?.[0] ?? '?' }}
            </span>
          </ng-template>
          <span class="hidden text-left lg:flex lg:flex-col">
            <span class="text-sm font-medium">{{ user.name }}</span>
            <span class="text-xs opacity-80">{{ user.email }}</span>
          </span>
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu" xPosition="before">
          <button mat-menu-item type="button">
            <mat-icon>person</mat-icon>
            <span>Perfil</span>
          </button>
          <button mat-menu-item type="button">
            <mat-icon>translate</mat-icon>
            <span>Cambiar idioma</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item type="button" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Cerrar sesión</span>
          </button>
        </mat-menu>
      </ng-container>
    </mat-toolbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  @Output() readonly toggleSidenav = new EventEmitter<void>();

  private readonly authService = inject(OidcAuthService);
  readonly user$ = this.authService.user$;

  logout(): void {
    this.authService.logout();
  }
}
