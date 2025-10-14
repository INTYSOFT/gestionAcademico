import { AsyncPipe, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';
import { CiclosActionsCellComponent } from './actions-cell/ciclos-actions-cell.component';
import {
    CicloFormDialogComponent,
    CicloFormDialogData,
    CicloFormDialogResult,
} from './ciclo-form-dialog/ciclo-form-dialog.component';

@Component({
    selector: 'app-ciclos',
    standalone: true,
    templateUrl: './ciclos.component.html',
    styleUrls: ['./ciclos.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatTooltipModule,
        AgGridAngular,
    ],
})
export class CiclosComponent implements OnInit, OnDestroy {
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);

    protected readonly searchControl = this.fb.control<string>('', {
        nonNullable: true,
    });

    protected readonly columnDefs: ColDef<Ciclo>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 200, flex: 1 },
        {
            headerName: 'Fecha de inicio',
            field: 'fechaInicio',
            minWidth: 160,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Fecha de fin',
            field: 'fechaFin',
            minWidth: 160,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Capacidad',
            field: 'capacidadTotal',
            minWidth: 140,
            valueFormatter: (params) =>
                params.value === null || params.value === undefined
                    ? ''
                    : String(params.value),
        },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: CiclosActionsCellComponent,
            cellRendererParams: {
                onEdit: (ciclo: Ciclo) => this.openCicloDialog(ciclo),
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

    private gridApi?: GridApi<Ciclo>;
    private readonly destroy$ = new Subject<void>();
    private allCiclos: Ciclo[] = [];

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly ciclosService: CiclosService
    ) {
        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((term) => this.applyFilter(term));
    }

    ngOnInit(): void {
        this.loadCiclos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Ciclo>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected createCiclo(): void {
        this.openCicloDialog();
    }

    private loadCiclos(): void {
        this.isLoadingCiclos$.next(true);

        this.ciclosService
            .listAll()
            .pipe(finalize(() => this.isLoadingCiclos$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: (ciclos) => {
                    this.allCiclos = ciclos;
                    this.applyFilter(this.searchControl.value);
                    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los ciclos.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private openCicloDialog(ciclo?: Ciclo): void {
        blurActiveElement();
        const data: CicloFormDialogData = {
            ciclo: ciclo ?? null,
            existingCiclos: [...this.allCiclos],
        };

        const dialogRef = this.dialog.open<
            CicloFormDialogComponent,
            CicloFormDialogData,
            CicloFormDialogResult
        >(CicloFormDialogComponent, {
            width: '520px',
            disableClose: true,
            data,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            this.loadCiclos();
        });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const filtered = !normalized
            ? [...this.allCiclos]
            : this.allCiclos.filter((ciclo) => this.matchesTerm(ciclo, normalized));

        this.ciclos$.next(filtered);
        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
    }

    private matchesTerm(ciclo: Ciclo, term: string): boolean {
        const nombre = ciclo.nombre.toLowerCase();
        const fechaInicio = this.formatDate(ciclo.fechaInicio).toLowerCase();
        const fechaFin = this.formatDate(ciclo.fechaFin).toLowerCase();

        return (
            nombre.includes(term) ||
            (ciclo.fechaInicio ?? '').toLowerCase().includes(term) ||
            (ciclo.fechaFin ?? '').toLowerCase().includes(term) ||
            fechaInicio.includes(term) ||
            fechaFin.includes(term)
        );
    }

    private formatDate(value: unknown): string {
        if (typeof value !== 'string') {
            return '';
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }

        const date = new Date(trimmed);
        if (Number.isNaN(date.getTime())) {
            return trimmed;
        }

        return new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    }
}
