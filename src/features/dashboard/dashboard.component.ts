import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { formatCurrency, trackById } from '@shared/utils';

interface Metric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly change: number;
  readonly icon: string;
}

interface Activity {
  readonly id: string;
  readonly user: string;
  readonly action: string;
  readonly when: string;
  readonly status: 'success' | 'warning' | 'info';
}

const METRICS: Metric[] = [
  {
    id: 'revenue',
    label: $localize`:@@dashboard.revenue:Ingresos totales`,
    value: formatCurrency(87_432),
    change: 12.8,
    icon: 'trending_up'
  },
  {
    id: 'orders',
    label: $localize`:@@dashboard.orders:Pedidos procesados`,
    value: '1 248',
    change: 6.2,
    icon: 'receipt_long'
  },
  {
    id: 'visits',
    label: $localize`:@@dashboard.visits:Visitas del sitio`,
    value: '58 321',
    change: -3.4,
    icon: 'public'
  }
];

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    user: 'Marie Curie',
    action: $localize`:@@dashboard.activity.order:Cerró un nuevo pedido empresarial`,
    when: $localize`:@@dashboard.activity.minutesAgo:hace 5 min`,
    status: 'success'
  },
  {
    id: '2',
    user: 'Grace Hopper',
    action: $localize`:@@dashboard.activity.ticket:Resolvió un ticket prioritario`,
    when: $localize`:@@dashboard.activity.minutesAgoLong:hace 25 min`,
    status: 'info'
  },
  {
    id: '3',
    user: 'Alan Turing',
    action: $localize`:@@dashboard.activity.payment:Confirmó un pago manual`,
    when: $localize`:@@dashboard.activity.hourAgo:hace 1 h`,
    status: 'warning'
  }
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold" i18n="@@dashboard.title">Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400" i18n="@@dashboard.subtitle">
            Resumen general del rendimiento.
          </p>
        </div>
        <button mat-raised-button color="primary" type="button">
          <mat-icon class="mr-2">download</mat-icon>
          <span i18n="@@dashboard.export">Exportar reporte</span>
        </button>
      </header>

      <div class="grid gap-6 md:grid-cols-3">
        <mat-card *ngFor="let metric of metrics; trackBy: trackById" appearance="outlined">
          <mat-card-header>
            <mat-icon mat-card-avatar class="bg-primary-500/10 text-primary-600 dark:text-primary-200">
              {{ metric.icon }}
            </mat-icon>
            <mat-card-title class="text-sm font-medium text-slate-600 dark:text-slate-300">
              {{ metric.label }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="text-3xl font-semibold text-slate-900 dark:text-white">{{ metric.value }}</p>
            <p
              class="mt-2 flex items-center text-sm"
              [ngClass]="metric.change >= 0 ? 'text-emerald-500' : 'text-rose-500'"
            >
              <mat-icon class="mr-1 text-base" [matTooltip]="trendTooltip(metric.change)">
                {{ metric.change >= 0 ? 'north_east' : 'south_east' }}
              </mat-icon>
              <span>{{ metric.change | number: '1.0-1' }}%</span>
            </p>
          </mat-card-content>
        </mat-card>
      </div>

      <section class="grid gap-6 md:grid-cols-2">
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title i18n="@@dashboard.table.title">Actividad reciente</mat-card-title>
          </mat-card-header>
          <mat-divider></mat-divider>
          <mat-card-content class="px-0">
            <table mat-table [dataSource]="activities" class="w-full">
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.user">Usuario</th>
                <td mat-cell *matCellDef="let row">{{ row.user }}</td>
              </ng-container>

              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.action">Acción</th>
                <td mat-cell *matCellDef="let row">{{ row.action }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.status">Estado</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [color]="statusColor(row.status)" selected>
                      {{ statusLabel(row.status) }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <ng-container matColumnDef="when">
                <th mat-header-cell *matHeaderCellDef i18n="@@dashboard.table.when">Hace</th>
                <td mat-cell *matCellDef="let row">{{ row.when }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title i18n="@@dashboard.tasks.title">Tareas rápidas</mat-card-title>
          </mat-card-header>
          <mat-divider></mat-divider>
          <mat-card-content class="space-y-3">
            <button mat-stroked-button color="primary" class="w-full" type="button" i18n="@@dashboard.tasks.create">
              Crear campaña
            </button>
            <button mat-stroked-button color="accent" class="w-full" type="button" i18n="@@dashboard.tasks.invite">
              Invitar miembros
            </button>
            <button mat-stroked-button class="w-full" type="button" i18n="@@dashboard.tasks.webinar">
              Programar webinar
            </button>
          </mat-card-content>
        </mat-card>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly metrics = METRICS;
  readonly activities = ACTIVITIES;
  readonly displayedColumns = ['user', 'action', 'status', 'when'] as const;
  readonly trackById = trackById<Metric>;

  trendTooltip(change: number): string {
    return change >= 0
      ? $localize`:@@dashboard.tooltip.positive:Tendencia positiva vs. el mes anterior`
      : $localize`:@@dashboard.tooltip.negative:Tendencia negativa vs. el mes anterior`;
  }

  statusLabel(status: Activity['status']): string {
    const labels: Record<Activity['status'], string> = {
      success: $localize`:@@dashboard.status.success:Completado`,
      warning: $localize`:@@dashboard.status.warning:Atención`,
      info: $localize`:@@dashboard.status.info:Seguimiento`
    };
    return labels[status];
  }

  statusColor(status: Activity['status']): 'primary' | 'accent' | 'warn' {
    const colors: Record<Activity['status'], 'primary' | 'accent' | 'warn'> = {
      success: 'primary',
      warning: 'warn',
      info: 'accent'
    };
    return colors[status];
  }
}
