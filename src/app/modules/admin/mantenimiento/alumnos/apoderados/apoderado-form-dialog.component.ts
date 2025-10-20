import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GetRowIdParams,
    GridApi,
    GridReadyEvent,
    RowClassRules,
} from 'ag-grid-community';
import {
    BehaviorSubject,
    EMPTY,
    Subject,
    combineLatest,
    debounceTime,
    finalize,
    map,
    switchMap,
    takeUntil,
} from 'rxjs';
import {
    Apoderado,
    CreateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';
import { Parentesco } from 'app/core/models/centro-estudios/parentesco.model';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import { ParentescosService } from 'app/core/services/centro-estudios/parentescos.service';
import { FormControl } from '@angular/forms';

export interface ApoderadoFormDialogData {
    alumnoId: number;
}

export interface ApoderadoFormDialogResult {
    apoderado: Apoderado;
    parentescoId: number;
}

@Component({
    selector: 'app-apoderado-form-dialog',
    standalone: true,
    templateUrl: './apoderado-form-dialog.component.html',
    styleUrls: ['./apoderado-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AgGridAngular
],
})
export class ApoderadoFormDialogComponent implements OnInit, OnDestroy {
    protected readonly searchControl = new FormControl('', {
        nonNullable: true,
    });
    protected readonly apoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly filteredApoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly parentescos$ = new BehaviorSubject<Parentesco[]>([]);
    protected readonly selectedApoderado$ = new BehaviorSubject<Apoderado | null>(null);
    protected readonly selectedParentesco = new FormControl<number | null>(null, [
        Validators.required,
    ]);

    protected readonly isLoading$ = new BehaviorSubject<boolean>(true);
    protected readonly isCreating$ = new BehaviorSubject<boolean>(false);

    protected readonly showCreateSection$ = combineLatest([
        this.isLoading$,
        this.filteredApoderados$,
    ]).pipe(map(([isLoading, apoderados]) => !isLoading && apoderados.length === 0));

    protected readonly parentescoStep$ = this.showCreateSection$.pipe(
        map((showCreateSection) => (showCreateSection ? 3 : 2))
    );

    protected readonly createForm: FormGroup;

    protected readonly columnDefs: ColDef<Apoderado>[] = [
        {
            headerName: 'Apellidos y nombres',
            valueGetter: ({ data }) =>
                data ? `${data.apellidos ?? ''} ${data.nombres ?? ''}`.trim() : '',
            flex: 2,
        },
        {
            headerName: 'Documento',
            field: 'documento',
            flex: 1,
        },
        {
            headerName: 'Celular',
            field: 'celular',
            flex: 1,
        },
        {
            headerName: 'Correo',
            field: 'correo',
            flex: 1.5,
        },
    ];

    protected readonly defaultColDef: ColDef<Apoderado> = {
        sortable: true,
        resizable: true,
        flex: 1,
    };

    protected readonly rowSelection: 'single' = 'single';

    protected readonly rowClassRules: RowClassRules<Apoderado> = {
        'apoderado-dialog__row--selected': ({ data }) =>
            !!data && this.selectedApoderado$.value?.id === data.id,
    };

    protected readonly getRowId = (params: GetRowIdParams<Apoderado>): string => {
        const id = params.data?.id;
        return id ? id.toString() : '';
    };

    private readonly destroy$ = new Subject<void>();
    private gridApi: GridApi<Apoderado> | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: ApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            ApoderadoFormDialogComponent,
            ApoderadoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly apoderadosService: ApoderadosService,
        private readonly parentescosService: ParentescosService,
        private readonly snackBar: MatSnackBar
    ) {
        this.createForm = this.fb.group({
            apellidos: ['', [Validators.required, Validators.maxLength(150)]],
            nombres: ['', [Validators.required, Validators.maxLength(150)]],
            documento: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.maxLength(15),
                    Validators.pattern(/^\d+$/),
                ],
            ],
            celular: [null, [Validators.pattern(/^[0-9]{9,15}$/)]],
            correo: [null, [Validators.email]],
        });
    }

    ngOnInit(): void {
        this.loadApoderados();
        this.loadParentescos();

        this.applyFilter(this.searchControl.value);

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => this.applyFilter(term));

        this.filteredApoderados$
            .pipe(takeUntil(this.destroy$))
            .subscribe((apoderados) => {
                const selectedId = this.selectedApoderado$.value?.id;

                if (selectedId && !apoderados.some((item) => item.id === selectedId)) {
                    this.selectApoderado(null, { resetParentesco: false });
                } else {
                    this.refreshGridStyles();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected onGridReady(event: GridReadyEvent<Apoderado>): void {
        this.gridApi = event.api;
        this.refreshGridStyles();
        this.syncGridSelection();
    }

    protected onSelectionChanged(): void {
        if (!this.gridApi) {
            return;
        }

        const [selected] = this.gridApi.getSelectedRows();
        this.selectApoderado(selected ?? null, { syncGrid: false });
    }

    protected save(): void {
        const apoderado = this.selectedApoderado$.value;
        const parentescoId = this.selectedParentesco.value;

        if (!apoderado || this.selectedParentesco.invalid || !parentescoId) {
            this.selectedParentesco.markAsTouched();
            this.snackBar.open('Seleccione un apoderado y parentesco.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.dialogRef.close({ apoderado, parentescoId });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected createApoderado(): void {
        if (this.createForm.invalid) {
            this.createForm.markAllAsTouched();
            return;
        }

        const payload: CreateApoderadoPayload = {
            apellidos: this.createForm.value.apellidos!,
            nombres: this.createForm.value.nombres!,
            documento: this.createForm.value.documento!,
            celular: this.createForm.value.celular ?? null,
            correo: this.createForm.value.correo ?? null,
            activo: true,
        };

        this.isCreating$.next(true);
        this.apoderadosService
            .getByDocumento(payload.documento)
            .pipe(
                switchMap((existing) => {
                    if (existing) {
                        const current = this.apoderados$.value;
                        const alreadyInList = current.some(
                            (item) => item.id === existing.id
                        );

                        this.apoderados$.next(
                            alreadyInList ? current : [existing, ...current]
                        );
                        this.applyFilter(this.searchControl.value);
                        this.selectApoderado(existing);
                        this.snackBar.open(
                            'El documento ingresado ya está registrado. Se seleccionó al apoderado existente.',
                            'Cerrar',
                            {
                                duration: 5000,
                            }
                        );

                        return EMPTY;
                    }

                    return this.apoderadosService.create(payload);
                }),
                finalize(() => this.isCreating$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (created) => {
                    const current = [created, ...this.apoderados$.value];
                    this.apoderados$.next(current);
                    this.applyFilter(this.searchControl.value);
                    this.selectApoderado(created);
                    this.snackBar.open(
                        'Apoderado registrado correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                },
                error: (error: Error) => {
                    this.snackBar.open(error.message, 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    protected trackByParentescoId(index: number, parentesco: Parentesco): number {
        return parentesco.id;
    }

    protected selectApoderado(
        apoderado: Apoderado | null,
        options: { syncGrid?: boolean; resetParentesco?: boolean } = {}
    ): void {
        const { syncGrid = true, resetParentesco = true } = options;

        this.selectedApoderado$.next(apoderado);

        if (resetParentesco) {
            this.selectedParentesco.reset();
        }

        if (syncGrid) {
            this.syncGridSelection();
        } else {
            this.refreshGridStyles();
        }
    }

    private loadApoderados(): void {
        this.isLoading$.next(true);
        this.apoderadosService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((apoderados) => {
                this.apoderados$.next(apoderados);
                this.applyFilter(this.searchControl.value);
            });
    }

    private loadParentescos(): void {
        this.parentescosService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe((parentescos) => {
                this.parentescos$.next(
                    parentescos.filter((parentesco) => parentesco.activo)
                );
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const apoderados = this.apoderados$.value;

        if (!normalized) {
            this.filteredApoderados$.next([...apoderados]);
            return;
        }

        const filtered = apoderados.filter((apoderado) => {
            const searchable = [
                apoderado.documento,
                apoderado.apellidos,
                apoderado.nombres,
                apoderado.correo,
            ]
                .filter((value): value is string => !!value)
                .map((value) => value.toLowerCase())
                .join(' ');

            return searchable.includes(normalized);
        });

        this.filteredApoderados$.next(filtered);
    }

    private syncGridSelection(): void {
        if (!this.gridApi) {
            return;
        }

        const selectedId = this.selectedApoderado$.value?.id;

        this.gridApi.forEachNode((node) => {
            const isSelected = !!selectedId && node.data?.id === selectedId;

            if (node.isSelected() !== isSelected) {
                node.setSelected(isSelected);
            }

            if (isSelected) {
                this.gridApi?.ensureNodeVisible(node, 'middle');
            }
        });

        this.refreshGridStyles();
    }

    private refreshGridStyles(): void {
        this.gridApi?.refreshCells({ force: true });
    }
}
