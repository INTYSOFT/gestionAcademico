import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { NgFor } from '@angular/common';
import { MenuItem } from '../../../core/models/menu';
import { MenuItemComponent } from '../menu-item/menu-item.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, NgFor, MenuItemComponent],
  template: `
    <mat-sidenav-container class="min-h-[calc(100vh-64px)] bg-base-100">
      <mat-sidenav
        mode="side"
        [opened]="opened"
        class="w-[var(--sidebar-width)] bg-base-100"
        (closedStart)="closed.emit()"
      >
        <mat-nav-list>
          <app-menu-item
            *ngFor="let item of items(); trackBy: trackById"
            [item]="item"
          ></app-menu-item>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <ng-content></ng-content>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Input() opened = true;

  @Input({ required: true })
  set menuItems(value: MenuItem[]) {
    this.itemsSignal.set(value);
  }

  @Output() readonly closed = new EventEmitter<void>();

  private readonly itemsSignal = signal<MenuItem[]>([]);

  protected readonly items = computed(() => this.itemsSignal());

  protected trackById = (_: number, item: MenuItem) => item.id;
}
