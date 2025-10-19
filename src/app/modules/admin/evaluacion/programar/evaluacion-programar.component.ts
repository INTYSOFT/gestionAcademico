import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
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
import {
    BehaviorSubject,
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

interface EvaluacionTreeNode {
    id: string;
    title: string;
    subtitleLines: string[];
    status: 'default' | 'info';
    evaluacionId?: number;
    children?: EvaluacionTreeNode[];
    details?: EvaluacionTreeNodeDetail[];
}

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
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
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
        MatTreeModule,
    ],
})
export class EvaluacionProgramarComponent implements OnInit, OnDestroy {
    protected readonly dateRangeForm = this.fb.group(
        {
            start: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
            end: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
        },
        {
            validators: validateDateRange,
        }
    );
    protected readonly isLoadingEvaluaciones$ = new BehaviorSubject<boolean>(false);

    protected readonly treeControl = new NestedTreeControl<EvaluacionTreeNode>((node) => node.children ?? []);
    protected readonly treeDataSource = new MatTreeNestedDataSource<EvaluacionTreeNode>();

    protected readonly hasChild = (_: number, node: EvaluacionTreeNode): boolean =>
        Array.isArray(node.children) && node.children.length > 0;

    private readonly destroy$ = new Subject<void>();

    private allEvaluaciones: EvaluacionProgramada[] = [];
    private evaluacionSecciones = new Map<number, EvaluacionProgramadaSeccion[]>();
    private currentRangeKey: string | null = null;

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
        this.dateRangeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(({ start, end }) => {
            this.handleDateRangeChange(start, end);
        });

        const defaultRange = this.buildDefaultDateRange();
        this.dateRangeForm.setValue(defaultRange);
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

    private handleDateRangeChange(start: Date | null, end: Date | null): void {
        if (!start || !end) {
            this.currentRangeKey = null;
            this.resetEvaluaciones();
            return;
        }

        if (this.dateRangeForm.invalid) {
            this.currentRangeKey = null;
            this.resetEvaluaciones();
            return;
        }

        const desde = this.toIsoDate(start);
        const hasta = this.toIsoDate(end);

        if (!desde || !hasta) {
            this.currentRangeKey = null;
            this.resetEvaluaciones();
            return;
        }

        const rangeKey = `${desde}_${hasta}`;
        if (rangeKey === this.currentRangeKey) {
            return;
        }

        this.currentRangeKey = rangeKey;
        this.loadEvaluacionesPorFechaRango(desde, hasta);
    }

    private loadEvaluacionesPorFechaRango(fechaDesde: string, fechaHasta: string): void {
        this.isLoadingEvaluaciones$.next(true);

        this.evaluacionProgramadasService
            .listByFechaInicioRange(fechaDesde, fechaHasta)
            .pipe(
                switchMap((evaluaciones) => {
                    if (!evaluaciones.length) {
                        this.evaluacionSecciones = new Map();
                        return of([] as { evaluacion: EvaluacionProgramada; secciones: EvaluacionProgramadaSeccion[] }[]);
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
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las programaciones de la fecha.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
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
                      const estado = seccion.activo ? 'Activo' : 'Inactivo';
                      return {
                          id: `seccion-${evaluacion.id}-${seccion.id}`,
                          title: seccionNombre,
                          subtitleLines: [
                              `Sección ciclo ID: ${seccion.seccionCicloId}`,
                              `Estado: ${estado}`,
                          ],
                          status: seccion.activo ? 'default' : 'info',
                      };
                  })
                : [
                      {
                          id: `seccion-empty-${evaluacion.id}`,
                          title: 'No hay secciones registradas',
                          subtitleLines: [],
                          status: 'info',
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
                const existingFechas = Array.from(
                    new Set(
                        this.allEvaluaciones
                            .filter((item) => !evaluacion || item.id !== evaluacion.id)
                            .map((item) => item.fechaInicio)
                    )
                );

                const secciones = evaluacion ? this.evaluacionSecciones.get(evaluacion.id) ?? [] : [];

                const data: EvaluacionProgramadaDialogData = {
                    mode: evaluacion ? 'edit' : 'create',
                    existingFechas,
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
                            this.handlePostSaveRange(result.evaluacion.fechaInicio);

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

    private handlePostSaveRange(fechaInicio: string): void {
        const fecha = DateTime.fromISO(fechaInicio).startOf('day');
        if (!fecha.isValid) {
            return;
        }

        const currentStart = this.dateRangeForm.value.start
            ? DateTime.fromJSDate(this.dateRangeForm.value.start).startOf('day')
            : null;
        const currentEnd = this.dateRangeForm.value.end
            ? DateTime.fromJSDate(this.dateRangeForm.value.end).startOf('day')
            : null;

        if (!currentStart || !currentEnd || fecha < currentStart || fecha > currentEnd) {
            this.dateRangeForm.setValue(
                {
                    start: fecha.toJSDate(),
                    end: fecha.toJSDate(),
                },
                { emitEvent: true }
            );
            return;
        }

        const desde = this.toIsoDate(this.dateRangeForm.value.start ?? null);
        const hasta = this.toIsoDate(this.dateRangeForm.value.end ?? null);
        if (!desde || !hasta) {
            return;
        }

        this.loadEvaluacionesPorFechaRango(desde, hasta);
    }

}
