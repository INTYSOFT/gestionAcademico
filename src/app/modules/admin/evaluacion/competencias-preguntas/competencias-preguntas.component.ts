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
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionTipoPreguntasService } from 'app/core/services/centro-estudios/evaluacion-tipo-preguntas.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { CompetenciasPreguntasActionsCellComponent } from './actions-cell/competencias-preguntas-actions-cell.component';
import type {
    CompetenciasPreguntasFormDialogData,
    CompetenciasPreguntasFormDialogResult,
} from './competencias-preguntas-form-dialog/competencias-preguntas-form-dialog.component';

@Component({
    selector: 'app-competencias-preguntas',
    standalone: true,
    templateUrl: './competencias-preguntas.component.html',
    styleUrls: ['./competencias-preguntas.component.scss'],
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
        MatTooltipModule,
    ],
})
export class CompetenciasPreguntasComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly evaluacionTipoPreguntas$ = new BehaviorSubject<EvaluacionTipoPregunta[]>([]);
    protected readonly filteredEvaluacionTipoPreguntas$ = new BehaviorSubject<EvaluacionTipoPregunta[]>([]);

    protected readonly columnDefs: ColDef<EvaluacionTipoPregunta>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
        { headerName: 'Código', field: 'codigo', minWidth: 140 },
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
            cellRenderer: CompetenciasPreguntasActionsCellComponent,
            cellRendererParams: {
                onEdit: (item: EvaluacionTipoPregunta) => this.openEvaluacionTipoPreguntaDialog(item),
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

    private gridApi?: GridApi<EvaluacionTipoPregunta>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionTipoPreguntasService: EvaluacionTipoPreguntasService
    ) {}

    ngOnInit(): void {
        this.loadEvaluacionTipoPreguntas();

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

    protected onGridReady(event: GridReadyEvent<EvaluacionTipoPregunta>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createEvaluacionTipoPregunta(): void {
        void this.openEvaluacionTipoPreguntaDialog();
    }

    private loadEvaluacionTipoPreguntas(): void {
        this.isLoading$.next(true);

        this.evaluacionTipoPreguntasService
            .listAll()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (items) => {
                    this.evaluacionTipoPreguntas$.next(items);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las competencias de preguntas.',
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
        const items = this.evaluacionTipoPreguntas$.value;

        if (!normalized) {
            this.filteredEvaluacionTipoPreguntas$.next([...items]);
            return;
        }

        const filtered = items.filter((item) => {
            const values = [
                item.nombre,
                item.codigo,
                item.descripcion ?? '',
                item.fechaRegistro ?? '',
                item.fechaActualizacion ?? '',
                item.activo ? 'activo' : 'inactivo',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredEvaluacionTipoPreguntas$.next(filtered);
    }

    private openEvaluacionTipoPreguntaDialog(item?: EvaluacionTipoPregunta | null): void {
        blurActiveElement();

        void import('./competencias-preguntas-form-dialog/competencias-preguntas-form-dialog.component').then(
            ({ CompetenciasPreguntasFormDialogComponent }) => {
                const data: CompetenciasPreguntasFormDialogData = {
                    evaluacionTipoPregunta: item ?? null,
                };

                const dialogRef = this.dialog.open(CompetenciasPreguntasFormDialogComponent, {
                    width: '520px',
                    data,
                    disableClose: true,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: CompetenciasPreguntasFormDialogResult | null) => {
                        if (!result?.evaluacionTipoPregunta) {
                            return;
                        }

                        this.upsertEvaluacionTipoPregunta(result.evaluacionTipoPregunta);
                    });
            }
        );
    }

    private upsertEvaluacionTipoPregunta(evaluacionTipoPregunta: EvaluacionTipoPregunta): void {
        const data = [...this.evaluacionTipoPreguntas$.value];
        const index = data.findIndex((item) => item.id === evaluacionTipoPregunta.id);

        if (index > -1) {
            data[index] = evaluacionTipoPregunta;
        } else {
            data.unshift(evaluacionTipoPregunta);
        }

        this.evaluacionTipoPreguntas$.next(data);
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
