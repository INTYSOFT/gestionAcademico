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
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { BehaviorSubject, Subject, debounceTime, finalize, takeUntil } from 'rxjs';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { AlumnosActionsCellComponent } from './actions-cell/alumnos-actions-cell.component';
import type { AlumnoFormDialogResult } from './alumno-form-dialog/alumno-form-dialog.component';

@Component({
    selector: 'app-alumnos',
    standalone: true,
    templateUrl: './alumnos.component.html',
    styleUrls: ['./alumnos.component.scss'],
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
        MatSnackBarModule
        
    ],
})
export class AlumnosComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly alumnos$ = new BehaviorSubject<Alumno[]>([]);
    protected readonly filteredAlumnos$ = new BehaviorSubject<Alumno[]>([]);

    protected readonly columnDefs: ColDef<Alumno>[] = [
        { headerName: 'DNI', field: 'dni', minWidth: 120, flex: 1 },
        { headerName: 'Apellidos', field: 'apellidos', minWidth: 200, flex: 1 },
        { headerName: 'Nombres', field: 'nombres', minWidth: 180, flex: 1 },
        {
            headerName: 'Fecha nacimiento',
            field: 'fechaNacimiento',
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
        },
        { headerName: 'Celular', field: 'celular', minWidth: 140 },
        { headerName: 'Correo', field: 'correo', minWidth: 200, flex: 1 },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: AlumnosActionsCellComponent,
            cellRendererParams: {
                onViewApoderados: (alumno: Alumno) => this.openApoderadosDialog(alumno),
                onEdit: (alumno: Alumno) => this.openAlumnoDialog(alumno),
            },
            width: 150,
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

    private gridApi?: GridApi<Alumno>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly alumnosService: AlumnosService
    ) {}

    ngOnInit(): void {
        this.loadAlumnos();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                this.applyFilter(term);
                this.gridApi?.setGridOption('quickFilterText', term);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Alumno>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createAlumno(): void {
        void this.openAlumnoDialog();
    }

    private loadAlumnos(): void {
        this.isLoading$.next(true);

        this.alumnosService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (alumnos) => {
                    this.alumnos$.next(alumnos);
                    this.applyFilter(this.searchControl.value);
                },
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const alumnos = this.alumnos$.value;

        if (!normalized) {
            this.filteredAlumnos$.next([...alumnos]);
            return;
        }

        const filtered = alumnos.filter((alumno) => {
            const searchable = [
                alumno.dni,
                alumno.apellidos,
                alumno.nombres,
                alumno.correo,
            ]
                .filter((value): value is string => !!value)
                .map((value) => value.toLowerCase())
                .join(' ');

            return searchable.includes(normalized);
        });

        this.filteredAlumnos$.next(filtered);
    }

    private openAlumnoDialog(alumno?: Alumno): void {
        blurActiveElement();

        import('./alumno-form-dialog/alumno-form-dialog.component').then(
            ({ AlumnoFormDialogComponent }) => {
                const dialogRef = this.dialog.open(AlumnoFormDialogComponent, {
                    width: '520px',
                    disableClose: true,
                    data: { alumno },
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: AlumnoFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        const message =
                            result.action === 'created'
                                ? 'Alumno registrado correctamente.'
                                : 'Alumno actualizado correctamente.';

                        this.upsertAlumno(result.alumno);
                        this.snackBar.open(message, 'Cerrar', {
                            duration: 4000,
                        });
                    });
            }
        );
    }

    private openApoderadosDialog(alumno: Alumno): void {
        blurActiveElement();

        import('./apoderados/alumno-apoderados-dialog.component').then(
            ({ AlumnoApoderadosDialogComponent }) => {
                this.dialog.open(AlumnoApoderadosDialogComponent, {
                    width: '860px',
                    data: { alumno },
                });
            }
        );
    }

    private upsertAlumno(alumno: Alumno): void {
        const current = [...this.alumnos$.value];
        const index = current.findIndex((item) => item.id === alumno.id);

        if (index > -1) {
            current[index] = alumno;
        } else {
            current.unshift(alumno);
        }

        this.alumnos$.next(current);
        this.applyFilter(this.searchControl.value);
    }
}

// Pruebas manuales:
// 1. Crear un alumno nuevo y verificar que aparezca en el grid con los datos registrados.
// 2. Editar un alumno existente y validar que los cambios se reflejen al cerrar el diálogo.
// 3. Abrir la gestión de apoderados, vincular un apoderado y confirmar que la tabla se actualiza correctamente.
