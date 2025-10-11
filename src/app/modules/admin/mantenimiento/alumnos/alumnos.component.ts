import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, iconSetQuartzLight, themeQuartz } from 'ag-grid-community';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnoService } from 'app/core/services/centro-estudios/alumno.service';
import { AlumnoFormDialogComponent } from './components/alumno-form-dialog/alumno-form-dialog.component';
import { AlumnoApoderadosDialogComponent } from './components/alumno-apoderados-dialog/alumno-apoderados-dialog.component';
import { AlumnoActionsCellComponent } from './components/alumno-actions-cell/alumno-actions-cell.component';

@Component({
    selector: 'app-alumnos',
    standalone: true,
    imports: [
        AsyncPipe,
        NgIf,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatSnackBarModule,
        MatProgressBarModule,
        MatTooltipModule,
        AgGridAngular,
        AlumnoActionsCellComponent,
    ],
    templateUrl: './alumnos.component.html',
    styleUrl: './alumnos.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlumnosComponent implements OnInit, OnDestroy {
    readonly searchControl = new FormControl('', { nonNullable: true });
    readonly isLoading$ = new BehaviorSubject<boolean>(false);

    columnDefs: ColDef<Alumno>[] = [];
    readonly defaultColDef: ColDef<Alumno> = {
        resizable: true,
        sortable: true,
        flex: 1,
        minWidth: 150,
        filter: true,        
    };
    readonly theme = themeQuartz
        .withPart(iconSetQuartzLight)
        .withParams({
            backgroundColor: '#ffffff',
            browserColorScheme: 'light',
            columnBorder: false,
            fontFamily: 'Arial',
            foregroundColor: 'rgb(46, 55, 66)',
            headerBackgroundColor: '#053A6E',
            headerFontSize: 14,
            headerFontWeight: 600,
            headerTextColor: '#FFFFFF',
            oddRowBackgroundColor: '#F9FAFB',
            rowBorder: false,
            sidePanelBorder: false,
            spacing: 8,
            wrapperBorder: false,
            wrapperBorderRadius: 0,
        });

    rowData: Alumno[] = [];
    private gridApi?: GridApi<Alumno>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly alumnoService: AlumnoService,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly cdr: ChangeDetectorRef
    ) {
        this.columnDefs = this.createColumnDefs();
    }

    ngOnInit(): void {
        this.loadAlumnos();

        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                if (this.gridApi) {
                    this.gridApi.setGridOption('quickFilterText', value ?? '');
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onGridReady(event: GridReadyEvent<Alumno>): void {
        this.gridApi = event.api;
        this.gridApi.setGridOption('quickFilterText', this.searchControl.value ?? '');
    }

    openCreateAlumnoDialog(): void {
        const dialogRef = this.dialog.open(AlumnoFormDialogComponent, {
            width: '960px',
        });

        dialogRef.afterClosed().subscribe((shouldReload?: boolean) => {
            if (shouldReload) {
                this.loadAlumnos();
            }
        });
    }

    openEditAlumnoDialog(alumno: Alumno): void {
        const dialogRef = this.dialog.open(AlumnoFormDialogComponent, {
            width: '960px',
            data: { alumno },
        });

        dialogRef.afterClosed().subscribe((shouldReload?: boolean) => {
            if (shouldReload) {
                this.loadAlumnos();
            }
        });
    }

    openApoderadosDialog(alumno: Alumno): void {
        this.dialog.open(AlumnoApoderadosDialogComponent, {
            width: '720px',
            data: { alumno },
        });
    }

    private loadAlumnos(): void {
        this.isLoading$.next(true);
        this.alumnoService
            .getAlumnos()
            .pipe(
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                next: (alumnos) => {
                    this.rowData = alumnos ?? [];
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al cargar los alumnos.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    private createColumnDefs(): ColDef<Alumno>[] {
        return [
            { headerName: 'DNI', field: 'dni' },
            { headerName: 'Apellidos', field: 'apellidos' },
            { headerName: 'Nombres', field: 'nombres' },
            {
                headerName: 'Celular',
                field: 'celular',
                minWidth: 140,
            },
            {
                headerName: 'Correo',
                field: 'correo',
                minWidth: 200,
            },
            {
                headerName: 'Activo',
                field: 'activo',
                minWidth: 120,
                valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
            },
            {
                headerName: 'Acciones',
                cellRenderer: AlumnoActionsCellComponent,
                pinned: 'right',
                minWidth: 140,
                maxWidth: 160,
                cellRendererParams: {
                    onEdit: (alumno: Alumno) => this.openEditAlumnoDialog(alumno),
                    onViewApoderados: (alumno: Alumno) => this.openApoderadosDialog(alumno),
                },
            },
        ];
    }
}
