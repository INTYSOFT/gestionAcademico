import { AsyncPipe } from '@angular/common';
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
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import {
    SeccionFormDialogComponent,
    SeccionFormDialogData,
    SeccionFormDialogResult,
} from './seccion-form-dialog.component';
import { SeccionesActionsCellComponent } from './actions-cell/secciones-actions-cell.component';

@Component({
    selector: 'app-secciones',
    standalone: true,
    templateUrl: './secciones.component.html',
    styleUrls: ['./secciones.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    AgGridAngular
],
})
export class SeccionesComponent implements OnInit, OnDestroy {
    protected readonly searchControl = this.fb.control('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
    });
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly secciones$ = new BehaviorSubject<Seccion[]>([]);

    protected readonly columnDefs: ColDef<Seccion>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 200, flex: 1 },
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
            cellRenderer: SeccionesActionsCellComponent,
            cellRendererParams: {
                onEdit: (seccion: Seccion) => this.openSeccionDialog(seccion),
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

    private gridApi?: GridApi<Seccion>;
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly seccionesService: SeccionesService
    ) {}

    ngOnInit(): void {
        this.loadSecciones();

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((value) => {
                const normalized = value.trim().toLowerCase();
                this.gridApi?.setGridOption('quickFilterText', normalized);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Seccion>): void {
        this.gridApi = event.api;
        event.api.setGridOption('quickFilterText', this.searchControl.value.trim().toLowerCase());
        event.api.sizeColumnsToFit();
    }

    protected createSeccion(): void {
        blurActiveElement();
        this.openSeccionDialog();
    }

    protected clearSearch(): void {
        if (!this.searchControl.value) {
            return;
        }

        this.searchControl.setValue('', { emitEvent: true });
    }

    private loadSecciones(): void {
        this.isLoading$.next(true);

        this.seccionesService
            .list()
            .pipe(finalize(() => this.isLoading$.next(false)), takeUntil(this.destroy$))
            .subscribe({
                next: (secciones) => {
                    this.secciones$.next(secciones);
                    this.gridApi?.setGridOption(
                        'quickFilterText',
                        this.searchControl.value.trim().toLowerCase()
                    );
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

    private openSeccionDialog(seccion?: Seccion | null): void {
        const data: SeccionFormDialogData = {
            seccion: seccion ?? null,
        };

        const dialogRef = this.dialog.open<
            SeccionFormDialogComponent,
            SeccionFormDialogData,
            SeccionFormDialogResult
        >(SeccionFormDialogComponent, {
            data,
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.upsertSeccion(result.seccion);
            });
    }

    private upsertSeccion(seccion: Seccion): void {
        const current = [...this.secciones$.value];
        const index = current.findIndex((item) => item.id === seccion.id);

        if (index > -1) {
            current[index] = seccion;
        } else {
            current.unshift(seccion);
        }

        this.secciones$.next(current);
        this.gridApi?.setGridOption('rowData', current);
        this.gridApi?.setGridOption(
            'quickFilterText',
            this.searchControl.value.trim().toLowerCase()
        );
    }
}
