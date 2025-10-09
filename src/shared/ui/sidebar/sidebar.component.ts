import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MenuItem } from '@core/models/menu';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, MatListModule, MatIconModule, MatButtonModule, MenuItemComponent],
  template: `
    <div class="flex flex-col h-full gap-6 p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold" i18n="@@sidebar.title">Panel</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400" i18n="@@sidebar.subtitle">Bienvenido nuevamente</p>
        </div>
        <button mat-icon-button color="primary" class="dark:text-slate-100 text-slate-700" type="button">
          <mat-icon>brightness_6</mat-icon>
        </button>
      </div>
      <mat-nav-list>
        <ng-container *ngFor="let item of menu()">
          <app-menu-item [item]="item"></app-menu-item>
        </ng-container>
      </mat-nav-list>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly menu = input<MenuItem[]>(() => []);
}
