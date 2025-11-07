import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    ViewEncapsulation,
    inject,
    signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { EvaluacionDetalleDefatult } from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionDetalleDefatultActionsCellComponent } from '../puntuacion/evaluacion-detalle-defatult-actions-cell/evaluacion-detalle-defatult-actions-cell.component';
import {
    EvaluacionDetalleDefatultFormDialogComponent,
    type EvaluacionDetalleDefatultFormDialogResult,
} from '../puntuacion/evaluacion-detalle-defatult-form-dialog/evaluacion-detalle-defatult-form-dialog.component';
import { EvaluacionDetalleDefatultsService } from 'app/core/services/centro-estudios/evaluacion-detalle-defatults.service';
import { EvaluacionTipoPreguntasService } from 'app/core/services/centro-estudios/evaluacion-tipo-preguntas.service';

interface EvaluacionDetalleDefatultView extends EvaluacionDetalleDefatult {
    evaluacionTipoPreguntaNombre: string;
    rangoLabel: string;
}

@Component({
    selector: 'app-evaluacion-puntuacion-default',
    standalone: true,
    templateUrl: './evaluacion-puntuacion-default.component.html',
    styleUrls: ['./evaluacion-puntuacion-default.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        AgGridAngular,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTooltipModule,
    ],
})
export class EvaluacionPuntuacionDefaultComponent implements OnInit {
    protected readonly isLoading = signal(false);
    protected readonly evaluacionDetalleDefatultView = signal<EvaluacionDetalleDefatultView[]>([]);

    protected readonly evaluacionDetalleDefatultColumnDefs: ColDef<
        EvaluacionDetalleDefatultView
    >[] = [
        {
            headerName: 'Rango',
            field: 'rangoLabel',
            minWidth: 140,
        },
        {
            headerName: 'Valor buena',
            field: 'valorBuena',
            minWidth: 160,
            valueFormatter: (params) => this.formatDecimal(params.value),
        },
        {
            headerName: 'Valor mala',
            field: 'valorMala',
            minWidth: 160,
            valueFormatter: (params) => this.formatDecimal(params.value),
        },
        {
            headerName: 'Valor blanca',
            field: 'valorBlanca',
            minWidth: 160,
            valueFormatter: (params) => this.formatDecimal(params.value),
        },
        {
            headerName: 'Tipo de pregunta',
            field: 'evaluacionTipoPreguntaNombre',
            minWidth: 220,
        },
        {
            headerName: 'Activo',
            field: 'activo',
            minWidth: 120,
            valueFormatter: (params) => this.formatBoolean(params.value),
        },
        {
            headerName: 'Observación',
            field: 'observacion',
            minWidth: 220,
            flex: 1,
        },
        {
            headerName: 'Acciones',
            cellRenderer: EvaluacionDetalleDefatultActionsCellComponent,
            cellRendererParams: {
                onEdit: (detalle: EvaluacionDetalleDefatult) => this.openDetalleDialog(detalle),
            },
            width: 120,
            sortable: false,
            filter: false,
            resizable: false,
            pinned: 'right',
        },
    ];
    protected readonly evaluacionDetalleDefatultDefaultColDef: ColDef = {
        sortable: true,
        resizable: true,
        filter: true,
        flex: 1,
    };

    private readonly evaluacionDetalleDefatultsService = inject(EvaluacionDetalleDefatultsService);
    private readonly evaluacionTipoPreguntasService = inject(EvaluacionTipoPreguntasService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);
    private readonly destroyRef = inject(DestroyRef);

    private readonly evaluacionDetalleDefatults = signal<EvaluacionDetalleDefatult[]>([]);
    private readonly evaluacionTipoPreguntas = signal<EvaluacionTipoPregunta[]>([]);

    private readonly evaluacionTipoPreguntaNombreMap = new Map<number, string>();
    private gridApi?: GridApi<EvaluacionDetalleDefatultView>;

    ngOnInit(): void {
        this.destroyRef.onDestroy(() => this.gridApi?.destroy());
        this.loadEvaluacionTipoPreguntas();
        this.loadEvaluacionDetalleDefatults();
    }

    protected createEvaluacionDetalleDefatult(): void {
        this.openDetalleDialog();
    }

    protected onEvaluacionDetalleDefatultGridReady(
        event: GridReadyEvent<EvaluacionDetalleDefatultView>
    ): void {
        this.gridApi = event.api;
        queueMicrotask(() => this.gridApi?.sizeColumnsToFit());
    }

    private openDetalleDialog(detalle?: EvaluacionDetalleDefatult | null): void {
        const dialogRef = this.dialog.open(EvaluacionDetalleDefatultFormDialogComponent, {
            width: '520px',
            disableClose: false,
            data: {
                mode: detalle ? 'edit' : 'create',
                detalle: detalle ?? null,
                evaluacionTipoPreguntas: this.evaluacionTipoPreguntas(),
            },
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result: EvaluacionDetalleDefatultFormDialogResult | undefined) => {
                if (!result) {
                    return;
                }

                const message =
                    result.action === 'created'
                        ? 'Detalle por defecto creado correctamente.'
                        : 'Detalle por defecto actualizado correctamente.';

                this.snackBar.open(message, 'Cerrar', {
                    duration: 4000,
                });

                this.loadEvaluacionDetalleDefatults();
            });
    }

    private loadEvaluacionDetalleDefatults(): void {
        this.isLoading.set(true);
        this.evaluacionDetalleDefatultsService
            .listAll()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (records) => {
                    this.evaluacionDetalleDefatults.set(records);
                    this.refreshEvaluacionDetalleDefatultView();
                },
                error: (error) => {
                    this.evaluacionDetalleDefatults.set([]);
                    this.refreshEvaluacionDetalleDefatultView();
                    this.snackBar.open(
                        error.message ?? 'No fue posible obtener los detalles por defecto.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private loadEvaluacionTipoPreguntas(): void {
        this.evaluacionTipoPreguntasService.listAll().subscribe({
            next: (records) => {
                this.evaluacionTipoPreguntas.set(records);
                this.evaluacionTipoPreguntaNombreMap.clear();
                records.forEach((tipo) => {
                    this.evaluacionTipoPreguntaNombreMap.set(tipo.id, tipo.nombre);
                });
                this.refreshEvaluacionDetalleDefatultView();
            },
            error: (error) => {
                this.evaluacionTipoPreguntas.set([]);
                this.evaluacionTipoPreguntaNombreMap.clear();
                this.refreshEvaluacionDetalleDefatultView();
                this.snackBar.open(
                    error.message ?? 'No fue posible cargar los tipos de pregunta.',
                    'Cerrar',
                    {
                        duration: 5000,
                    }
                );
            },
        });
    }

    private refreshEvaluacionDetalleDefatultView(): void {
        const mapped = this.evaluacionDetalleDefatults().map((detalle) =>
            this.mapEvaluacionDetalleDefatult(detalle)
        );
        this.evaluacionDetalleDefatultView.set(mapped);
        queueMicrotask(() => this.gridApi?.sizeColumnsToFit());
    }

    private mapEvaluacionDetalleDefatult(
        detalle: EvaluacionDetalleDefatult
    ): EvaluacionDetalleDefatultView {
        const evaluacionTipoPreguntaNombre =
            this.evaluacionTipoPreguntaNombreMap.get(detalle.evaluacionTipoPreguntaId) ??
            'Sin asignar';

        return {
            ...detalle,
            evaluacionTipoPreguntaNombre,
            rangoLabel: `${detalle.rangoInicio} - ${detalle.rangoFin}`,
        };
    }

    private formatDecimal(value: unknown): string {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return '';
        }

        return value.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    private formatBoolean(value: unknown): string {
        return value ? 'Sí' : 'No';
    }
}
