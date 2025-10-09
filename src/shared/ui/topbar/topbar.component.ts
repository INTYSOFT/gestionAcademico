import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { User } from '@core/models/user';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-10 shadow-md">
      <button mat-icon-button (click)="toggle.emit()" aria-label="Toggle menu" i18n-aria-label>
        <mat-icon>menu</mat-icon>
      </button>
      <span class="ml-4 text-lg font-semibold" i18n="@@topbar.title">Panel administrativo</span>
      <span class="flex-1"></span>
      <ng-container *ngIf="user() as currentUser">
        <button mat-button [matMenuTriggerFor]="userMenu">
          <span class="mr-2">{{ currentUser.name }}</span>
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item type="button" (click)="logout.emit()" i18n="@@topbar.logout">
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
  readonly user = input<User | null>(null);

  @Output() toggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
}
