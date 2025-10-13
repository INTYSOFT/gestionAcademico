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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
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
        NgFor,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressBarModule,
        MatSelectModule,
        MatSnackBarModule,
        MatTooltipModule,
        AgGridAngular,
    ],
})
export class CiclosComponent implements OnInit, OnDestroy {
    protected readonly sedes$ = new BehaviorSubject<Sede[]>([]);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly isLoadingSedes$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);

    protected readonly selectedSedeControl = this.fb.control<number | null>(null);

    protected readonly columnDefs: ColDef<Ciclo>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 200, flex: 1 },
        {
            headerName: 'Fecha de inicio',
            field: 'fechaInicio',
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Fecha de fin',
            field: 'fechaFin',
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
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

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly ciclosService: CiclosService,
        private readonly sedeService: SedeService
    ) {}

    ngOnInit(): void {
        this.loadSedes();

        this.selectedSedeControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((sedeId) => {
                if (sedeId === null || sedeId === undefined) {
                    this.ciclos$.next([]);
                    return;
                }

                this.loadCiclos(sedeId);
            });
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

    protected trackBySedeId(index: number, item: Sede): number {
        return item.id;
    }

    protected createCiclo(): void {
        const sedeId = this.selectedSedeControl.value;
        const sede = this.sedes$.value.find((item) => item.id === (sedeId ?? -1));

        if (!sede) {
            this.snackBar.open('Selecciona una sede para registrar un ciclo.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.openCicloDialog(undefined, sede);
    }

    private loadSedes(): void {
        this.isLoadingSedes$.next(true);

        this.sedeService
            .getSedes()
            .pipe(finalize(() => this.isLoadingSedes$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: (sedes) => {
                    this.sedes$.next(sedes);

                    const current = this.selectedSedeControl.value;
                    if (current && sedes.some((sede) => sede.id === current)) {
                        this.loadCiclos(current);
                        return;
                    }

                    const firstSede = sedes[0];
                    if (firstSede) {
                        this.selectedSedeControl.setValue(firstSede.id);
                    } else {
                        this.selectedSedeControl.setValue(null);
                        this.ciclos$.next([]);
                    }
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las sedes.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private loadCiclos(sedeId: number): void {
        this.isLoadingCiclos$.next(true);

        this.ciclosService
            .listBySede(sedeId)
            .pipe(finalize(() => this.isLoadingCiclos$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: (ciclos) => {
                    this.ciclos$.next(ciclos);
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

    private openCicloDialog(ciclo?: Ciclo, sedeOverride?: Sede): void {
        const sedeId = this.selectedSedeControl.value;
        const sede =
            sedeOverride ?? this.sedes$.value.find((item) => item.id === (sedeId ?? -1));

        if (!sede) {
            this.snackBar.open('Selecciona una sede válida.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        blurActiveElement();
        const data: CicloFormDialogData = {
            sede,
            ciclo: ciclo ?? null,
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

            if (result.ciclo.sedeId !== sede.id) {
                this.loadCiclos(sede.id);
                return;
            }

            if (result.action === 'created') {
                this.upsertCiclo(result.ciclo, true);
            } else {
                this.upsertCiclo(result.ciclo, false);
            }
        });
    }

    private upsertCiclo(ciclo: Ciclo, prepend = false): void {
        const sedeId = this.selectedSedeControl.value;
        if (sedeId === null || sedeId === undefined || ciclo.sedeId !== sedeId) {
            return;
        }

        const data = [...this.ciclos$.value];
        const index = data.findIndex((item) => item.id === ciclo.id);

        if (index > -1) {
            data[index] = ciclo;
        } else if (prepend) {
            data.unshift(ciclo);
        } else {
            data.push(ciclo);
        }

        this.ciclos$.next(data);
    }
}
