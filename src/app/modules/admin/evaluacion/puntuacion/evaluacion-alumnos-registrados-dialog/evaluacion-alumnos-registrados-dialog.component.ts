import { AsyncPipe, CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GridApi,
    GridReadyEvent,
    ValueGetterParams,
} from 'ag-grid-community';
import { DateTime } from 'luxon';
import { Evaluacion } from 'app/core/models/centro-estudios/evaluacion.model';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';

export interface EvaluacionAlumnosRegistradosDialogData {
    evaluacionNombre: string;
    sedeNombre: string;
    cicloNombre: string;
    seccionNombre: string;
    evaluaciones: Evaluacion[];
}

interface AlumnoRegistradoRow {
    evaluacionId: number;
    alumnoId: number;
    dni: string;
    alumnoNombre: string;
    fechaRegistro: string | null;
}

@Component({
    selector: 'app-evaluacion-alumnos-registrados-dialog',
    standalone: true,
    templateUrl: './evaluacion-alumnos-registrados-dialog.component.html',
    styleUrls: ['./evaluacion-alumnos-registrados-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        AsyncPipe,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        AgGridAngular,
    ],
})
export class EvaluacionAlumnosRegistradosDialogComponent {
    private readonly dialogRef = inject(
        MatDialogRef<EvaluacionAlumnosRegistradosDialogComponent>
    );
    private readonly data = inject<EvaluacionAlumnosRegistradosDialogData>(MAT_DIALOG_DATA);
    private readonly alumnosService = inject(AlumnosService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly evaluacionNombre = this.data.evaluacionNombre;
    protected readonly sedeNombre = this.data.sedeNombre;
    protected readonly cicloNombre = this.data.cicloNombre;
    protected readonly seccionNombre = this.data.seccionNombre;

    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    private readonly rowsSubject = new BehaviorSubject<AlumnoRegistradoRow[]>([]);
    protected readonly rows$: Observable<AlumnoRegistradoRow[]> = this.rowsSubject.asObservable();

    protected readonly columnDefs: ColDef<AlumnoRegistradoRow>[] = [
        {
            headerName: '#',
            width: 80,
            valueGetter: (params: ValueGetterParams<AlumnoRegistradoRow>) =>
                (params.node?.rowIndex ?? 0) + 1,
            cellClass: 'font-medium text-gray-700',
        },
        { headerName: 'DNI', field: 'dni', minWidth: 140, flex: 1 },
        { headerName: 'Alumno', field: 'alumnoNombre', minWidth: 240, flex: 2 },
        {
            headerName: 'Fecha registro',
            field: 'fechaRegistro',
            minWidth: 180,
            flex: 1,
            valueFormatter: (params) => this.formatFecha(params.value),
        },
    ];

    protected readonly defaultColDef: ColDef<AlumnoRegistradoRow> = {
        sortable: true,
        resizable: true,
        filter: true,
    };

    private gridApi: GridApi<AlumnoRegistradoRow> | null = null;

    constructor() {
        this.cargarFilas();
    }

    protected onGridReady(event: GridReadyEvent<AlumnoRegistradoRow>): void {
        this.gridApi = event.api;
        this.autoSizeColumns();
    }

    protected cerrar(): void {
        this.dialogRef.close();
    }

    private cargarFilas(): void {
        const evaluaciones = this.data.evaluaciones ?? [];

        if (evaluaciones.length === 0) {
            this.rowsSubject.next([]);
            return;
        }

        const alumnosIds = Array.from(
            new Set(
                evaluaciones
                    .map((evaluacion) => evaluacion.alumnoId)
                    .filter((id): id is number => Number.isFinite(id))
            )
        );

        if (alumnosIds.length === 0) {
            this.rowsSubject.next([]);
            return;
        }

        this.isLoading$.next(true);

        const solicitudes = alumnosIds.map((id) =>
            this.alumnosService.get(id).pipe(catchError(() => of<Alumno | null>(null)))
        );

        forkJoin(solicitudes)
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (alumnos) => {
                    const mapa = new Map<number, Alumno | null>();
                    alumnos.forEach((alumno) => {
                        if (alumno) {
                            mapa.set(alumno.id, alumno);
                        }
                    });

                    const filas: AlumnoRegistradoRow[] = [];
                    const alumnosAgregados = new Set<number>();

                    evaluaciones.forEach((evaluacion) => {
                        if (alumnosAgregados.has(evaluacion.alumnoId)) {
                            return;
                        }

                        alumnosAgregados.add(evaluacion.alumnoId);
                        const alumno = mapa.get(evaluacion.alumnoId) ?? null;
                        filas.push({
                            evaluacionId: evaluacion.id,
                            alumnoId: evaluacion.alumnoId,
                            dni: alumno?.dni ?? 'Sin DNI',
                            alumnoNombre: this.construirNombreAlumno(alumno, evaluacion.alumnoId),
                            fechaRegistro: evaluacion.fechaRegistro ?? null,
                        });
                    });

                    this.rowsSubject.next(filas);
                    queueMicrotask(() => this.autoSizeColumns());
                },
                error: () => {
                    this.rowsSubject.next([]);
                },
            });
    }

    private autoSizeColumns(): void {
        if (!this.gridApi) {
            return;
        }

        const columns = this.gridApi.getColumns() ?? [];
        const columnIds = columns
            .map((column) => column.getColId())
            .filter((columnId): columnId is string => Boolean(columnId?.length));

        if (columnIds.length > 0) {
            this.gridApi.autoSizeColumns(columnIds, false);
        }
    }

    private construirNombreAlumno(alumno: Alumno | null, alumnoId: number): string {
        if (!alumno) {
            return `Alumno ${alumnoId}`;
        }

        const nombres = `${alumno.apellidos ?? ''} ${alumno.nombres ?? ''}`.trim();
        return nombres.length > 0 ? nombres : alumno.dni;
    }

    private formatFecha(value: unknown): string {
        if (typeof value !== 'string' || value.length === 0) {
            return '—';
        }

        const date = DateTime.fromISO(value);

        if (!date.isValid) {
            return value;
        }

        return date.toFormat('dd/MM/yyyy HH:mm');
    }
}
