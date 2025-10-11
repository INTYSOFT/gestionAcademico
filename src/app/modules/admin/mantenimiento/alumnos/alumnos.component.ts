import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
import { ColDef } from 'ag-grid-community';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { BehaviorSubject, Subject, finalize, takeUntil, tap } from 'rxjs';
import { AlumnoFormDialogComponent, AlumnoFormDialogResult } from './dialogs/alumno-form-dialog/alumno-form-dialog.component';
import { AlumnoApoderadosDialogComponent } from './dialogs/alumno-apoderados-dialog/alumno-apoderados-dialog.component';
import { AlumnosActionsCellComponent } from './components/alumnos-actions-cell/alumnos-actions-cell.component';

@Component({
    selector: 'app-alumnos',
    standalone: true,
    templateUrl: './alumnos.component.html',
    styleUrl: './alumnos.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        AlumnosActionsCellComponent,
        AlumnoFormDialogComponent,
        AlumnoApoderadosDialogComponent,
    ],
})
export class AlumnosComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', [Validators.maxLength(150)]);
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly filteredAlumnos$ = new BehaviorSubject<Alumno[]>([]);

    protected readonly columnDefs: ColDef<Alumno>[] = [
        {
            headerName: 'DNI',
            field: 'dni',
            minWidth: 120,
            flex: 1,
        },
        {
            headerName: 'Apellidos',
            valueGetter: (params) => `${params.data?.apellidoPaterno ?? ''} ${params.data?.apellidoMaterno ?? ''}`.trim(),
            minWidth: 180,
            flex: 1,
        },
        {
            headerName: 'Nombres',
            field: 'nombres',
            minWidth: 160,
            flex: 1,
        },
        {
            headerName: 'Correo electrónico',
            field: 'correoElectronico',
            minWidth: 220,
            flex: 1,
        },
        {
            headerName: 'Estado',
            field: 'activo',
            minWidth: 110,
            valueGetter: (params) => (params.data?.activo ? 'Activo' : 'Inactivo'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: AlumnosActionsCellComponent,
            cellRendererParams: {
                onViewApoderados: (alumno: Alumno) => this.openApoderadosDialog(alumno),
                onEdit: (alumno: Alumno) => this.openAlumnoDialog(alumno),
                onDelete: (alumno: Alumno) => this.deleteAlumno(alumno),
            },
            minWidth: 180,
            maxWidth: 220,
            resizable: false,
            sortable: false,
            filter: false,
            suppressSizeToFit: true,
        },
    ];

    protected readonly defaultColDef: ColDef = {
        sortable: true,
        resizable: true,
        suppressHeaderMenuButton: true,
    };

    private alumnos: Alumno[] = [];
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly dialog: MatDialog,
        private readonly alumnosService: AlumnosService
    ) {}

    ngOnInit(): void {
        this.loadAlumnos();

        this.searchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
            this.applyFilter(value ?? '');
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected openAlumnoDialog(alumno?: Alumno): void {
        const dialogRef = this.dialog.open(AlumnoFormDialogComponent, {
            width: '520px',
            data: {
                alumno,
            },
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: AlumnoFormDialogResult) => {
                if (!result) {
                    return;
                }

                if (result.action === 'created') {
                    this.upsertAlumno(result.alumno, true);
                    this.snackBar.open('Alumno registrado correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                } else if (result.action === 'updated') {
                    this.upsertAlumno(result.alumno);
                    this.snackBar.open('Alumno actualizado correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                }
            });
    }

    protected openApoderadosDialog(alumno: Alumno): void {
        this.dialog.open(AlumnoApoderadosDialogComponent, {
            width: '780px',
            data: {
                alumno,
            },
        });
    }

    protected deleteAlumno(alumno: Alumno): void {
        if (!alumno.id) {
            return;
        }

        const confirmed = window.confirm('¿Está seguro de eliminar al alumno seleccionado?');
        if (!confirmed) {
            return;
        }

        this.isLoading$.next(true);

        this.alumnosService
            .updateAlumno(alumno.id, { activo: false })
            .pipe(
                tap(() => {
                    this.snackBar.open('Alumno eliminado correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.alumnos = this.alumnos.map((item) =>
                        item.id === alumno.id
                            ? {
                                  ...item,
                                  activo: false,
                              }
                            : item
                    );
                    this.applyFilter(this.searchControl.value ?? '');
                }),
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al eliminar el alumno.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    protected createAlumno(): void {
        this.openAlumnoDialog();
    }

    private loadAlumnos(): void {
        this.isLoading$.next(true);

        this.alumnosService
            .getAlumnos()
            .pipe(
                tap((alumnos) => {
                    this.alumnos = alumnos;
                    this.applyFilter(this.searchControl.value ?? '');
                }),
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al cargar los alumnos.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        if (!normalized) {
            this.filteredAlumnos$.next([...this.alumnos]);
            return;
        }

        const filtered = this.alumnos.filter((alumno) => {
            const searchable = [
                alumno.dni,
                alumno.nombres,
                alumno.apellidoPaterno,
                alumno.apellidoMaterno,
                alumno.correoElectronico,
            ]
                .filter((value): value is string => !!value)
                .map((value) => value.toLowerCase())
                .join(' ');

            return searchable.includes(normalized);
        });

        this.filteredAlumnos$.next(filtered);
    }

    private upsertAlumno(alumno: Alumno, prepend = false): void {
        const data = [...this.alumnos];
        const index = data.findIndex((item) => item.id === alumno.id);

        if (index > -1) {
            data[index] = alumno;
        } else if (prepend) {
            data.unshift(alumno);
        } else {
            data.push(alumno);
        }

        this.alumnos = data;
        this.applyFilter(this.searchControl.value ?? '');
    }
}
