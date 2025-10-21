import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    computed,
    inject,
    signal,
} from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    CellValueChangedEvent,
    ColDef,
    GetRowIdParams,
    GridApi,
    GridReadyEvent,
    ICellRendererParams,
    ValueParserParams,
} from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionDetalle } from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import {
    CreateEvaluacionClavePayload,
    EvaluacionClave,
} from 'app/core/models/centro-estudios/evaluacion-clave.model';
import { EvaluacionClavesService } from 'app/core/services/centro-estudios/evaluacion-claves.service';

export interface EvaluacionClaveDialogData {
    evaluacion: EvaluacionProgramada;
    detalle: EvaluacionDetalle;
}

export type EvaluacionClaveDialogResult = { action: 'saved' } | { action: 'cancel' };

interface EvaluacionClaveRow {
    id: number | null;
    tempId: string;
    preguntaOrden: number;
    respuesta: string;
    ponderacion: number | null;
    observacion: string | null;
    version: number;
    vigente: boolean;
    activo: boolean;
}

@Component({
    selector: 'app-evaluacion-clave-dialog',
    standalone: true,
    templateUrl: './evaluacion-clave-dialog.component.html',
    styleUrls: ['./evaluacion-clave-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        AgGridAngular,
    ],
})
export class EvaluacionClaveDialogComponent implements OnInit, AfterViewInit {
    protected readonly isLoading = signal(true);
    protected readonly isSaving = signal(false);
    protected readonly rows = signal<EvaluacionClaveRow[]>([]);
    protected readonly deletedClaveIds = signal<number[]>([]);

    protected readonly gridHeight = computed(() => {
        const baseHeight = 260;
        const perRow = 48;
        const maxHeight = 640;
        const total = baseHeight + perRow * Math.min(this.rows().length, 8);
        return Math.min(Math.max(total, 320), maxHeight);
    });

    protected readonly respuestaSelectValues = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    protected readonly respuestaValidSet = new Set(this.respuestaSelectValues.filter(Boolean));

    protected readonly columnDefs: ColDef<EvaluacionClaveRow>[] = [
        {
            headerName: '# Pregunta',
            field: 'preguntaOrden',
            width: 130,
            editable: true,
            valueParser: (params: ValueParserParams<EvaluacionClaveRow>) => {
                const parsed = Number.parseInt(params.newValue as string, 10);
                return Number.isFinite(parsed) ? parsed : params.oldValue ?? null;
            },
            valueFormatter: (params) =>
                params.value !== null && params.value !== undefined ? params.value : '',
            cellClass: 'ag-grid-cell--number',
        },
        {
            headerName: 'Respuesta',
            field: 'respuesta',
            width: 140,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: this.respuestaSelectValues },
            valueFormatter: (params) => this.formatRespuesta(params.value),
        },
        {
            headerName: 'Ponderación',
            field: 'ponderacion',
            width: 150,
            editable: true,
            valueParser: (params: ValueParserParams<EvaluacionClaveRow>) => {
                if (params.newValue === '' || params.newValue === null) {
                    return null;
                }

                const parsed = Number.parseFloat(params.newValue as string);
                return Number.isFinite(parsed) ? parsed : params.oldValue ?? null;
            },
            valueFormatter: (params) =>
                params.value !== null && params.value !== undefined
                    ? new Intl.NumberFormat('es-PE', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                      }).format(params.value)
                    : '—',
        },
        {
            headerName: 'Observación',
            field: 'observacion',
            flex: 1,
            minWidth: 220,
            editable: true,
        },
        {
            headerName: 'Acciones',
            colId: 'actions',
            width: 120,
            pinned: 'right',
            sortable: false,
            filter: false,
            editable: false,
            suppressNavigable: true,
            resizable: false,
            cellClass: 'ag-grid-cell--actions',
            cellRenderer: (params: ICellRendererParams<EvaluacionClaveRow>) =>
                this.buildDeleteButton(params),
        },
    ];

    protected readonly defaultColDef: ColDef<EvaluacionClaveRow> = {
        resizable: true,
        sortable: true,
        filter: true,
        suppressMovable: true,
        cellClass: 'ag-grid-cell',
    };

    protected readonly getRowId = (
        params: GetRowIdParams<EvaluacionClaveRow>
    ): string => {
        const data = params.data;

        if (data.id !== null) {
            return `clave-${data.id}`;
        }

        return data.tempId;
    };

    private readonly dialogRef = inject(
        MatDialogRef<EvaluacionClaveDialogComponent, EvaluacionClaveDialogResult>
    );
    protected readonly data = inject<EvaluacionClaveDialogData>(MAT_DIALOG_DATA);
    private readonly evaluacionClavesService = inject(EvaluacionClavesService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly destroyRef = inject(DestroyRef);

    private gridApi: GridApi<EvaluacionClaveRow> | null = null;
    private shouldAutoSizeColumns = false;
    private tempIdCounter = 0;

    ngOnInit(): void {
        this.loadClaves();
    }

    ngAfterViewInit(): void {
        this.shouldAutoSizeColumns = true;
    }

    protected onGridReady(event: GridReadyEvent<EvaluacionClaveRow>): void {
        this.gridApi = event.api;

        this.syncGridRows();

        if (this.shouldAutoSizeColumns) {
            this.autoSizeColumns();
        }
    }

    protected onCellValueChanged(
        event: CellValueChangedEvent<EvaluacionClaveRow>
    ): void {
        const data = event.data;
        if (!data) {
            return;
        }

        if (event.colDef.field === 'respuesta') {
            data.respuesta = this.normalizeRespuesta(data.respuesta);
        }

        if (event.colDef.field === 'preguntaOrden') {
            data.preguntaOrden = Number.isFinite(data.preguntaOrden)
                ? Number(data.preguntaOrden)
                : data.preguntaOrden;
        }

        if (event.colDef.field === 'ponderacion' && data.ponderacion !== null) {
            data.ponderacion = Number(data.ponderacion);
        }
    }

    protected addRow(): void {
        const nextOrden = this.computeNextPreguntaOrden();
        const nextRows = [
            ...this.rows(),
            this.createRow({
                id: null,
                preguntaOrden: nextOrden,
                respuesta: '',
            }),
        ];


        this.setRows(nextRows);

        this.rows.set(nextRows);

        this.autoSizeColumns();
    }

    protected removeRow(row: EvaluacionClaveRow): void {
        const nextRows = this.rows().filter((item) => item.tempId !== row.tempId);

        this.setRows(nextRows);

        this.rows.set(nextRows);


        if (row.id !== null) {
            this.deletedClaveIds.update((ids) =>
                ids.includes(row.id) ? ids : [...ids, row.id]
            );
        }

        this.autoSizeColumns();
    }

    protected close(): void {
        this.dialogRef.close({ action: 'cancel' });
    }

    protected save(): void {
        this.gridApi?.stopEditing();

        const rows = this.rows();
        if (rows.length === 0 && this.deletedClaveIds().length === 0) {
            this.dialogRef.close({ action: 'saved' });
            return;
        }

        const validationError = this.validateRows(rows);
        if (validationError) {
            this.showError(validationError);
            return;
        }

        const createRows = rows.filter((row) => row.id === null);
        const updateRows = rows.filter((row) => row.id !== null);
        const deleteIds = this.deletedClaveIds();

        const operations = [
            ...deleteIds.map((id) => this.evaluacionClavesService.delete(id)),
            ...updateRows.map((row) =>
                this.evaluacionClavesService.update(row.id!, this.buildPayload(row))
            ),
            ...createRows.map((row) =>
                this.evaluacionClavesService.create(this.buildPayload(row))
            ),
        ];

        if (operations.length === 0) {
            this.dialogRef.close({ action: 'saved' });
            return;
        }

        this.isSaving.set(true);
        forkJoin(operations)
            .pipe(
                finalize(() => this.isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.dialogRef.close({ action: 'saved' });
                },
                error: (error) => {
                    this.showError(
                        error?.message ?? 'No fue posible guardar las claves de la evaluación.'
                    );
                },
            });
    }

    private loadClaves(): void {
        this.isLoading.set(true);
        this.evaluacionClavesService
            .listByEvaluacionDetalle(this.data.detalle.id)
            .pipe(
                finalize(() => this.isLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (claves) => {
                    if (claves.length > 0) {

                        this.setRows(claves.map((clave) => this.mapClaveToRow(clave)));

                        this.rows.set(claves.map((clave) => this.mapClaveToRow(clave)));

                        this.deletedClaveIds.set([]);
                    } else {
                        this.initializeRowsFromDetalle();
                    }
                    this.autoSizeColumns();
                },
                error: (error) => {
                    this.showError(
                        error?.message ??
                            'No fue posible obtener las claves registradas para este detalle.'
                    );

                    this.setRows([]);
                    this.deletedClaveIds.set([]);
                    this.autoSizeColumns();

                    this.rows.set([]);
                    this.deletedClaveIds.set([]);
                },
            });
    }

    private initializeRowsFromDetalle(): void {
        const inicio = Number(this.data.detalle.rangoInicio);
        const fin = Number(this.data.detalle.rangoFin);

        const rows: EvaluacionClaveRow[] = [];
        if (Number.isFinite(inicio) && Number.isFinite(fin) && fin >= inicio) {

        if (Number.isFinite(inicio) && Number.isFinite(fin) && fin >= inicio) {
            const rows: EvaluacionClaveRow[] = [];

            for (let pregunta = inicio; pregunta <= fin; pregunta += 1) {
                rows.push(
                    this.createRow({
                        id: null,
                        preguntaOrden: pregunta,
                        respuesta: '',
                    })
                );
            }

        }

        this.setRows(rows);

            this.rows.set(rows);
        } else {
            this.rows.set([]);
        }

        this.deletedClaveIds.set([]);
    }

    private mapClaveToRow(clave: EvaluacionClave): EvaluacionClaveRow {
        return {
            id: clave.id,
            tempId: `existing-${clave.id}`,
            preguntaOrden: clave.preguntaOrden,
            respuesta: this.normalizeRespuesta(clave.respuesta),
            ponderacion: clave.ponderacion ?? null,
            observacion: clave.observacion ?? null,
            version: clave.version ?? 1,
            vigente: clave.vigente ?? true,
            activo: clave.activo ?? true,
        };
    }

    private createRow(partial: Partial<EvaluacionClaveRow>): EvaluacionClaveRow {
        const basePonderacion =
            partial.ponderacion !== undefined && partial.ponderacion !== null
                ? Number(partial.ponderacion)
                : null;

        return {
            id: partial.id ?? null,
            tempId: partial.tempId ?? this.nextTempId(),
            preguntaOrden: partial.preguntaOrden ?? 0,
            respuesta: this.normalizeRespuesta(partial.respuesta ?? ''),
            ponderacion: Number.isFinite(basePonderacion) ? basePonderacion : null,
            observacion: partial.observacion ?? null,
            version: partial.version ?? 1,
            vigente: partial.vigente ?? true,
            activo: partial.activo ?? true,
        };
    }


    private setRows(rows: EvaluacionClaveRow[]): void {
        this.rows.set(rows);
        this.syncGridRows(rows);
    }

    private syncGridRows(rows: EvaluacionClaveRow[] = this.rows()): void {
        this.gridApi?.setGridOption('rowData', rows);
    }

    private computeNextPreguntaOrden(): number {
        const rows = this.rows();
        if (rows.length === 0) {
            const inicio = Number(this.data.detalle.rangoInicio);
            return Number.isFinite(inicio) ? inicio : 1;
        }

        const maxOrden = rows.reduce(
            (max, row) => (row.preguntaOrden > max ? row.preguntaOrden : max),
            rows[0].preguntaOrden
        );

        return maxOrden + 1;
    }

    private normalizeRespuesta(value: string | null | undefined): string {
        if (!value) {
            return '';
        }

        return value.trim().toUpperCase().slice(0, 1);
    }

    private validateRows(rows: EvaluacionClaveRow[]): string | null {
        const seenPreguntas = new Set<number>();

        for (const row of rows) {
            if (!Number.isFinite(row.preguntaOrden)) {
                return 'Todos los registros deben tener un número de pregunta válido.';
            }

            const pregunta = Number(row.preguntaOrden);
            if (seenPreguntas.has(pregunta)) {
                return `La pregunta ${pregunta} está duplicada. Cada pregunta debe tener una clave única.`;
            }
            seenPreguntas.add(pregunta);

            row.respuesta = this.normalizeRespuesta(row.respuesta);
            if (!row.respuesta || !this.respuestaValidSet.has(row.respuesta)) {
                return `La pregunta ${pregunta} debe tener una respuesta entre A y H.`;
            }

            if (row.ponderacion !== null && !Number.isFinite(row.ponderacion)) {
                return `La pregunta ${pregunta} tiene una ponderación inválida.`;
            }
        }

        return null;
    }

    private buildPayload(row: EvaluacionClaveRow): CreateEvaluacionClavePayload {
        return {
            evaluacionProgramadaId: this.data.evaluacion.id,
            evaluacionDetalleId: this.data.detalle.id,
            preguntaOrden: row.preguntaOrden,
            respuesta: row.respuesta,
            ponderacion: row.ponderacion ?? null,
            version: row.version ?? 1,
            vigente: row.vigente ?? true,
            observacion: row.observacion ?? null,
            activo: row.activo ?? true,
            sedeId: this.data.evaluacion.sedeId ?? null,
            cicloId: this.data.evaluacion.cicloId ?? null,
            seccionId: this.data.detalle.seccionId ?? null,
        };
    }

    private formatRespuesta(value: string | null | undefined): string {
        if (!value) {
            return '—';
        }

        return value;
    }

    private autoSizeColumns(): void {
        if (!this.gridApi) {
            this.shouldAutoSizeColumns = true;
            return;
        }

        this.shouldAutoSizeColumns = false;
        queueMicrotask(() => {
            this.gridApi?.sizeColumnsToFit({ defaultMinWidth: 110 });
        });
    }

    private buildDeleteButton(
        params: ICellRendererParams<EvaluacionClaveRow>
    ): HTMLElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ag-grid-action-button';
        button.innerText = 'Eliminar';
        button.addEventListener('click', () => {
            if (params.data) {
                this.removeRow(params.data);
            }
        });

        return button;
    }

    private nextTempId(): string {
        this.tempIdCounter += 1;
        return `temp-${this.tempIdCounter}`;
    }

    private showError(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 6000,
        });
    }
}
