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
import { Docente } from 'app/core/models/centro-estudios/docente.model';
import { Especialidad } from 'app/core/models/centro-estudios/especialidad.model';
import { DocentesService } from 'app/core/services/centro-estudios/docentes.service';
import { EspecialidadesService } from 'app/core/services/centro-estudios/especialidades.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { DocentesActionsCellComponent } from './actions-cell/docentes-actions-cell.component';
import type {
    DocenteFormDialogData,
    DocenteFormDialogResult,
} from './docente-form-dialog/docente-form-dialog.component';

@Component({
    selector: 'app-docentes',
    standalone: true,
    templateUrl: './docentes.component.html',
    styleUrls: ['./docentes.component.scss'],
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
export class DocentesComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly docentes$ = new BehaviorSubject<Docente[]>([]);
    protected readonly filteredDocentes$ = new BehaviorSubject<Docente[]>([]);
    protected readonly especialidades$ = new BehaviorSubject<Especialidad[]>([]);

    protected readonly columnDefs: ColDef<Docente>[] = [
        { headerName: 'DNI', field: 'dni', minWidth: 130 },
        {
            headerName: 'Apellidos',
            field: 'apellidos',
            minWidth: 200,
            flex: 1,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Nombres',
            field: 'nombres',
            minWidth: 200,
            flex: 1,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Especialidad',
            field: 'especialidadId',
            minWidth: 220,
            flex: 1,
            valueFormatter: (params) =>
                this.getEspecialidadNombre(
                    params.data?.especialidadId ?? params.value ?? null
                ),
        },
        {
            headerName: 'Celular',
            field: 'celular',
            minWidth: 150,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Correo',
            field: 'correo',
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
            headerName: 'Acciones',
            cellRenderer: DocentesActionsCellComponent,
            cellRendererParams: {
                onEdit: (docente: Docente) => this.openDocenteDialog(docente),
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

    private gridApi?: GridApi<Docente>;
    private readonly destroy$ = new Subject<void>();
    private readonly especialidadMap = new Map<number, string>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly docentesService: DocentesService,
        private readonly especialidadesService: EspecialidadesService
    ) {}

    ngOnInit(): void {
        this.loadEspecialidades();
        this.loadDocentes();

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

    protected onGridReady(event: GridReadyEvent<Docente>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createDocente(): void {
        void this.openDocenteDialog();
    }

    private loadDocentes(): void {
        this.isLoading$.next(true);

        this.docentesService
            .list()
            .pipe(finalize(() => this.isLoading$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: (docentes) => {
                    this.docentes$.next(docentes);
                    this.applyFilter(this.searchControl.value);
                    this.gridApi?.refreshCells({ force: true });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los docentes.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private loadEspecialidades(): void {
        this.especialidadesService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (especialidades) => {
                    this.especialidades$.next(especialidades);
                    this.updateEspecialidadesMap(especialidades);
                    this.gridApi?.refreshCells({ force: true });
                },
                error: () => {
                    this.snackBar.open(
                        'No se pudieron cargar las especialidades.',
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
        const docentes = this.docentes$.value;

        if (!normalized) {
            this.filteredDocentes$.next([...docentes]);
            return;
        }

        const filtered = docentes.filter((docente) => {
            const values = [
                docente.dni ?? '',
                docente.apellidos ?? '',
                docente.nombres ?? '',
                docente.celular ?? '',
                docente.correo ?? '',
                this.getEspecialidadNombre(docente.especialidadId),
                docente.fechaRegistro ?? '',
                docente.fechaActualizacion ?? '',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredDocentes$.next(filtered);
    }

    private openDocenteDialog(docente?: Docente): void {
        blurActiveElement();

        void import('./docente-form-dialog/docente-form-dialog.component').then(
            ({ DocenteFormDialogComponent }) => {
                const data: DocenteFormDialogData = {
                    docente: docente ?? null,
                    especialidades: this.especialidades$.value,
                };

                const dialogRef = this.dialog.open(DocenteFormDialogComponent, {
                    width: '640px',
                    disableClose: true,
                    data,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: DocenteFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        if (result.docente) {
                            this.upsertDocente(result.docente);
                        }
                    });
            }
        );
    }

    private upsertDocente(docente: Docente): void {
        const data = [...this.docentes$.value];
        const index = data.findIndex((item) => item.id === docente.id);

        if (index > -1) {
            data[index] = docente;
        } else {
            data.unshift(docente);
        }

        this.docentes$.next(data);
        this.applyFilter(this.searchControl.value);
        this.gridApi?.refreshCells({ force: true });
    }

    private updateEspecialidadesMap(especialidades: Especialidad[]): void {
        this.especialidadMap.clear();
        especialidades.forEach((especialidad) => {
            this.especialidadMap.set(especialidad.id, especialidad.nombre);
        });
    }

    private getEspecialidadNombre(especialidadId: number | null | undefined): string {
        if (especialidadId === null || especialidadId === undefined) {
            return 'Sin especialidad';
        }

        return this.especialidadMap.get(especialidadId) ?? 'Sin especialidad';
    }
}
