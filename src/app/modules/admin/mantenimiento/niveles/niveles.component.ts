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
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { NivelesService } from 'app/core/services/centro-estudios/niveles.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { NivelActionsCellComponent } from './actions-cell/nivel-actions-cell.component';
import type {
    NivelFormDialogData,
    NivelFormDialogResult,
} from './nivel-form-dialog/nivel-form-dialog.component';

@Component({
    selector: 'app-niveles',
    standalone: true,
    templateUrl: './niveles.component.html',
    styleUrls: ['./niveles.component.scss'],
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
export class NivelesComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly niveles$ = new BehaviorSubject<Nivel[]>([]);
    protected readonly filteredNiveles$ = new BehaviorSubject<Nivel[]>([]);

    protected readonly columnDefs: ColDef<Nivel>[] = [
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
            cellRenderer: NivelActionsCellComponent,
            cellRendererParams: {
                onEdit: (nivel: Nivel) => this.openNivelDialog(nivel),
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

    private gridApi?: GridApi<Nivel>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly nivelesService: NivelesService
    ) {}

    ngOnInit(): void {
        this.loadNiveles();

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

    protected onGridReady(event: GridReadyEvent<Nivel>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createNivel(): void {
        void this.openNivelDialog();
    }

    private loadNiveles(): void {
        this.isLoading$.next(true);

        this.nivelesService
            .listAll()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (niveles) => {
                    this.niveles$.next(niveles);
                    this.applyFilter(this.searchControl.value);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los niveles.',
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
        const niveles = this.niveles$.value;

        if (!normalized) {
            this.filteredNiveles$.next([...niveles]);
            return;
        }

        const filtered = niveles.filter((nivel) => {
            const values = [
                nivel.nombre,
                nivel.descripcion ?? '',
                nivel.fechaRegistro ?? '',
                nivel.fechaActualizacion ?? '',
                nivel.activo ? 'activo' : 'inactivo',
            ]
                .filter((value): value is string => value !== null && value !== undefined)
                .map((value) => value.toLowerCase());

            return values.some((value) => value.includes(normalized));
        });

        this.filteredNiveles$.next(filtered);
    }

    private openNivelDialog(nivel?: Nivel | null): void {
        blurActiveElement();

        void import('./nivel-form-dialog/nivel-form-dialog.component').then(
            ({ NivelFormDialogComponent }) => {
                const data: NivelFormDialogData = {
                    nivel: nivel ?? null,
                };

                const dialogRef = this.dialog.open(
                    NivelFormDialogComponent,
                    {
                        width: '480px',
                        data,
                        disableClose: true,
                    }
                );

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: NivelFormDialogResult | null) => {
                        if (!result?.nivel) {
                            return;
                        }

                        this.upsertNivel(result.nivel);
                    });
            }
        );
    }

    private upsertNivel(nivel: Nivel): void {
        const data = [...this.niveles$.value];
        const index = data.findIndex((item) => item.id === nivel.id);

        if (index > -1) {
            data[index] = nivel;
        } else {
            data.unshift(nivel);
        }

        this.niveles$.next(data);
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
