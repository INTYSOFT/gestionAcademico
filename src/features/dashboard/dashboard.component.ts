import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { formatCurrency } from '@shared/utils';

type Metric = {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down';
};

type Activity = {
  id: string;
  user: string;
  action: string;
  when: string;
};

const METRICS: Metric[] = [
  { id: 'revenue', label: $localize`:@@dashboard.revenue:Ingresos`, value: formatCurrency(87432), trend: 'up' },
  { id: 'orders', label: $localize`:@@dashboard.orders:Pedidos`, value: '1 248', trend: 'up' },
  { id: 'visits', label: $localize`:@@dashboard.visits:Visitas`, value: '58 321', trend: 'down' }
];

const ACTIVITIES: Activity[] = [
  { id: '1', user: 'Marie Curie', action: $localize`:@@dashboard.activity.order:Cerró un nuevo pedido`, when: 'hace 5 min' },
  { id: '2', user: 'Grace Hopper', action: $localize`:@@dashboard.activity.ticket:Resolvió un ticket`, when: 'hace 25 min' },
  { id: '3', user: 'Alan Turing', action: $localize`:@@dashboard.activity.payment:Confirmó un pago`, when: 'hace 1 h' }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgClass, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold" i18n="@@dashboard.title">Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400" i18n="@@dashboard.subtitle">
            Resumen general del rendimiento.
          </p>
        </div>
        <button mat-raised-button color="primary">
          <mat-icon class="mr-2">download</mat-icon>
          <span i18n="@@dashboard.export">Exportar reporte</span>
        </button>
      </header>

      <div class="grid gap-6 md:grid-cols-3">
        <article class="card" *ngFor="let metric of metrics">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ metric.label }}</p>
              <h2 class="text-3xl font-semibold">{{ metric.value }}</h2>
            </div>
            <mat-icon [ngClass]="metric.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'">
              {{ metric.trend === 'up' ? 'trending_up' : 'trending_down' }}
            </mat-icon>
          </div>
        </article>
      </div>

      <section class="grid gap-6 md:grid-cols-2">
        <article class="card">
          <h2 class="mb-4 text-lg font-semibold" i18n="@@dashboard.table.title">Actividad reciente</h2>
          <table mat-table [dataSource]="activities" class="w-full">
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.user">Usuario</th>
              <td mat-cell *matCellDef="let row">{{ row.user }}</td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.action">Acción</th>
              <td mat-cell *matCellDef="let row">{{ row.action }}</td>
            </ng-container>

            <ng-container matColumnDef="when">
              <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.when">Hace</th>
              <td mat-cell *matCellDef="let row">{{ row.when }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </article>

        <article class="card">
          <h2 class="mb-4 text-lg font-semibold" i18n="@@dashboard.tasks.title">Tareas rápidas</h2>
          <div class="space-y-3">
            <button mat-stroked-button color="primary" class="w-full" i18n="@@dashboard.tasks.create">
              Crear campaña
            </button>
            <button mat-stroked-button color="accent" class="w-full" i18n="@@dashboard.tasks.invite">
              Invitar miembros
            </button>
            <button mat-stroked-button class="w-full" i18n="@@dashboard.tasks.webinar">
              Programar webinar
            </button>
          </div>
        </article>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly metrics = METRICS;
  readonly activities = ACTIVITIES;
  readonly displayedColumns = ['user', 'action', 'when'];
}
