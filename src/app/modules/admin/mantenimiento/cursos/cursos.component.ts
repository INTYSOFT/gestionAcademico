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
import { Curso } from 'app/core/models/centro-estudios/curso.model';
import { CursosService } from 'app/core/services/centro-estudios/cursos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { CursosActionsCellComponent } from './actions-cell/cursos-actions-cell.component';
import type {
    CursoFormDialogData,
    CursoFormDialogResult,
} from './curso-form-dialog/curso-form-dialog.component';

@Component({
    selector: 'app-cursos',
    standalone: true,
    templateUrl: './cursos.component.html',
    styleUrls: ['./cursos.component.scss'],
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
export class CursosComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly cursos$ = new BehaviorSubject<Curso[]>([]);
    protected readonly filteredCursos$ = new BehaviorSubject<Curso[]>([]);

    protected readonly columnDefs: ColDef<Curso>[] = [
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
            headerName: 'Acciones',
            cellRenderer: CursosActionsCellComponent,
            cellRendererParams: {
                onEdit: (curso: Curso) => this.openCursoDialog(curso),
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

    private gridApi?: GridApi<Curso>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly cursosService: CursosService
    ) {}

    ngOnInit(): void {
        this.loadCursos();

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

    protected onGridReady(event: GridReadyEvent<Curso>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createCurso(): void {
        void this.openCursoDialog();
    }

    private loadCursos(): void {
        this.isLoading$.next(true);

        this.cursosService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (cursos) => {
                    this.cursos$.next(cursos);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los cursos.',
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
        const cursos = this.cursos$.value;

        if (!normalized) {
            this.filteredCursos$.next([...cursos]);
            return;
        }

        const filtered = cursos.filter((curso) => {
            const values = [
                curso.nombre,
                curso.descripcion ?? '',
                curso.fechaRegistro ?? '',
                curso.fechaActualizacion ?? '',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredCursos$.next(filtered);
    }

    private openCursoDialog(curso?: Curso): void {
        blurActiveElement();

        import('./curso-form-dialog/curso-form-dialog.component').then(
            ({ CursoFormDialogComponent }) => {
                const data: CursoFormDialogData = {
                    curso: curso ?? null,
                };

                const dialogRef = this.dialog.open(CursoFormDialogComponent, {
                    width: '520px',
                    disableClose: true,
                    data,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: CursoFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        if (result.curso) {
                            this.upsertCurso(result.curso);
                        }
                    });
            }
        );
    }

    private upsertCurso(curso: Curso): void {
        const data = [...this.cursos$.value];
        const index = data.findIndex((item) => item.id === curso.id);

        if (index > -1) {
            data[index] = curso;
        } else {
            data.unshift(curso);
        }

        this.cursos$.next(data);
        this.applyFilter(this.searchControl.value);
        this.gridApi?.refreshCells({ force: true });
    }
}
