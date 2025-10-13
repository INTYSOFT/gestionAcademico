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
import { Especialidad } from 'app/core/models/centro-estudios/especialidad.model';
import { EspecialidadesService } from 'app/core/services/centro-estudios/especialidades.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { EspecialidadesActionsCellComponent } from './actions-cell/especialidades-actions-cell.component';
import type {
    EspecialidadFormDialogData,
    EspecialidadFormDialogResult,
} from './especialidad-form-dialog/especialidad-form-dialog.component';

@Component({
    selector: 'app-especialidades',
    standalone: true,
    templateUrl: './especialidades.component.html',
    styleUrls: ['./especialidades.component.scss'],
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
export class EspecialidadesComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly especialidades$ = new BehaviorSubject<Especialidad[]>([]);
    protected readonly filteredEspecialidades$ = new BehaviorSubject<Especialidad[]>([]);

    protected readonly columnDefs: ColDef<Especialidad>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 200, flex: 1 },
        {
            headerName: 'Descripción',
            field: 'descripcion',
            minWidth: 220,
            flex: 1,
            valueFormatter: (params) => params.value ?? '',
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
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Fecha actualización',
            field: 'fechaActualizacion',
            minWidth: 180,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Acciones',
            cellRenderer: EspecialidadesActionsCellComponent,
            cellRendererParams: {
                onEdit: (especialidad: Especialidad) => this.openEspecialidadDialog(especialidad),
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

    private gridApi?: GridApi<Especialidad>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly especialidadesService: EspecialidadesService
    ) {}

    ngOnInit(): void {
        this.loadEspecialidades();

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

    protected onGridReady(event: GridReadyEvent<Especialidad>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createEspecialidad(): void {
        void this.openEspecialidadDialog();
    }

    private loadEspecialidades(): void {
        this.isLoading$.next(true);

        this.especialidadesService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (especialidades) => {
                    this.especialidades$.next(especialidades);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ??
                            'Ocurrió un error al cargar las especialidades.',
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
        const especialidades = this.especialidades$.value;

        if (!normalized) {
            this.filteredEspecialidades$.next([...especialidades]);
            return;
        }

        const filtered = especialidades.filter((especialidad) => {
            const values = [
                especialidad.nombre,
                especialidad.descripcion ?? '',
                especialidad.fechaRegistro ?? '',
                especialidad.fechaActualizacion ?? '',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredEspecialidades$.next(filtered);
    }

    private openEspecialidadDialog(especialidad?: Especialidad): void {
        blurActiveElement();

        import('./especialidad-form-dialog/especialidad-form-dialog.component').then(
            ({ EspecialidadFormDialogComponent }) => {
                const data: EspecialidadFormDialogData = {
                    especialidad: especialidad ?? null,
                };

                const dialogRef = this.dialog.open(EspecialidadFormDialogComponent, {
                    width: '520px',
                    disableClose: true,
                    data,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: EspecialidadFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        if (result.especialidad) {
                            this.upsertEspecialidad(result.especialidad);
                        }
                    });
            }
        );
    }

    private upsertEspecialidad(especialidad: Especialidad): void {
        const data = [...this.especialidades$.value];
        const index = data.findIndex((item) => item.id === especialidad.id);

        if (index > -1) {
            data[index] = especialidad;
        } else {
            data.unshift(especialidad);
        }

        this.especialidades$.next(data);
        this.applyFilter(this.searchControl.value);
        this.gridApi?.refreshCells({ force: true });
    }
}
