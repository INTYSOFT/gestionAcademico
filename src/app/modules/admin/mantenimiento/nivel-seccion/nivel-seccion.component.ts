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
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { NivelesService } from 'app/core/services/centro-estudios/niveles.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';
import { NivelSeccionActionsCellComponent } from './actions-cell/nivel-seccion-actions-cell.component';
import {
    NivelFormDialogComponent,
    NivelFormDialogData,
    NivelFormDialogResult,
} from './nivel-form-dialog/nivel-form-dialog.component';

@Component({
    selector: 'app-nivel-seccion',
    standalone: true,
    templateUrl: './nivel-seccion.component.html',
    styleUrls: ['./nivel-seccion.component.scss'],
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
export class NivelSeccionComponent implements OnInit, OnDestroy {
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly niveles$ = new BehaviorSubject<Nivel[]>([]);
    protected readonly searchControl = this.fb.control<string>('', { nonNullable: true });

    protected readonly columnDefs: ColDef<Nivel>[] = [
        { headerName: 'Nombre', field: 'nombre', minWidth: 200, flex: 1 },
        {
            headerName: 'Descripción',
            field: 'descripcion',
            minWidth: 220,
            flex: 1,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'Acciones',
            cellRenderer: NivelSeccionActionsCellComponent,
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
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                const normalized = value?.trim() ?? '';
                this.gridApi?.setGridOption('quickFilterText', normalized);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.gridApi?.destroy();
    }

    protected onGridReady(event: GridReadyEvent<Nivel>): void {
        this.gridApi = event.api;
        event.api.setGridOption('quickFilterText', this.searchControl.value);
        event.api.sizeColumnsToFit();
    }

    protected createNivel(): void {
        blurActiveElement();
        this.openNivelDialog();
    }

    protected clearSearch(): void {
        if (!this.searchControl.value) {
            return;
        }

        this.searchControl.setValue('', { emitEvent: true });
    }

    private loadNiveles(): void {
        this.isLoading$.next(true);
        this.nivelesService
            .listAll()
            .pipe(finalize(() => this.isLoading$.next(false)))
            .subscribe({
                next: (niveles) => {
                    this.niveles$.next(niveles);
                    this.gridApi?.setGridOption('quickFilterText', this.searchControl.value);
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

    private openNivelDialog(nivel?: Nivel | null): void {
        const data: NivelFormDialogData = {
            nivel: nivel ?? null,
        };

        const dialogRef = this.dialog.open<
            NivelFormDialogComponent,
            NivelFormDialogData,
            NivelFormDialogResult
        >(NivelFormDialogComponent, {
            data,
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result) => {
                if (!result) {
                    return;
                }

                this.upsertNivel(result.nivel);
            });
    }

    private upsertNivel(nivel: Nivel): void {
        const current = [...this.niveles$.value];
        const index = current.findIndex((item) => item.id === nivel.id);

        if (index > -1) {
            current[index] = nivel;
        } else {
            current.unshift(nivel);
        }

        this.niveles$.next(current);
    }
}
