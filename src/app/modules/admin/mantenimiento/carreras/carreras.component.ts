import { AsyncPipe, NgIf } from '@angular/common';
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
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { CarrerasActionsCellComponent } from './actions-cell/carreras-actions-cell.component';
import type {
    CarreraFormDialogData,
    CarreraFormDialogResult,
} from './carrera-form-dialog/carrera-form-dialog.component';

@Component({
    selector: 'app-carreras',
    standalone: true,
    templateUrl: './carreras.component.html',
    styleUrls: ['./carreras.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        AsyncPipe,
        NgIf,
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
export class CarrerasComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly carreras$ = new BehaviorSubject<Carrera[]>([]);
    protected readonly filteredCarreras$ = new BehaviorSubject<Carrera[]>([]);

    protected readonly columnDefs: ColDef<Carrera>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
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
            cellRenderer: CarrerasActionsCellComponent,
            cellRendererParams: {
                onEdit: (carrera: Carrera) => this.openCarreraDialog(carrera),
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

    private gridApi?: GridApi<Carrera>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly carrerasService: CarrerasService
    ) {}

    ngOnInit(): void {
        this.loadCarreras();

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

    protected onGridReady(event: GridReadyEvent<Carrera>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createCarrera(): void {
        void this.openCarreraDialog();
    }

    private loadCarreras(): void {
        this.isLoading$.next(true);

        this.carrerasService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (carreras) => {
                    this.carreras$.next(carreras);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las carreras.',
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
        const carreras = this.carreras$.value;

        if (!normalized) {
            this.filteredCarreras$.next([...carreras]);
            return;
        }

        const filtered = carreras.filter((carrera) => {
            const values = [
                carrera.nombre,
                carrera.fechaRegistro ?? '',
                carrera.fechaActualizacion ?? '',
                carrera.activo ? 'activo' : 'inactivo',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredCarreras$.next(filtered);
    }

    private openCarreraDialog(carrera?: Carrera): void {
        blurActiveElement();

        import('./carrera-form-dialog/carrera-form-dialog.component').then(
            ({ CarreraFormDialogComponent }) => {
                const data: CarreraFormDialogData = {
                    carrera: carrera ?? null,
                };

                const dialogRef = this.dialog.open(CarreraFormDialogComponent, {
                    width: '460px',
                    disableClose: true,
                    data,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: CarreraFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        if (result.carrera) {
                            this.upsertCarrera(result.carrera);
                        }
                    });
            }
        );
    }

    private upsertCarrera(carrera: Carrera): void {
        const data = [...this.carreras$.value];
        const index = data.findIndex((item) => item.id === carrera.id);

        if (index > -1) {
            data[index] = carrera;
        } else {
            data.unshift(carrera);
        }

        this.carreras$.next(data);
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
