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
import { ConceptoTipo } from 'app/core/models/centro-estudios/concepto-tipo.model';
import { ConceptoTiposService } from 'app/core/services/centro-estudios/concepto-tipos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { TipoConceptoActionsCellComponent } from './actions-cell/tipo-concepto-actions-cell.component';
import type {
    TipoConceptoFormDialogData,
    TipoConceptoFormDialogResult,
} from './tipo-concepto-form-dialog/tipo-concepto-form-dialog.component';

@Component({
    selector: 'app-tipo-concepto',
    standalone: true,
    templateUrl: './tipo-concepto.component.html',
    styleUrls: ['./tipo-concepto.component.scss'],
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
export class TipoConceptoComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly conceptoTipos$ = new BehaviorSubject<ConceptoTipo[]>([]);
    protected readonly filteredConceptoTipos$ = new BehaviorSubject<ConceptoTipo[]>([]);

    protected readonly columnDefs: ColDef<ConceptoTipo>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
        { headerName: 'Descripción', field: 'descripcion', minWidth: 240, flex: 1 },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Fecha registro',
            field: 'fechaRegistro',
            minWidth: 180,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Fecha actualización',
            field: 'fechaActualizacion',
            minWidth: 200,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Acciones',
            cellRenderer: TipoConceptoActionsCellComponent,
            cellRendererParams: {
                onEdit: (conceptoTipo: ConceptoTipo) => this.openTipoConceptoDialog(conceptoTipo),
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

    private gridApi?: GridApi<ConceptoTipo>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly conceptoTiposService: ConceptoTiposService
    ) {}

    ngOnInit(): void {
        this.loadConceptoTipos();

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

    protected onGridReady(event: GridReadyEvent<ConceptoTipo>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createConceptoTipo(): void {
        void this.openTipoConceptoDialog();
    }

    private loadConceptoTipos(): void {
        this.isLoading$.next(true);

        this.conceptoTiposService
            .listAll()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (conceptoTipos) => {
                    this.conceptoTipos$.next(conceptoTipos);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los tipos de concepto.',
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
        const conceptoTipos = this.conceptoTipos$.value;

        if (!normalized) {
            this.filteredConceptoTipos$.next([...conceptoTipos]);
            return;
        }

        const filtered = conceptoTipos.filter((conceptoTipo) => {
            const values = [
                conceptoTipo.nombre,
                conceptoTipo.descripcion ?? '',
                conceptoTipo.fechaRegistro ?? '',
                conceptoTipo.fechaActualizacion ?? '',
                conceptoTipo.activo ? 'activo' : 'inactivo',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredConceptoTipos$.next(filtered);
    }

    private openTipoConceptoDialog(conceptoTipo?: ConceptoTipo | null): void {
        blurActiveElement();

        void import('./tipo-concepto-form-dialog/tipo-concepto-form-dialog.component').then(
            ({ TipoConceptoFormDialogComponent }) => {
                const data: TipoConceptoFormDialogData = {
                    conceptoTipo: conceptoTipo ?? null,
                };

                const dialogRef = this.dialog.open(
                    TipoConceptoFormDialogComponent,
                    {
                        width: '480px',
                        data,
                        disableClose: true,
                    }
                );

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: TipoConceptoFormDialogResult | null) => {
                        if (!result?.conceptoTipo) {
                            return;
                        }

                        this.upsertConceptoTipo(result.conceptoTipo);
                    });
            }
        );
    }

    private upsertConceptoTipo(conceptoTipo: ConceptoTipo): void {
        const data = [...this.conceptoTipos$.value];
        const index = data.findIndex((item) => item.id === conceptoTipo.id);

        if (index > -1) {
            data[index] = conceptoTipo;
        } else {
            data.unshift(conceptoTipo);
        }

        this.conceptoTipos$.next(data);
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
