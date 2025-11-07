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
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { BehaviorSubject, Subject, debounceTime, finalize, forkJoin, takeUntil } from 'rxjs';
import { EvaluacionDetalleDefatult } from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionDetalleDefatultsService } from 'app/core/services/centro-estudios/evaluacion-detalle-defatults.service';
import { EvaluacionTipoPreguntasService } from 'app/core/services/centro-estudios/evaluacion-tipo-preguntas.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { EvaluacionDetalleDefatultActionsCellComponent } from './actions-cell/evaluacion-detalle-defatult-actions-cell.component';
import type {
    EvaluacionDetalleDefatultFormDialogData,
    EvaluacionDetalleDefatultFormDialogResult,
} from './evaluacion-detalle-defatult-form-dialog/evaluacion-detalle-defatult-form-dialog.component';

interface EvaluacionDetalleDefatultView extends EvaluacionDetalleDefatult {
    evaluacionTipoPreguntaNombre: string;
}

@Component({
    selector: 'app-datos-por-defecto-puntuacion',
    standalone: true,
    templateUrl: './datos-por-defecto-puntuacion.component.html',
    styleUrls: ['./datos-por-defecto-puntuacion.component.scss'],
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
    ],
})
export class DatosPorDefectoPuntuacionComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly detalles$ = new BehaviorSubject<EvaluacionDetalleDefatultView[]>([]);
    protected readonly filteredDetalles$ = new BehaviorSubject<EvaluacionDetalleDefatultView[]>([]);
    protected readonly evaluacionTipoPreguntas$ = new BehaviorSubject<EvaluacionTipoPregunta[]>([]);

    protected readonly columnDefs: ColDef<EvaluacionDetalleDefatultView>[] = [
        { headerName: 'Tipo de pregunta', field: 'evaluacionTipoPreguntaNombre', minWidth: 200 },
        { headerName: 'Rango inicio', field: 'rangoInicio', minWidth: 140 },
        { headerName: 'Rango fin', field: 'rangoFin', minWidth: 140 },
        {
            headerName: 'Valor buena',
            field: 'valorBuena',
            minWidth: 140,
            valueFormatter: ({ value }) => Number(value ?? 0).toFixed(2),
        },
        {
            headerName: 'Valor mala',
            field: 'valorMala',
            minWidth: 140,
            valueFormatter: ({ value }) => Number(value ?? 0).toFixed(2),
        },
        {
            headerName: 'Valor blanca',
            field: 'valorBlanca',
            minWidth: 140,
            valueFormatter: ({ value }) => Number(value ?? 0).toFixed(2),
        },
        {
            headerName: 'Observación',
            field: 'observacion',
            flex: 1,
            minWidth: 220,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: EvaluacionDetalleDefatultActionsCellComponent,
            cellRendererParams: {
                onEdit: (detalle: EvaluacionDetalleDefatult) => this.openFormDialog(detalle),
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

    private gridApi?: GridApi<EvaluacionDetalleDefatultView>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionDetalleDefatultsService: EvaluacionDetalleDefatultsService,
        private readonly evaluacionTipoPreguntasService: EvaluacionTipoPreguntasService
    ) {}

    ngOnInit(): void {
        this.loadData();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                this.applyFilter(term);
                const normalized = term.trim().toLowerCase();
                this.gridApi?.setGridOption('quickFilterText', normalized);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<EvaluacionDetalleDefatultView>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected create(): void {
        void this.openFormDialog();
    }

    private loadData(): void {
        this.isLoading$.next(true);

        forkJoin({
            detalles: this.evaluacionDetalleDefatultsService.list(),
            tipos: this.evaluacionTipoPreguntasService.listAll(),
        })
            .pipe(finalize(() => this.isLoading$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: ({ detalles, tipos }) => {
                    this.evaluacionTipoPreguntas$.next(tipos);
                    const view = this.toView(detalles, tipos);
                    this.detalles$.next(view);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ??
                            'Ocurrió un error al cargar los valores por defecto de puntuación.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                },
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const detalles = this.detalles$.value;

        if (!normalized) {
            this.filteredDetalles$.next([...detalles]);
            return;
        }

        const filtered = detalles.filter((detalle) => {
            const values = [
                detalle.evaluacionTipoPreguntaNombre,
                detalle.observacion ?? '',
                detalle.rangoInicio.toString(),
                detalle.rangoFin.toString(),
                detalle.valorBuena.toString(),
                detalle.valorMala.toString(),
                detalle.valorBlanca.toString(),
            ];

            return values.some((value) => value.toLowerCase().includes(normalized));
        });

        this.filteredDetalles$.next(filtered);
    }

    private openFormDialog(detalle?: EvaluacionDetalleDefatult): void {
        blurActiveElement();

        import('./evaluacion-detalle-defatult-form-dialog/evaluacion-detalle-defatult-form-dialog.component').then(
            ({ EvaluacionDetalleDefatultFormDialogComponent }) => {
                const data: EvaluacionDetalleDefatultFormDialogData = {
                    mode: detalle ? 'edit' : 'create',
                    detalle: detalle ?? null,
                    evaluacionTipoPreguntas: this.evaluacionTipoPreguntas$.value,
                    detalles: this.detalles$.value,
                };

                const dialogRef = this.dialog.open(
                    EvaluacionDetalleDefatultFormDialogComponent,
                    {
                        width: '560px',
                        disableClose: true,
                        data,
                    }
                );

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result: EvaluacionDetalleDefatultFormDialogResult | undefined) => {
                        if (!result) {
                            return;
                        }

                        if (result.action === 'created') {
                            this.handleCreated(result.detalle);
                        } else if (result.action === 'updated') {
                            this.handleUpdated(result.detalle);
                        }
                    });
            }
        );
    }

    private handleCreated(detalle: EvaluacionDetalleDefatult): void {
        const tipos = this.evaluacionTipoPreguntas$.value;
        const viewDetalle = this.toView([detalle], tipos)[0];
        const updated = [viewDetalle, ...this.detalles$.value];
        this.detalles$.next(updated);
        this.applyFilter(this.searchControl.value);
    }

    private handleUpdated(detalle: EvaluacionDetalleDefatult): void {
        const tipos = this.evaluacionTipoPreguntas$.value;
        const viewDetalle = this.toView([detalle], tipos)[0];
        const updated = this.detalles$.value.map((item) =>
            item.id === viewDetalle.id ? viewDetalle : item
        );
        this.detalles$.next(updated);
        this.applyFilter(this.searchControl.value);
    }

    private toView(
        detalles: EvaluacionDetalleDefatult[],
        tipos: EvaluacionTipoPregunta[]
    ): EvaluacionDetalleDefatultView[] {
        const tipoMap = new Map<number, string>(
            tipos.map((tipo) => [tipo.id, tipo.nombre])
        );

        return detalles.map((detalle) => ({
            ...detalle,
            evaluacionTipoPreguntaNombre:
                tipoMap.get(detalle.evaluacionTipoPreguntaId) ?? 'Sin asignar',
        }));
    }
}
