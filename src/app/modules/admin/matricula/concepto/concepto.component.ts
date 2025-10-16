import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { BehaviorSubject, Subject, debounceTime, finalize, takeUntil } from 'rxjs';
import { Concepto } from 'app/core/models/centro-estudios/concepto.model';
import { ConceptoTipo } from 'app/core/models/centro-estudios/concepto-tipo.model';
import { ConceptosService } from 'app/core/services/centro-estudios/conceptos.service';
import { ConceptoTiposService } from 'app/core/services/centro-estudios/concepto-tipos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { ConceptoActionsCellComponent } from './actions-cell/concepto-actions-cell.component';
import type {
    ConceptoFormDialogData,
    ConceptoFormDialogResult,
} from './concepto-form-dialog/concepto-form-dialog.component';

@Component({
    selector: 'app-concepto',
    standalone: true,
    templateUrl: './concepto.component.html',
    styleUrls: ['./concepto.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        AgGridAngular,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSelectModule,
        MatSnackBarModule,
        MatTooltipModule,
    ],
})
export class ConceptoComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly tipoConceptoControl = this.fb.control<number | null>(null);

    protected readonly isLoadingConceptos$ = new BehaviorSubject<boolean>(false);
    protected readonly conceptos$ = new BehaviorSubject<Concepto[]>([]);
    protected readonly filteredConceptos$ = new BehaviorSubject<Concepto[]>([]);
    protected readonly conceptoTipos$ = new BehaviorSubject<ConceptoTipo[]>([]);
    protected readonly trackByConceptoTipo = (_: number, item: ConceptoTipo): number => item.id;

    protected readonly columnDefs: ColDef<Concepto>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
        {
            headerName: 'Tipo de concepto',
            valueGetter: (params) => this.getConceptoTipoNombre(params.data?.conceptoTipoId ?? null),
            minWidth: 200,
            flex: 1,
        },
        {
            headerName: 'Precio',
            field: 'precio',
            minWidth: 140,
            valueFormatter: (params) => this.formatCurrency(params.value),
        },
        {
            headerName: 'Impuesto',
            field: 'impuesto',
            minWidth: 140,
            valueFormatter: (params) => this.formatPercentage(params.value),
        },
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
            cellRenderer: ConceptoActionsCellComponent,
            cellRendererParams: {
                onEdit: (concepto: Concepto) => this.openConceptoDialog(concepto),
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

    private gridApi?: GridApi<Concepto>;
    private readonly destroy$ = new Subject<void>();
    private readonly currencyFormatter = new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly conceptosService: ConceptosService,
        private readonly conceptoTiposService: ConceptoTiposService
    ) {}

    ngOnInit(): void {
        this.loadConceptoTipos();
        this.loadConceptos();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                const normalized = term.trim().toLowerCase();
                this.applyFilter();
                this.gridApi?.setGridOption('quickFilterText', normalized);
            });

        this.tipoConceptoControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.applyFilter());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Concepto>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createConcepto(): void {
        void this.openConceptoDialog();
    }

    private loadConceptos(): void {
        this.isLoadingConceptos$.next(true);

        this.conceptosService
            .listAll()
            .pipe(
                finalize(() => this.isLoadingConceptos$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (conceptos) => {
                    this.conceptos$.next(conceptos);
                    this.applyFilter();
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los conceptos.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private loadConceptoTipos(): void {
        this.conceptoTiposService
            .listAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (conceptoTipos) => {
                    const sorted = [...conceptoTipos].sort((a, b) =>
                        a.nombre.localeCompare(b.nombre)
                    );
                    this.conceptoTipos$.next(sorted);
                    this.applyFilter();
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

    private applyFilter(): void {
        const term = this.searchControl.value.trim().toLowerCase();
        const selectedTipoId = this.tipoConceptoControl.value;
        const conceptos = this.conceptos$.value;

        const filtered = conceptos.filter((concepto) => {
            const matchesTipo =
                selectedTipoId === null || concepto.conceptoTipoId === selectedTipoId;

            if (!matchesTipo) {
                return false;
            }

            if (!term) {
                return true;
            }

            const values = [
                concepto.nombre,
                concepto.precio.toString(),
                concepto.impuesto !== null ? concepto.impuesto.toString() : '',
                concepto.activo ? 'activo' : 'inactivo',
                concepto.fechaRegistro ?? '',
                concepto.fechaActualizacion ?? '',
                this.getConceptoTipoNombre(concepto.conceptoTipoId),
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(term));
        });

        this.filteredConceptos$.next(filtered);
    }

    private openConceptoDialog(concepto?: Concepto | null): void {
        blurActiveElement();

        void import('./concepto-form-dialog/concepto-form-dialog.component').then(
            ({ ConceptoFormDialogComponent }) => {
                const data: ConceptoFormDialogData = {
                    concepto: concepto ?? null,
                    conceptoTipos: this.conceptoTipos$.value,
                };

                const dialogRef = this.dialog.open(ConceptoFormDialogComponent, {
                    width: '520px',
                    data,
                    disableClose: true,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: ConceptoFormDialogResult | null) => {
                        if (!result?.concepto) {
                            return;
                        }

                        this.upsertConcepto(result.concepto);
                    });
            }
        );
    }

    private upsertConcepto(concepto: Concepto): void {
        const data = [...this.conceptos$.value];
        const index = data.findIndex((item) => item.id === concepto.id);

        if (index > -1) {
            data[index] = concepto;
        } else {
            data.unshift(concepto);
        }

        this.conceptos$.next(data);
        this.applyFilter();
        this.gridApi?.refreshCells({ force: true });
    }

    private getConceptoTipoNombre(conceptoTipoId: number | null | undefined): string {
        if (conceptoTipoId === null || conceptoTipoId === undefined) {
            return 'Sin asignar';
        }

        const conceptoTipo = this.conceptoTipos$.value.find((item) => item.id === conceptoTipoId);

        return conceptoTipo?.nombre ?? 'Sin asignar';
    }

    private formatCurrency(value: unknown): string {
        const numberValue = typeof value === 'number' ? value : Number(value ?? 0);

        if (!Number.isFinite(numberValue)) {
            return '';
        }

        return this.currencyFormatter.format(numberValue);
    }

    private formatPercentage(value: unknown): string {
        if (value === null || value === undefined || value === '') {
            return '—';
        }

        const numberValue = typeof value === 'number' ? value : Number(value);

        if (!Number.isFinite(numberValue)) {
            return '—';
        }

        return `${numberValue.toFixed(2)} %`;
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
