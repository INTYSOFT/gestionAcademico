import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
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
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatSelectModule,
        MatTooltipModule,
        AgGridAngular,
    ],
})
export class CiclosComponent implements OnInit, OnDestroy {
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly years$ = new BehaviorSubject<string[]>([]);

    protected readonly searchControl = this.fb.control<string>('', {
        nonNullable: true,
    });

    protected readonly yearControl = this.fb.control<string>('', {
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
            .subscribe(() => this.applyFilters());

        this.yearControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.applyFilters());

    }

    ngOnInit(): void {
        this.loadCiclos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
        this.ciclos$.complete();
        this.isLoadingCiclos$.complete();
        this.years$.complete();
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
                    this.updateYearOptions(ciclos);
                    this.applyFilters();

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

    private updateYearOptions(ciclos: Ciclo[]): void {
        const years = new Set<string>();

        ciclos.forEach((ciclo) => {
            const startYear = this.extractYear(ciclo.fechaInicio);
            const endYear = this.extractYear(ciclo.fechaFin);

            if (startYear) {
                years.add(startYear);
            }

            if (endYear) {
                years.add(endYear);
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => Number(a) - Number(b));
        const normalizedCurrent = this.normalizeYear(this.yearControl.value);

        if (normalizedCurrent && !sortedYears.includes(normalizedCurrent)) {
            this.yearControl.setValue('', { emitEvent: false });
        }

        this.years$.next(sortedYears);
    }

    private applyFilters(): void {
        const normalizedTerm = this.normalizeTerm(this.searchControl.value);
        const normalizedYear = this.normalizeYear(this.yearControl.value);

        const filtered = this.allCiclos.filter((ciclo) => {
            const matchesTerm = !normalizedTerm || this.matchesTerm(ciclo, normalizedTerm);
            const matchesYear = !normalizedYear || this.matchesYear(ciclo, normalizedYear);

            return matchesTerm && matchesYear;

        });

        this.ciclos$.next(filtered);
        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
    }

    private matchesTerm(ciclo: Ciclo, term: string): boolean {
        const normalizedTerm = term.trim().toLowerCase();
        if (!normalizedTerm) {
            return true;
        }

        const nombre = ciclo.nombre.toLowerCase();
        const fechaInicioRaw = (ciclo.fechaInicio ?? '').toLowerCase();
        const fechaFinRaw = (ciclo.fechaFin ?? '').toLowerCase();
        const fechaInicioFormatted = this.formatDate(ciclo.fechaInicio).toLowerCase();
        const fechaFinFormatted = this.formatDate(ciclo.fechaFin).toLowerCase();

        return (
            nombre.includes(normalizedTerm) ||
            fechaInicioRaw.includes(normalizedTerm) ||
            fechaFinRaw.includes(normalizedTerm) ||
            fechaInicioFormatted.includes(normalizedTerm) ||
            fechaFinFormatted.includes(normalizedTerm)
        );
    }

    private matchesYear(ciclo: Ciclo, year: string): boolean {
        const startYear = this.extractYear(ciclo.fechaInicio);
        const endYear = this.extractYear(ciclo.fechaFin);

        return startYear === year || endYear === year;
    }

    private normalizeTerm(value: string): string {
        return value.trim().toLowerCase();
    }

    private normalizeYear(value: string): string | null {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        if (!/^\d{4}$/.test(trimmed)) {
            return null;
        }

        return trimmed;
    }

    private extractYear(value: string | null | undefined): string | null {
        if (!value) {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return String(parsed.getFullYear());
        }

        // Support common non-ISO formats such as dd/MM/yyyy or MM-dd-yyyy by
        // looking for a four digit sequence anywhere in the string.
        const match = /(\d{4})/.exec(trimmed);
        return match ? match[1] : null;
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
