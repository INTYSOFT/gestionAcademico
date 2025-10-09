import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MenuItem } from '@core/models/menu';

const LABELS: Record<string, string> = {
  'navigation.dashboard': $localize`:@@nav.dashboard:Panel`,
  'navigation.ecommerce': $localize`:@@nav.ecommerce:Ecommerce`,
  'navigation.orders': $localize`:@@nav.orders:Pedidos`,
  'navigation.products': $localize`:@@nav.products:Productos`
};

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [NgFor, NgIf, NgTemplateOutlet, RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  template: `
    <ng-template #itemTemplate let-node>
      <a
        *ngIf="node.route; else labelOnly"
        mat-list-item
        [routerLink]="node.route"
        [routerLinkActive]="['active-item']"
        [routerLinkActiveOptions]="{ exact: node.exact ?? true }"
      >
        <mat-icon matListItemIcon>{{ node.icon }}</mat-icon>
        <span matListItemTitle>{{ resolveLabel(node) }}</span>
      </a>
      <ng-template #labelOnly>
        <span class="block px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ resolveLabel(node) }}
        </span>
      </ng-template>
      <div *ngIf="(node.children?.length ?? 0) > 0" class="ml-4 border-l border-slate-200 pl-4 dark:border-slate-700">
        <mat-nav-list>
          <ng-container *ngFor="let child of node.children ?? []">
            <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: child }"></ng-container>
          </ng-container>
        </mat-nav-list>
      </div>
    </ng-template>

    <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item() }"></ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .active-item {
        border-radius: 0.75rem;
        background-color: rgba(99, 102, 241, 0.15);
      }
      .dark .active-item {
        background-color: rgba(99, 102, 241, 0.3);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuItemComponent {
  readonly item = input.required<MenuItem>();

  resolveLabel(node: MenuItem): string {
    return LABELS[node.label] ?? node.label;
  }
}
