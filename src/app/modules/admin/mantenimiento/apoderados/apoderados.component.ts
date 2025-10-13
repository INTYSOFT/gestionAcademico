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
import { BehaviorSubject, Subject, debounceTime, finalize, takeUntil } from 'rxjs';
import { blurActiveElement } from 'app/core/utils/focus.util';
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
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly apoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly filteredApoderados$ = new BehaviorSubject<Apoderado[]>([]);

    protected readonly columnDefs: ColDef<Apoderado>[] = [
        { headerName: 'DNI', field: 'documento', minWidth: 120, flex: 1 },
        { headerName: 'Apellidos', field: 'apellidos', minWidth: 200, flex: 1 },
        { headerName: 'Nombres', field: 'nombres', minWidth: 180, flex: 1 },
        { headerName: 'Celular', field: 'celular', minWidth: 140 },
        { headerName: 'Correo', field: 'correo', minWidth: 200, flex: 1 },
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

    private gridApi?: GridApi<Apoderado>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly apoderadosService: ApoderadosService
    ) {}

    ngOnInit(): void {
        this.loadApoderados();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => {
                this.applyFilter(term);
                this.gridApi?.setGridOption('quickFilterText', term);
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
                    this.apoderados$.next(apoderados);
                    this.applyFilter(this.searchControl.value);
                },
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
            ]
                .filter((value): value is string => !!value)
                .map((value) => value.toLowerCase())
                .join(' ');

            return searchable.includes(normalized);
        });

        this.filteredApoderados$.next(filtered);
    }

    private openApoderadoDialog(apoderado?: Apoderado): void {
        blurActiveElement();

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
        const current = [...this.apoderados$.value];
        const index = current.findIndex((item) => item.id === apoderado.id);

        if (index > -1) {
            current[index] = apoderado;
        } else {
            current.unshift(apoderado);
        }

        this.apoderados$.next(current);
        this.applyFilter(this.searchControl.value);
    }
}
