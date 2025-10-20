import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { BehaviorSubject, Subject, debounceTime, finalize, takeUntil } from 'rxjs';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { TipoEvaluacionActionsCellComponent } from './actions-cell/tipo-evaluacion-actions-cell.component';
import type {
    TipoEvaluacionFormDialogData,
    TipoEvaluacionFormDialogResult,
} from './tipo-evaluacion-form-dialog/tipo-evaluacion-form-dialog.component';

@Component({
    selector: 'app-tipo-evaluacion',
    standalone: true,
    templateUrl: './tipo-evaluacion.component.html',
    styleUrls: ['./tipo-evaluacion.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    AgGridAngular,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule
],
})
export class TipoEvaluacionComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly tiposEvaluacion$ = new BehaviorSubject<TipoEvaluacion[]>([]);
    protected readonly filteredTiposEvaluacion$ = new BehaviorSubject<TipoEvaluacion[]>([]);

    protected readonly columnDefs: ColDef<TipoEvaluacion>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
        { headerName: 'Descripción', field: 'descripcion', minWidth: 240, flex: 1 },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Fecha de registro',
            field: 'fechaRegistro',
            minWidth: 180,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Fecha de actualización',
            field: 'fechaActualizacion',
            minWidth: 200,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Acciones',
            cellRenderer: TipoEvaluacionActionsCellComponent,
            cellRendererParams: {
                onEdit: (tipoEvaluacion: TipoEvaluacion) =>
                    this.openTipoEvaluacionDialog(tipoEvaluacion),
            },
            width: 120,
            sortable: false,
            filter: false,
            resizable: false,
            pinned: 'right',
        },
    ];

    protected readonly defaultColDef: ColDef = {
        sortable: true,
        resizable: true,
        filter: true,
        flex: 1,
    };

    private gridApi?: GridApi<TipoEvaluacion>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService
    ) {}

    ngOnInit(): void {
        this.loadTiposEvaluacion();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                this.applyFilter(term);
                this.gridApi?.setGridOption('quickFilterText', term.trim().toLowerCase());
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<TipoEvaluacion>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createTipoEvaluacion(): void {
        void this.openTipoEvaluacionDialog();
    }

    private loadTiposEvaluacion(): void {
        this.isLoading$.next(true);

        this.tipoEvaluacionesService
            .listAll()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (tiposEvaluacion) => {
                    this.tiposEvaluacion$.next(tiposEvaluacion);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los tipos de evaluación.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const tiposEvaluacion = this.tiposEvaluacion$.value;

        if (!normalized) {
            this.filteredTiposEvaluacion$.next([...tiposEvaluacion]);
            return;
        }

        const filtered = tiposEvaluacion.filter((tipoEvaluacion) => {
            const values = [
                tipoEvaluacion.nombre,
                tipoEvaluacion.descripcion ?? '',
                tipoEvaluacion.fechaRegistro ?? '',
                tipoEvaluacion.fechaActualizacion ?? '',
                tipoEvaluacion.activo ? 'activo' : 'inactivo',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredTiposEvaluacion$.next(filtered);
    }

    private openTipoEvaluacionDialog(tipoEvaluacion?: TipoEvaluacion | null): void {
        blurActiveElement();

        void import('./tipo-evaluacion-form-dialog/tipo-evaluacion-form-dialog.component').then(
            ({ TipoEvaluacionFormDialogComponent }) => {
                const data: TipoEvaluacionFormDialogData = {
                    tipoEvaluacion: tipoEvaluacion ?? null,
                };

                const dialogRef = this.dialog.open(TipoEvaluacionFormDialogComponent, {
                    width: '480px',
                    data,
                    disableClose: true,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: TipoEvaluacionFormDialogResult | null) => {
                        if (!result?.tipoEvaluacion) {
                            return;
                        }

                        this.upsertTipoEvaluacion(result.tipoEvaluacion);
                    });
            }
        );
    }

    private upsertTipoEvaluacion(tipoEvaluacion: TipoEvaluacion): void {
        const data = [...this.tiposEvaluacion$.value];
        const index = data.findIndex((item) => item.id === tipoEvaluacion.id);

        if (index > -1) {
            data[index] = tipoEvaluacion;
        } else {
            data.unshift(tipoEvaluacion);
        }

        this.tiposEvaluacion$.next(data);
        this.applyFilter(this.searchControl.value);
        this.gridApi?.refreshCells({ force: true });
    }

    private formatDate(value: unknown): string {
        if (typeof value === 'string' && value.trim()) {
            return value;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        return '';
    }
}
