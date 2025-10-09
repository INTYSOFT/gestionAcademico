import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { NgFor } from '@angular/common';

interface Metric {
  id: string;
  label: string;
  value: string;
}

interface Activity {
  id: string;
  action: string;
  time: string;
}

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [MatCardModule, MatTableModule, NgFor],
  template: `
    <h1 class="mb-6 text-3xl font-semibold">{{ titleLabel }}</h1>
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <mat-card appearance="outlined" *ngFor="let metric of metrics">
        <mat-card-title>{{ metric.label }}</mat-card-title>
        <mat-card-content>
          <p class="text-3xl font-bold">{{ metric.value }}</p>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="mt-8 grid gap-6 xl:grid-cols-3">
      <mat-card appearance="outlined" class="xl:col-span-2">
        <mat-card-title>{{ recentActivityLabel }}</mat-card-title>
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="activities" class="min-w-full">
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>{{ actionLabel }}</th>
              <td mat-cell *matCellDef="let activity">{{ activity.action }}</td>
            </ng-container>
            <ng-container matColumnDef="time">
              <th mat-header-cell *matHeaderCellDef>{{ timeLabel }}</th>
              <td mat-cell *matCellDef="let activity">{{ activity.time }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      </mat-card>
      <mat-card appearance="outlined">
        <mat-card-title>{{ announcementsLabel }}</mat-card-title>
        <mat-card-content>
          <p class="text-sm text-muted-foreground">
            Próxima reunión general el viernes a las 9:00.
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly titleLabel = $localize`:dashboard.title@@dashboardTitle:Dashboard`;
  readonly recentActivityLabel = $localize`:dashboard.recent@@dashboardRecent:Actividad reciente`;
  readonly actionLabel = $localize`:dashboard.action@@dashboardAction:Acción`;
  readonly timeLabel = $localize`:dashboard.time@@dashboardTime:Tiempo`;
  readonly announcementsLabel = $localize`:dashboard.announcements@@dashboardAnnouncements:Anuncios`;

  readonly metrics: Metric[] = [
    { id: 'students', label: $localize`:dashboard.students@@dashboardStudents:Estudiantes`, value: '1,240' },
    {
      id: 'courses',
      label: $localize`:dashboard.courses@@dashboardCourses:Cursos activos`,
      value: '32'
    },
    { id: 'teachers', label: $localize`:dashboard.teachers@@dashboardTeachers:Docentes`, value: '58' },
    { id: 'attendance', label: $localize`:dashboard.attendance@@dashboardAttendance:Asistencia`, value: '94%' }
  ];

  readonly activities: Activity[] = [
    { id: '1', action: 'Se creó el curso de Data Science', time: 'Hace 2 horas' },
    { id: '2', action: 'María López completó la evaluación', time: 'Hace 4 horas' },
    { id: '3', action: 'Nuevo mensaje en el foro de IA', time: 'Hace 6 horas' }
  ];

  readonly displayedColumns = ['action', 'time'];
}
