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
import { Apoderado } from 'app/core/models/centro-estudios/apoderado.model';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import {
    BehaviorSubject,
    Subject,
    combineLatest,
    debounceTime,
    finalize,
    map,
    startWith,
    takeUntil,
} from 'rxjs';
import { ApoderadosActionsCellComponent } from './actions-cell/apoderados-actions-cell.component';
import type { ApoderadoFormDialogResult } from './apoderado-form-dialog/apoderado-form-dialog.component';

@Component({
    selector: 'app-apoderados',
    standalone: true,
    templateUrl: './apoderados.component.html',
    styleUrls: ['./apoderados.component.scss'],
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
    ],
})
export class ApoderadosComponent implements OnInit, OnDestroy {
    protected readonly filtersForm = this.fb.group({
        documento: this.fb.control('', {
            nonNullable: true,
            validators: [Validators.maxLength(15), Validators.pattern(/^\d*$/)],
        }),
        nombres: this.fb.control('', {
            nonNullable: true,
            validators: [Validators.maxLength(150)],
        }),
    });

    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly apoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly filteredApoderados$ = new BehaviorSubject<Apoderado[]>([]);

    protected readonly columnDefs: ColDef<Apoderado>[] = [
        { headerName: 'DNI', field: 'documento', minWidth: 120 },
        { headerName: 'Apellidos', field: 'apellidos', minWidth: 200, flex: 1 },
        { headerName: 'Nombres', field: 'nombres', minWidth: 200, flex: 1 },
        { headerName: 'Celular', field: 'celular', minWidth: 150 },
        { headerName: 'Correo', field: 'correo', minWidth: 220, flex: 1 },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: ApoderadosActionsCellComponent,
            cellRendererParams: {
                onEdit: (apoderado: Apoderado) => this.openApoderadoDialog(apoderado),
            },
            width: 140,
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

    private gridApi?: GridApi<Apoderado>;
    private quickFilterText = '';
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly apoderadosService: ApoderadosService
    ) {}

    ngOnInit(): void {
        this.loadApoderados();

        const filtersChanges$ = this.filtersForm.valueChanges.pipe(
            debounceTime(300),
            startWith(this.filtersForm.getRawValue()),
            map(({ documento, nombres }) => ({
                documento: documento.trim().toLowerCase(),
                nombres: nombres.trim().toLowerCase(),
            })),
            takeUntil(this.destroy$)
        );

        combineLatest([this.apoderados$, filtersChanges$])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([apoderados, filters]) => {
                this.quickFilterText = [filters.documento, filters.nombres]
                    .filter((value) => value.length > 0)
                    .join(' ');
                this.gridApi?.setGridOption('quickFilterText', this.quickFilterText);

                const filtered = this.filterApoderados(apoderados, filters);
                this.filteredApoderados$.next(filtered);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Apoderado>): void {
        this.gridApi = event.api;
        event.api.sizeColumnsToFit();
        if (this.quickFilterText.length > 0) {
            event.api.setGridOption('quickFilterText', this.quickFilterText);
        }
    }

    protected createApoderado(): void {
        void this.openApoderadoDialog();
    }

    private loadApoderados(): void {
        this.isLoading$.next(true);

        this.apoderadosService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (apoderados) => {
                    const normalized = apoderados.map((item) =>
                        this.normalizeApoderado(item)
                    );
                    this.apoderados$.next(normalized);
                    Promise.resolve().then(() => this.gridApi?.sizeColumnsToFit());
                },
                error: (error: Error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los apoderados.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                },
            });
    }

    private filterApoderados(
        apoderados: Apoderado[],
        filters: { documento: string; nombres: string }
    ): Apoderado[] {
        const { documento, nombres } = filters;

        if (!documento && !nombres) {
            return [...apoderados];
        }

        return apoderados.filter((apoderado) => {
            const matchesDocumento = documento
                ? (apoderado.documento ?? '').toLowerCase().includes(documento)
                : true;
            const matchesNombres = nombres
                ? [apoderado.apellidos, apoderado.nombres]
                      .filter((value): value is string => !!value)
                      .join(' ')
                      .toLowerCase()
                      .includes(nombres)
                : true;

            return matchesDocumento && matchesNombres;
        });
    }

    private openApoderadoDialog(apoderado?: Apoderado): void {
        import('./apoderado-form-dialog/apoderado-form-dialog.component').then(
            ({ ApoderadoFormDialogComponent }) => {
                const dialogRef = this.dialog.open(ApoderadoFormDialogComponent, {
                    width: '520px',
                    disableClose: true,
                    data: { apoderado },
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: ApoderadoFormDialogResult) => {
                        if (!result) {
                            return;
                        }

                        const message =
                            result.action === 'created'
                                ? 'Apoderado registrado correctamente.'
                                : 'Apoderado actualizado correctamente.';

                        this.upsertApoderado(result.apoderado);
                        this.snackBar.open(message, 'Cerrar', {
                            duration: 4000,
                        });
                    });
            }
        );
    }

    private upsertApoderado(apoderado: Apoderado): void {
        const normalized = this.normalizeApoderado(apoderado);
        const current = [...this.apoderados$.value];
        const index = current.findIndex((item) => item.id === normalized.id);

        if (index > -1) {
            current[index] = normalized;
        } else {
            current.unshift(normalized);
        }

        this.apoderados$.next(current);
    }

    private normalizeApoderado(
        apoderado: Partial<Apoderado> & Record<string, unknown>
    ): Apoderado {
        const idSource = apoderado.id ?? apoderado['Id'];
        const rawActivo = apoderado.activo ?? apoderado['Activo'];

        const documentoValue = apoderado.documento ?? apoderado['Documento'];
        const apellidosValue = apoderado.apellidos ?? apoderado['Apellidos'];
        const nombresValue = apoderado.nombres ?? apoderado['Nombres'];
        const celularValue = apoderado.celular ?? apoderado['Celular'];
        const correoValue = apoderado.correo ?? apoderado['Correo'];
        const fechaRegistroValue =
            apoderado.fechaRegistro ?? apoderado['FechaRegistro'];
        const fechaActualizacionValue =
            apoderado.fechaActualizacion ?? apoderado['FechaActualizacion'];
        const usuarioRegistroValue =
            apoderado.usuaraioRegistroId ?? apoderado['UsuaraioRegistroId'];
        const usuarioActualizacionValue =
            apoderado.usuaraioActualizacionId ??
            apoderado['UsuaraioActualizacionId'];

        let activo = false;
        if (typeof rawActivo === 'string') {
            const normalizedActivo = rawActivo.trim().toLowerCase();
            if (['true', '1', 'sí', 'si', 'yes'].includes(normalizedActivo)) {
                activo = true;
            } else if (
                ['false', '0', 'no', 'n'].includes(normalizedActivo)
            ) {
                activo = false;
            } else {
                activo = Boolean(normalizedActivo);
            }
        } else {
            activo = Boolean(rawActivo);
        }

        let id: number;
        if (typeof idSource === 'number') {
            id = idSource;
        } else if (idSource !== undefined && idSource !== null) {
            id = Number(idSource);
        } else {
            id = 0;
        }

        let usuarioRegistroId: number | null = null;
        if (typeof usuarioRegistroValue === 'number') {
            usuarioRegistroId = usuarioRegistroValue;
        } else if (
            usuarioRegistroValue !== undefined &&
            usuarioRegistroValue !== null
        ) {
            usuarioRegistroId = Number(usuarioRegistroValue);
        }

        let usuarioActualizacionId: number | null = null;
        if (typeof usuarioActualizacionValue === 'number') {
            usuarioActualizacionId = usuarioActualizacionValue;
        } else if (
            usuarioActualizacionValue !== undefined &&
            usuarioActualizacionValue !== null
        ) {
            usuarioActualizacionId = Number(usuarioActualizacionValue);
        }

        return {
            id,
            documento:
                documentoValue !== undefined && documentoValue !== null
                    ? String(documentoValue)
                    : null,
            apellidos:
                apellidosValue !== undefined && apellidosValue !== null
                    ? String(apellidosValue)
                    : null,
            nombres:
                nombresValue !== undefined && nombresValue !== null
                    ? String(nombresValue)
                    : null,
            celular:
                celularValue !== undefined && celularValue !== null
                    ? String(celularValue)
                    : null,
            correo:
                correoValue !== undefined && correoValue !== null
                    ? String(correoValue)
                    : null,
            activo,
            fechaRegistro:
                fechaRegistroValue !== undefined && fechaRegistroValue !== null
                    ? String(fechaRegistroValue)
                    : null,
            fechaActualizacion:
                fechaActualizacionValue !== undefined &&
                fechaActualizacionValue !== null
                    ? String(fechaActualizacionValue)
                    : null,
            usuaraioRegistroId: usuarioRegistroId,
            usuaraioActualizacionId: usuarioActualizacionId,
        };
    }
}
