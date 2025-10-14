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
import { BehaviorSubject, Subject, debounceTime, takeUntil } from 'rxjs';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import {
    CicloFormDialogComponent,
    CicloFormDialogResult,
} from './ciclo-form-dialog/ciclo-form-dialog.component';
import { CiclosActionsCellComponent } from './actions-cell/ciclos-actions-cell.component';

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
        NgFor,
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
export class CiclosComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });

    protected readonly yearFilterControl = this.fb.control<number | null>(null);

    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly filteredCiclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly yearOptions$ = new BehaviorSubject<number[]>([]);

    protected readonly columnDefs: ColDef<Ciclo>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 220, flex: 1 },
        {
            headerName: 'Fecha inicio',
            field: 'fechaInicio',
            minWidth: 150,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Fecha fin',
            field: 'fechaFin',
            minWidth: 150,
            valueFormatter: (params) => this.formatDate(params.value),
        },
        {
            headerName: 'Capacidad total',
            field: 'capacidadTotal',
            minWidth: 160,
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

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly ciclosService: CiclosService
    ) {}

    ngOnInit(): void {
        this.loadCiclos();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                const normalized = term.trim().toLowerCase();
                this.gridApi?.setGridOption('quickFilterText', normalized);
                this.applyFilters();
            });

        this.yearFilterControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.applyFilters());
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
        blurActiveElement();
        const dialogRef = this.dialog.open(CicloFormDialogComponent, {
            data: {},
            width: '520px',
            disableClose: true,
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
            if (!result) {
                return;
            }

            this.handleDialogResult(result);
        });
    }

    protected openCicloDialog(ciclo: Ciclo): void {
        blurActiveElement();
        const dialogRef = this.dialog.open(CicloFormDialogComponent, {
            data: { ciclo },
            width: '520px',
            disableClose: true,
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
            if (!result) {
                return;
            }

            this.handleDialogResult(result);
        });
    }

    protected trackByYear(_index: number, year: number): number {
        return year;
    }

    private handleDialogResult(result: CicloFormDialogResult): void {
        if (!result) {
            return;
        }

        const message =
            result.action === 'created'
                ? 'Ciclo registrado correctamente.'
                : 'Ciclo actualizado correctamente.';

        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        this.loadCiclos();
    }

    private loadCiclos(): void {
        this.isLoading$.next(true);
        this.ciclosService
            .listAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (ciclos) => {
                    this.ciclos$.next(ciclos);
                    this.updateYearOptions(ciclos);
                    this.applyFilters();
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Error al cargar los ciclos', error);
                    this.snackBar.open(
                        'Ocurrió un error al cargar los ciclos. Por favor, inténtalo nuevamente.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                    this.isLoading$.next(false);
                },
            });
    }

    private applyFilters(): void {
        const term = this.searchControl.value.trim().toLowerCase();
        const yearFilter = this.yearFilterControl.value;
        const ciclos = this.ciclos$.value;

        const filtered = ciclos.filter((ciclo) => {
            const matchesTerm = this.matchesSearchTerm(ciclo, term);
            const matchesYear = this.matchesYearFilter(ciclo, yearFilter);
            return matchesTerm && matchesYear;
        });

        this.filteredCiclos$.next(filtered);
    }

    private matchesSearchTerm(ciclo: Ciclo, term: string): boolean {
        if (!term) {
            return true;
        }

        const capacidad = ciclo.capacidadTotal?.toString() ?? '';
        return (
            ciclo.nombre.toLowerCase().includes(term) ||
            (ciclo.fechaInicio ?? '').toLowerCase().includes(term) ||
            (ciclo.fechaFin ?? '').toLowerCase().includes(term) ||
            capacidad.includes(term)
        );
    }

    private matchesYearFilter(ciclo: Ciclo, year: number | null): boolean {
        if (year === null) {
            return true;
        }

        const inicioYear = this.extractYear(ciclo.fechaInicio);
        const finYear = this.extractYear(ciclo.fechaFin);

        return inicioYear === year || finYear === year;
    }

    private updateYearOptions(ciclos: Ciclo[]): void {
        const years = new Set<number>();

        ciclos.forEach((ciclo) => {
            const inicioYear = this.extractYear(ciclo.fechaInicio);
            const finYear = this.extractYear(ciclo.fechaFin);

            if (inicioYear !== null) {
                years.add(inicioYear);
            }

            if (finYear !== null) {
                years.add(finYear);
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a);
        this.yearOptions$.next(sortedYears);

        const currentValue = this.yearFilterControl.value;
        if (currentValue !== null && !sortedYears.includes(currentValue)) {
            this.yearFilterControl.setValue(null, { emitEvent: false });
            this.applyFilters();
        }
    }

    private extractYear(date: string | null | undefined): number | null {
        if (!date) {
            return null;
        }

        const trimmed = date.trim();
        if (!trimmed) {
            return null;
        }

        const yearPart = trimmed.slice(0, 4);
        const year = Number(yearPart);
        return Number.isNaN(year) ? null : year;
    }

    private formatDate(value: unknown): string {
        if (typeof value === 'string' && value.trim()) {
            return value;
        }

        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }

        return '';
    }
}
