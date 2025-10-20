import { AsyncPipe, NgClass } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
    BehaviorSubject,
    Observable,
    Subject,
    catchError,
    finalize,
    forkJoin,
    map,
    of,
    switchMap,
    takeUntil,
} from 'rxjs';
import { DateTime } from 'luxon';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaSeccionesService } from 'app/core/services/centro-estudios/evaluacion-programada-secciones.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import type {
    EvaluacionProgramadaDialogData,
    EvaluacionProgramadaDialogResult,
} from './evaluacion-programada-dialog/evaluacion-programada-dialog.component';

interface EvaluacionTreeNodeDetail {
    label: string;
    value: string;
}

interface EvaluacionTreeNodeIconConfig {
    name: string;
    classes?: string[];
    tooltip?: string;
    ariaLabel?: string;
}

interface EvaluacionTreeNode {
    id: string;
    title: string;
    subtitleLines: string[];
    status: 'default' | 'info';
    evaluacionId?: number;
    children?: EvaluacionTreeNode[];
    details?: EvaluacionTreeNodeDetail[];
    leadingIcon?: EvaluacionTreeNodeIconConfig;
    trailingIcon?: EvaluacionTreeNodeIconConfig;
}

const EVALUACION_SEARCH_MODE = {
    Date: 'date',
    Range: 'range',
} as const;

type EvaluacionSearchMode = (typeof EVALUACION_SEARCH_MODE)[keyof typeof EVALUACION_SEARCH_MODE];

function validateDateRange(control: AbstractControl): ValidationErrors | null {
    const value = control.value as { start: Date | null; end: Date | null } | null;
    if (!value) {
        return null;
    }

    const { start, end } = value;
    if (!start || !end) {
        return null;
    }

    const startDate = DateTime.fromJSDate(start).startOf('day');
    const endDate = DateTime.fromJSDate(end).startOf('day');

    if (!startDate.isValid || !endDate.isValid) {
        return { invalidDateRange: true };
    }

    if (endDate < startDate) {
        return { invalidDateRange: true };
    }

    return null;
}

@Component({
    selector: 'app-evaluacion-programar',
    standalone: true,
    templateUrl: './evaluacion-programar.component.html',
    styleUrls: ['./evaluacion-programar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    NgClass,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTreeModule
],
})
export class EvaluacionProgramarComponent implements OnInit, OnDestroy {
    protected readonly filtersForm = this.fb.group({
        mode: this.fb.control<EvaluacionSearchMode>(EVALUACION_SEARCH_MODE.Range, {
            nonNullable: true,
        }),
        date: this.fb.control<Date | null>(null),
        range: this.fb.group(
            {
                start: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
                end: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
            },
            {
                validators: validateDateRange,
            }
        ),
    });
    protected readonly isLoadingEvaluaciones$ = new BehaviorSubject<boolean>(false);
    protected readonly SearchMode = EVALUACION_SEARCH_MODE;

    protected readonly treeControl = new NestedTreeControl<EvaluacionTreeNode>((node) => node.children ?? []);
    protected readonly treeDataSource = new MatTreeNestedDataSource<EvaluacionTreeNode>();

    protected readonly hasChild = (_: number, node: EvaluacionTreeNode): boolean =>
        Array.isArray(node.children) && node.children.length > 0;

    private readonly destroy$ = new Subject<void>();

    private allEvaluaciones: EvaluacionProgramada[] = [];
    private evaluacionSecciones = new Map<number, EvaluacionProgramadaSeccion[]>();
    private readonly modeControl = this.filtersForm.controls.mode;
    private readonly dateControl = this.filtersForm.controls.date;
    private readonly rangeGroup = this.filtersForm.controls.range;
    private readonly rangeStartControl = this.rangeGroup.controls.start;
    private readonly rangeEndControl = this.rangeGroup.controls.end;

    private currentQueryKey: string | null = null;

    private sedes: Sede[] = [];
    private ciclos: Ciclo[] = [];
    private tiposEvaluacion: TipoEvaluacion[] = [];
    private carreras: Carrera[] = [];
    private secciones: Seccion[] = [];

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionProgramadasService: EvaluacionProgramadasService,
        private readonly evaluacionProgramadaSeccionesService: EvaluacionProgramadaSeccionesService,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService,
        private readonly carrerasService: CarrerasService,
        private readonly seccionesService: SeccionesService
    ) {}

    ngOnInit(): void {
        this.loadCatalogs();
        this.initializeFilters();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected createProgramacion(): void {
        this.openProgramacionDialog();
    }

    protected editProgramacion(evaluacionId: number): void {
        const evaluacion = this.allEvaluaciones.find((item) => item.id === evaluacionId);
        if (!evaluacion) {
            this.snackBar.open('No se encontró la evaluación programada seleccionada.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.openProgramacionDialog(evaluacion);
    }

    protected formatDateControlValue(date: Date | null): string {
        if (!date) {
            return '';
        }

        const formatted = DateTime.fromJSDate(date).setLocale('es');
        if (!formatted.isValid) {
            return '';
        }

        return formatted.toLocaleString(DateTime.DATE_FULL);
    }

    private loadCatalogs(): void {
        forkJoin({
            sedes: this.sedeService.getSedes().pipe(catchError(() => of([]))),
            ciclos: this.ciclosService.listAll().pipe(catchError(() => of([]))),
            tipos: this.tipoEvaluacionesService.listAll().pipe(catchError(() => of([]))),
            carreras: this.carrerasService.list().pipe(catchError(() => of([]))),
            secciones: this.seccionesService.list().pipe(catchError(() => of([]))),
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ sedes, ciclos, tipos, carreras, secciones }) => {
                    this.sedes = sedes;
                    this.ciclos = ciclos;
                    this.tiposEvaluacion = tipos;
                    this.carreras = carreras;
                    this.secciones = secciones;
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'No fue posible cargar los catálogos para las evaluaciones.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private initializeFilters(): void {
        const defaultRange = this.buildDefaultDateRange();
        this.rangeGroup.setValue(defaultRange, { emitEvent: false });
        this.dateControl.setValue(defaultRange.end, { emitEvent: false });

        this.modeControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
            this.applyModeValidators(mode);
            this.currentQueryKey = null;
            this.triggerFilter();
        });

        this.dateControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.modeControl.value === EVALUACION_SEARCH_MODE.Date) {
                this.triggerFilter();
            }
        });

        this.rangeGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.modeControl.value === EVALUACION_SEARCH_MODE.Range) {
                this.triggerFilter();
            }
        });

        this.applyModeValidators(this.modeControl.value, { emitEvent: false });
        this.triggerFilter();
    }

    private applyModeValidators(mode: EvaluacionSearchMode, options: { emitEvent?: boolean } = {}): void {
        const emitEvent = options.emitEvent ?? true;

        if (mode === EVALUACION_SEARCH_MODE.Date) {
            this.dateControl.addValidators(Validators.required);
            this.dateControl.updateValueAndValidity({ emitEvent });

            this.rangeStartControl.clearValidators();
            this.rangeEndControl.clearValidators();
            this.rangeStartControl.updateValueAndValidity({ emitEvent: false });
            this.rangeEndControl.updateValueAndValidity({ emitEvent: false });
        } else {
            this.rangeStartControl.addValidators(Validators.required);
            this.rangeEndControl.addValidators(Validators.required);
            this.rangeStartControl.updateValueAndValidity({ emitEvent: false });
            this.rangeEndControl.updateValueAndValidity({ emitEvent: false });

            this.dateControl.clearValidators();
        }

        this.rangeGroup.updateValueAndValidity({ emitEvent: false });
        if (mode !== EVALUACION_SEARCH_MODE.Date) {
            this.dateControl.updateValueAndValidity({ emitEvent: false });
        }
    }

    private triggerFilter(force = false): void {
        const mode = this.modeControl.value;

        if (mode === EVALUACION_SEARCH_MODE.Date) {
            if (this.dateControl.invalid) {
                this.currentQueryKey = null;
                this.resetEvaluaciones();
                return;
            }

            const fecha = this.toIsoDate(this.dateControl.value ?? null);
            if (!fecha) {
                this.currentQueryKey = null;
                this.resetEvaluaciones();
                return;
            }

            const key = `date_${fecha}`;
            if (!force && key === this.currentQueryKey) {
                return;
            }

            this.currentQueryKey = key;
            this.loadEvaluacionesPorFecha(fecha);
            return;
        }

        if (this.rangeGroup.invalid) {
            this.currentQueryKey = null;
            this.resetEvaluaciones();
            return;
        }

        const desde = this.toIsoDate(this.rangeStartControl.value ?? null);
        const hasta = this.toIsoDate(this.rangeEndControl.value ?? null);

        if (!desde || !hasta) {
            this.currentQueryKey = null;
            this.resetEvaluaciones();
            return;
        }

        const key = `range_${desde}_${hasta}`;
        if (!force && key === this.currentQueryKey) {
            return;
        }

        this.currentQueryKey = key;
        this.loadEvaluacionesPorFechaRango(desde, hasta);
    }

    private loadEvaluacionesPorFecha(fecha: string): void {
        this.loadEvaluaciones(
            this.evaluacionProgramadasService.listByFechaInicio(fecha),
            'Ocurrió un error al cargar las programaciones de la fecha seleccionada.'
        );
    }

    private loadEvaluacionesPorFechaRango(fechaDesde: string, fechaHasta: string): void {
        this.loadEvaluaciones(
            this.evaluacionProgramadasService.listByFechaInicioRange(fechaDesde, fechaHasta),
            'Ocurrió un error al cargar las programaciones del rango seleccionado.'
        );
    }

    private loadEvaluaciones(
        source$: Observable<EvaluacionProgramada[]>,
        fallbackErrorMessage: string
    ): void {
        this.isLoadingEvaluaciones$.next(true);

        source$
            .pipe(
                switchMap((evaluaciones) => {
                    if (!evaluaciones.length) {
                        this.evaluacionSecciones = new Map();
                        return of([] as {
                            evaluacion: EvaluacionProgramada;
                            secciones: EvaluacionProgramadaSeccion[];
                        }[]);
                    }

                    const detailRequests = evaluaciones.map((evaluacion) =>
                        this.evaluacionProgramadaSeccionesService
                            .listByEvaluacionProgramada(evaluacion.id)
                            .pipe(
                                catchError(() => of([] as EvaluacionProgramadaSeccion[])),
                                map((secciones) => ({ evaluacion, secciones }))
                            )
                    );

                    return forkJoin(detailRequests);
                }),
                finalize(() => this.isLoadingEvaluaciones$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (items) => {
                    const seccionesMap = new Map<number, EvaluacionProgramadaSeccion[]>(
                        items.map((item) => [item.evaluacion.id, item.secciones])
                    );
                    this.allEvaluaciones = items.map((item) => item.evaluacion);
                    this.evaluacionSecciones = seccionesMap;
                    this.buildTreeData(items.map((item) => item.evaluacion), seccionesMap);
                },
                error: (error) => {
                    this.resetEvaluaciones();
                    this.snackBar.open(error.message ?? fallbackErrorMessage, 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    private resetEvaluaciones(): void {
        this.allEvaluaciones = [];
        this.evaluacionSecciones = new Map();
        this.treeDataSource.data = [];
    }

    private buildDefaultDateRange(): { start: Date; end: Date } {
        const today = DateTime.now().startOf('day');
        const start = today.minus({ days: 7 });

        return {
            start: start.toJSDate(),
            end: today.toJSDate(),
        };
    }

    private toIsoDate(value: Date | null): string | null {
        if (!value) {
            return null;
        }

        const date = DateTime.fromJSDate(value).startOf('day');
        if (!date.isValid) {
            return null;
        }

        return date.toISODate();
    }

    private buildTreeData(
        evaluaciones: EvaluacionProgramada[],
        seccionesMap: Map<number, EvaluacionProgramadaSeccion[]>
    ): void {
        const nodes: EvaluacionTreeNode[] = evaluaciones.map((evaluacion): EvaluacionTreeNode => {
            const sede = this.getSedeNombre(evaluacion.sedeId);
            const ciclo = this.getCicloNombre(evaluacion.cicloId);
            const tipo = this.getTipoEvaluacionNombre(evaluacion.tipoEvaluacionId);
            const carrera = this.getCarreraNombre(evaluacion.carreraId);
            const fecha = this.formatFechaLabel(evaluacion.fechaInicio);
            const horario = `${this.formatHora(evaluacion.horaInicio)} – ${this.formatHora(evaluacion.horaFin)}`;
            const secciones = seccionesMap.get(evaluacion.id) ?? [];

            const children: EvaluacionTreeNode[] = secciones.length
                ? secciones.map<EvaluacionTreeNode>((seccion) => {
                      const seccionNombre = this.getSeccionNombre(seccion.seccionId);
                      const isActivo = Boolean(seccion.activo);

                      return {
                          id: `seccion-${evaluacion.id}-${seccion.id}`,
                          title: seccionNombre,
                          subtitleLines: [],
                          status: 'default',
                          trailingIcon: {
                              name: isActivo ? 'check_circle' : 'cancel',
                              classes: [
                                  isActivo
                                      ? 'tree-node__status-icon--active'
                                      : 'tree-node__status-icon--inactive',
                              ],
                              tooltip: isActivo ? 'Activo' : 'Inactivo',
                              ariaLabel: `Estado ${isActivo ? 'activo' : 'inactivo'}`,
                          },
                      };
                  })
                : [
                      {
                          id: `seccion-empty-${evaluacion.id}`,
                          title: 'No hay secciones registradas',
                          subtitleLines: [],
                          status: 'info',
                          leadingIcon: {
                              name: 'info',
                              classes: ['tree-node__bullet--info'],
                              tooltip: 'No hay secciones registradas para esta evaluación',
                              ariaLabel: 'Sin secciones registradas',
                          },
                      } satisfies EvaluacionTreeNode,
                  ];

            const details: EvaluacionTreeNodeDetail[] = [
                { label: 'Fecha', value: fecha },
                { label: 'Tipo', value: tipo },
                { label: 'Horario', value: horario },
                { label: 'Sede', value: sede },
                { label: 'Ciclo', value: ciclo },
                carrera ? { label: 'Carrera', value: carrera } : null,
                { label: 'Estado', value: evaluacion.activo ? 'Activo' : 'Inactivo' },
            ].filter((detail): detail is EvaluacionTreeNodeDetail => !!detail && detail.value.trim().length > 0);

            return {
                id: `evaluacion-${evaluacion.id}`,
                title: evaluacion.nombre,
                subtitleLines: [],
                status: 'default',
                evaluacionId: evaluacion.id,
                children,
                details,
            };
        });

        this.treeControl.dataNodes = nodes;
        this.treeDataSource.data = nodes;
        queueMicrotask(() => this.treeControl.expandAll());
    }

    private formatFechaLabel(value: string): string {
        const date = DateTime.fromISO(value, { zone: 'utc' });
        if (date.isValid) {
            return date.setLocale('es').toLocaleString(DateTime.DATE_FULL);
        }

        return value;
    }

    private formatHora(value: string): string {
        if (!value) {
            return '';
        }

        const normalized = value.length === 5 ? `${value}:00` : value;
        const time = DateTime.fromFormat(normalized, 'HH:mm:ss');

        if (time.isValid) {
            return time.toFormat('HH:mm');
        }

        return value;
    }

    private getSedeNombre(id: number): string {
        return this.sedes.find((sede) => sede.id === id)?.nombre ?? `Sede #${id}`;
    }

    private getCicloNombre(id: number | null): string {
        if (id === null || id === undefined) {
            return 'Sin ciclo asignado';
        }

        return this.ciclos.find((ciclo) => ciclo.id === id)?.nombre ?? `Ciclo #${id}`;
    }

    private getTipoEvaluacionNombre(id: number): string {
        return (
            this.tiposEvaluacion.find((tipo) => tipo.id === id)?.nombre ?? `Tipo de evaluación #${id}`
        );
    }

    private getCarreraNombre(id: number | null): string {
        if (id === null || id === undefined) {
            return '';
        }

        return this.carreras.find((carrera) => carrera.id === id)?.nombre ?? `Carrera #${id}`;
    }

    private getSeccionNombre(id: number | null): string {
        if (id === null || id === undefined) {
            return 'Sección sin asignar';
        }

        return this.secciones.find((seccion) => seccion.id === id)?.nombre ?? `Sección #${id}`;
    }

    private openProgramacionDialog(evaluacion?: EvaluacionProgramada | null): void {
        blurActiveElement();

        void import('./evaluacion-programada-dialog/evaluacion-programada-dialog.component').then(
            ({ EvaluacionProgramadaDialogComponent }) => {
                const existingProgramaciones = this.allEvaluaciones
                    .filter((item) => !evaluacion || item.id !== evaluacion.id)
                    .map((item) => ({
                        fechaInicio: item.fechaInicio,
                        cicloId: item.cicloId ?? null,
                    }));

                const secciones = evaluacion ? this.evaluacionSecciones.get(evaluacion.id) ?? [] : [];

                const data: EvaluacionProgramadaDialogData = {
                    mode: evaluacion ? 'edit' : 'create',
                    existingProgramaciones,
                    evaluacion: evaluacion ?? null,
                    secciones,
                };

                const dialogRef = this.dialog.open(
                    EvaluacionProgramadaDialogComponent,
                    {
                        width: '720px',
                        disableClose: true,
                        data,
                    }
                );

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: EvaluacionProgramadaDialogResult | null) => {
                        if (!result) {
                            return;
                        }

                        if (result.action === 'created' || result.action === 'updated') {
                            this.handlePostSave(result.evaluacion.fechaInicio);

                            this.snackBar.open(
                                result.action === 'created'
                                    ? 'La evaluación programada se registró correctamente.'
                                    : 'La evaluación programada se actualizó correctamente.',
                                'Cerrar',
                                {
                                    duration: 4000,
                                }
                            );
                        }
                    });
            }
        );
    }

    private handlePostSave(fechaInicio: string): void {
        const fecha = DateTime.fromISO(fechaInicio).startOf('day');
        if (!fecha.isValid) {
            return;
        }

        const mode = this.modeControl.value;
        const targetDate = fecha.toJSDate();

        if (mode === EVALUACION_SEARCH_MODE.Date) {
            const currentDateIso = this.toIsoDate(this.dateControl.value ?? null);
            const newDateIso = fecha.toISODate();

            if (currentDateIso !== newDateIso) {
                this.dateControl.setValue(targetDate, { emitEvent: true });
                return;
            }

            this.triggerFilter(true);
            return;
        }

        const currentStart = this.rangeStartControl.value
            ? DateTime.fromJSDate(this.rangeStartControl.value).startOf('day')
            : null;
        const currentEnd = this.rangeEndControl.value
            ? DateTime.fromJSDate(this.rangeEndControl.value).startOf('day')
            : null;

        if (!currentStart || !currentEnd || fecha < currentStart || fecha > currentEnd) {
            this.rangeGroup.setValue(
                {
                    start: targetDate,
                    end: targetDate,
                },
                { emitEvent: true }
            );
            return;
        }

        this.triggerFilter(true);
    }

}
