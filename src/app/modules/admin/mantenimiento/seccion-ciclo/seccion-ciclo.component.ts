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
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GridApi,
    GridReadyEvent,
    ICellRendererParams,
} from 'ag-grid-community';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { NivelesService } from 'app/core/services/centro-estudios/niveles.service';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';
import {
    AddSeccionDialogComponent,
    AddSeccionDialogData,
    AddSeccionDialogResult,
} from './add-seccion-dialog/add-seccion-dialog.component';
import {
    EditSeccionDialogComponent,
    EditSeccionDialogData,
    EditSeccionDialogResult,
} from './edit-seccion-dialog/edit-seccion-dialog.component';

interface SeccionCicloViewModel extends SeccionCiclo {
    seccionNombre: string;
    nivelNombre: string;
}

@Component({
    selector: 'app-seccion-ciclo',
    standalone: true,
    templateUrl: './seccion-ciclo.component.html',
    styleUrls: ['./seccion-ciclo.component.scss'],
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
        AgGridAngular,
    ],
})
export class SeccionCicloComponent implements OnInit, OnDestroy {
    protected readonly sedes$ = new BehaviorSubject<Sede[]>([]);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly niveles$ = new BehaviorSubject<Nivel[]>([]);
    protected readonly secciones$ = new BehaviorSubject<Seccion[]>([]);
    protected readonly seccionCiclosView$ = new BehaviorSubject<SeccionCicloViewModel[]>([]);

    protected readonly isLoadingSedes$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingSeccionCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCatalogs$ = new BehaviorSubject<boolean>(false);

    protected readonly selectedSedeControl = this.fb.control<number | null>(null);
    protected readonly selectedCicloControl = this.fb.control<number | null>(null);

    protected readonly columnDefs: ColDef<SeccionCicloViewModel>[];

    protected readonly defaultColDef: ColDef = {
        sortable: true,
        resizable: true,
        filter: true,
        flex: 1,
    };

    private gridApi?: GridApi<SeccionCicloViewModel>;
    private readonly destroy$ = new Subject<void>();
    private catalogsLoadingCount = 0;
    private seccionCiclosData: SeccionCiclo[] = [];

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly nivelesService: NivelesService,
        private readonly seccionesService: SeccionesService,
        private readonly seccionCicloService: SeccionCicloService
    ) {
        this.columnDefs = this.buildColumnDefs();
        this.syncSedeControlState();
        this.syncCicloControlState();
    }

    ngOnInit(): void {
        this.loadCatalogs();
        this.loadSedes();

        this.selectedSedeControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((sedeId) => {
                if (sedeId === null || sedeId === undefined) {
                    this.ciclos$.next([]);
                    this.selectedCicloControl.setValue(null, { emitEvent: false });
                    this.syncCicloControlState();
                    this.setSeccionCiclos([]);
                    return;
                }

                this.loadCiclos(sedeId);
            });

        this.selectedCicloControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((cicloId) => {
                if (cicloId === null || cicloId === undefined) {
                    this.setSeccionCiclos([]);
                    return;
                }

                this.loadSeccionCiclos(cicloId);
            });

        this.niveles$.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateViewModel());
        this.secciones$.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateViewModel());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<SeccionCicloViewModel>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
    }

    protected trackBySedeId(_index: number, item: Sede): number {
        return item.id;
    }

    protected trackByCicloId(_index: number, item: Ciclo): number {
        return item.id;
    }

    protected canCreateSeccion(): boolean {
        const cicloId = this.selectedCicloControl.value;
        return (
            cicloId !== null &&
            cicloId !== undefined &&
            !this.isLoadingSeccionCiclos$.value &&
            !this.isLoadingCatalogs$.value
        );
    }

    protected openAddSeccionDialog(): void {
        const cicloId = this.selectedCicloControl.value;

        if (cicloId === null || cicloId === undefined) {
            this.snackBar.open('Selecciona un ciclo válido para agregar una sección.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        const niveles = this.niveles$.value.filter((nivel) => nivel.activo);
        const secciones = this.secciones$.value.filter((seccion) => seccion.activo);

        if (niveles.length === 0 || secciones.length === 0) {
            this.snackBar.open(
                'No hay niveles o secciones activos disponibles para registrar.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        blurActiveElement();

        const data: AddSeccionDialogData = {
            cicloId,
            niveles,
            secciones,
            existingSeccionCiclos: [...this.seccionCiclosData],
        };

        const dialogRef = this.dialog.open<
            AddSeccionDialogComponent,
            AddSeccionDialogData,
            AddSeccionDialogResult
        >(AddSeccionDialogComponent, {
            width: '520px',
            disableClose: true,
            data,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            if (result.action === 'created') {
                this.addOrUpdateSeccionCiclo(result.seccionCiclo, true);
            }
        });
    }

    private loadCatalogs(): void {
        this.loadNiveles();
        this.loadSecciones();
    }

    private loadNiveles(): void {
        this.setCatalogLoading(true);
        this.nivelesService
            .listAll()
            .pipe(
                finalize(() => this.setCatalogLoading(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (niveles) => {
                    this.niveles$.next(niveles);
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

    private loadSecciones(): void {
        this.setCatalogLoading(true);
        this.seccionesService
            .list()
            .pipe(
                finalize(() => this.setCatalogLoading(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (secciones) => {
                    this.secciones$.next(secciones);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las secciones.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private loadSedes(): void {
        this.isLoadingSedes$.next(true);
        this.syncSedeControlState();

        this.sedeService
            .getSedes()
            .pipe(
                finalize(() => {
                    this.isLoadingSedes$.next(false);
                    this.syncSedeControlState();
                }),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (sedes) => {
                    this.sedes$.next(sedes);
                    this.syncSedeControlState();

                    const current = this.selectedSedeControl.value;
                    if (current && sedes.some((sede) => sede.id === current)) {
                        this.loadCiclos(current);
                        return;
                    }

                    const first = sedes[0];
                    if (first) {
                        this.selectedSedeControl.setValue(first.id);
                    } else {
                        this.selectedSedeControl.setValue(null);
                        this.ciclos$.next([]);
                        this.selectedCicloControl.setValue(null, { emitEvent: false });
                        this.syncCicloControlState();
                        this.setSeccionCiclos([]);
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
        this.syncCicloControlState();

        this.ciclosService
            .listBySede(sedeId)
            .pipe(
                finalize(() => {
                    this.isLoadingCiclos$.next(false);
                    this.syncCicloControlState();
                }),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (ciclos) => {
                    const activos = ciclos.filter((ciclo) => ciclo.activo);
                    this.ciclos$.next(activos);
                    this.syncCicloControlState();

                    const current = this.selectedCicloControl.value;
                    if (current && activos.some((ciclo) => ciclo.id === current)) {
                        this.loadSeccionCiclos(current);
                        return;
                    }

                    const first = activos[0];
                    if (first) {
                        this.selectedCicloControl.setValue(first.id);
                    } else {
                        this.selectedCicloControl.setValue(null);
                        this.setSeccionCiclos([]);
                    }
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

    private loadSeccionCiclos(cicloId: number): void {
        this.isLoadingSeccionCiclos$.next(true);

        this.seccionCicloService
            .listByCiclo(cicloId)
            .pipe(finalize(() => this.isLoadingSeccionCiclos$.next(false)))
            .subscribe({
                next: (seccionCiclos) => {
                    this.setSeccionCiclos(seccionCiclos);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las secciones del ciclo.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private setSeccionCiclos(seccionCiclos: SeccionCiclo[]): void {
        this.seccionCiclosData = seccionCiclos;
        this.updateViewModel();
    }

    private addOrUpdateSeccionCiclo(seccionCiclo: SeccionCiclo, prepend = false): void {
        const cicloId = this.selectedCicloControl.value;
        if (cicloId === null || cicloId === undefined || seccionCiclo.cicloId !== cicloId) {
            return;
        }

        const current = [...this.seccionCiclosData];
        const index = current.findIndex((item) => item.id === seccionCiclo.id);

        if (index > -1) {
            current[index] = seccionCiclo;
        } else if (prepend) {
            current.unshift(seccionCiclo);
        } else {
            current.push(seccionCiclo);
        }

        this.seccionCiclosData = current;
        this.updateViewModel();
    }

    private removeSeccionCiclo(seccionCicloId: number): void {
        const current = this.seccionCiclosData.filter((item) => item.id !== seccionCicloId);
        this.seccionCiclosData = current;
        this.updateViewModel();
    }

    private updateViewModel(): void {
        const secciones = this.secciones$.value;
        const niveles = this.niveles$.value;

        const view = this.seccionCiclosData.map<SeccionCicloViewModel>((item) => {
            const seccionNombre =
                secciones.find((seccion) => seccion.id === item.seccionId)?.nombre ?? '—';
            const nivelNombre =
                niveles.find((nivel) => nivel.id === item.nivelId)?.nombre ?? '—';

            return {
                ...item,
                seccionNombre,
                nivelNombre,
            };
        });

        this.seccionCiclosView$.next(view);
        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 0);
    }

    private setCatalogLoading(isLoading: boolean): void {
        if (isLoading) {
            this.catalogsLoadingCount += 1;
        } else if (this.catalogsLoadingCount > 0) {
            this.catalogsLoadingCount -= 1;
        }

        const shouldBeLoading = this.catalogsLoadingCount > 0;

        if (this.isLoadingCatalogs$.value !== shouldBeLoading) {
            this.isLoadingCatalogs$.next(shouldBeLoading);
        }
    }

    private syncSedeControlState(): void {
        const shouldDisable = this.isLoadingSedes$.value || this.sedes$.value.length === 0;

        if (shouldDisable && this.selectedSedeControl.enabled) {
            this.selectedSedeControl.disable({ emitEvent: false });
            return;
        }

        if (!shouldDisable && this.selectedSedeControl.disabled) {
            this.selectedSedeControl.enable({ emitEvent: false });
        }
    }

    private syncCicloControlState(): void {
        const shouldDisable =
            this.isLoadingCiclos$.value ||
            this.selectedSedeControl.value === null ||
            this.ciclos$.value.length === 0;

        if (shouldDisable && this.selectedCicloControl.enabled) {
            this.selectedCicloControl.disable({ emitEvent: false });
            return;
        }

        if (!shouldDisable && this.selectedCicloControl.disabled) {
            this.selectedCicloControl.enable({ emitEvent: false });
        }
    }

    private buildColumnDefs(): ColDef<SeccionCicloViewModel>[] {
        return [
            { headerName: 'Sección', field: 'seccionNombre', minWidth: 200, flex: 1 },
            { headerName: 'Nivel', field: 'nivelNombre', minWidth: 160, flex: 1 },
            {
                headerName: 'Capacidad',
                field: 'capacidad',
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
                field: 'id',
                minWidth: 200,
                maxWidth: 220,
                filter: false,
                sortable: false,
                resizable: false,
                flex: 0,
                menuTabs: [],
                cellRenderer: (params) => this.renderActionsCell(params),
            },
        ];
    }

    private renderActionsCell(
        params: ICellRendererParams<SeccionCicloViewModel, unknown>
    ): HTMLElement {
        const container = document.createElement('div');
        container.classList.add('seccion-ciclo__actions');

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.classList.add('seccion-ciclo__edit-button');
        editButton.setAttribute('aria-label', 'Editar sección');
        editButton.title = 'Editar';

        const editIcon = document.createElement('span');
        editIcon.classList.add('material-icons', 'seccion-ciclo__edit-icon');
        editIcon.setAttribute('aria-hidden', 'true');
        editIcon.textContent = 'edit';

        const editText = document.createElement('span');
        editText.classList.add('seccion-ciclo__edit-text');
        editText.textContent = 'Editar';

        editButton.append(editIcon, editText);

        editButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (params.data) {
                this.openEditSeccionDialog(params.data);
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.classList.add('seccion-ciclo__delete-button');
        deleteButton.setAttribute('aria-label', 'Eliminar sección');
        deleteButton.title = 'Eliminar';

        const icon = document.createElement('span');
        icon.classList.add('material-icons', 'seccion-ciclo__delete-icon');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'delete';

        const text = document.createElement('span');
        text.classList.add('seccion-ciclo__delete-text');
        text.textContent = 'Eliminar';

        deleteButton.append(icon, text);

        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (params.data) {
                this.confirmDeleteSeccionCiclo(params.data);
            }
        });

        container.append(editButton, deleteButton);

        return container;
    }

    private openEditSeccionDialog(seccionCiclo: SeccionCicloViewModel): void {
        blurActiveElement();

        const cicloId = this.selectedCicloControl.value;

        if (cicloId === null || cicloId === undefined) {
            this.snackBar.open('Selecciona un ciclo válido para editar la sección.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        const niveles = this.niveles$.value.filter(
            (nivel) => nivel.activo || nivel.id === seccionCiclo.nivelId
        );
        const secciones = this.secciones$.value.filter(
            (seccion) => seccion.activo || seccion.id === seccionCiclo.seccionId
        );

        if (!niveles.length || !secciones.length) {
            this.snackBar.open(
                'No hay niveles o secciones disponibles para editar este registro.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        const data: EditSeccionDialogData = {
            cicloId,
            seccionCiclo,
            niveles,
            secciones,
            existingSeccionCiclos: [...this.seccionCiclosData],
        };

        const dialogRef = this.dialog.open<
            EditSeccionDialogComponent,
            EditSeccionDialogData,
            EditSeccionDialogResult
        >(EditSeccionDialogComponent, {
            width: '520px',
            disableClose: true,
            data,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            if (result.action === 'updated') {
                this.addOrUpdateSeccionCiclo(result.seccionCiclo);
            }
        });
    }

    private confirmDeleteSeccionCiclo(seccionCiclo: SeccionCicloViewModel): void {
        const confirmed = window.confirm(
            `¿Deseas eliminar la sección "${seccionCiclo.seccionNombre}" del ciclo seleccionado?`
        );

        if (!confirmed) {
            return;
        }

        this.isLoadingSeccionCiclos$.next(true);

        this.seccionCicloService
            .delete(seccionCiclo.id)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.isLoadingSeccionCiclos$.next(false))
            )
            .subscribe({
                next: () => {
                    this.removeSeccionCiclo(seccionCiclo.id);
                    this.snackBar.open('La sección se eliminó correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al eliminar la sección.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }
}
