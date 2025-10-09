import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-20">
      <button mat-icon-button type="button" (click)="toggleSidenav.emit()" aria-label="Toggle menu">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="ml-4 text-lg font-semibold">Gestión Académica</span>
      <span class="flex-1"></span>
      <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item type="button">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  @Output() readonly toggleSidenav = new EventEmitter<void>();
}
