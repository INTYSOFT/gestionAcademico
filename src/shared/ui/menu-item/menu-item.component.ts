import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../../core/models/menu';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <ng-container *ngIf="item() as menuItem">
      <a
        mat-list-item
        [routerLink]="menuItem.route"
        routerLinkActive="active"
        #rla="routerLinkActive"
        [activated]="rla.isActive"
        [attr.data-test-id]="menuItem.id"
        class="rounded-lg"
        *ngIf="menuItem.route; else groupTemplate"
      >
        <mat-icon matListItemIcon>{{ menuItem.icon }}</mat-icon>
        <div matListItemTitle>{{ menuItem.label }}</div>
      </a>
      <ng-template #groupTemplate>
        <div class="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
          {{ menuItem.label }}
        </div>
        <div class="space-y-1 pl-4">
          <app-menu-item
            *ngFor="let child of menuItem.children ?? []; trackBy: trackById"
            [item]="child"
          />
        </div>
      </ng-template>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuItemComponent {
  private readonly itemSignal = signal<MenuItem | null>(null);

  @Input({ required: true })
  set item(value: MenuItem) {
    this.itemSignal.set(value);
  }

  protected readonly item = computed(() => this.itemSignal());

  protected trackById = (_: number, menuItem: MenuItem) => menuItem.id;
}
