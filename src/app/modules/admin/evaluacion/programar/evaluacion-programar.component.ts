import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
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

interface FechaOption {
    value: string;
    label: string;
}

interface EvaluacionTreeNode {
    id: string;
    title: string;
    subtitleLines: string[];
    status: 'default' | 'info';
    evaluacionId?: number;
    children?: EvaluacionTreeNode[];
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
        MatProgressSpinnerModule,
        MatRadioModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatTreeModule,
    ],
})
export class EvaluacionProgramarComponent implements OnInit, OnDestroy {
    protected readonly selectedFechaControl = this.fb.control<string | null>(null);

    protected readonly fechaOptions$ = new BehaviorSubject<FechaOption[]>([]);
    protected readonly isLoadingFechas$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingEvaluaciones$ = new BehaviorSubject<boolean>(false);

    protected readonly treeControl = new NestedTreeControl<EvaluacionTreeNode>((node) => node.children ?? []);
    protected readonly treeDataSource = new MatTreeNestedDataSource<EvaluacionTreeNode>();

    protected readonly hasChild = (_: number, node: EvaluacionTreeNode): boolean =>
        Array.isArray(node.children) && node.children.length > 0;

    private readonly destroy$ = new Subject<void>();

    private allEvaluaciones: EvaluacionProgramada[] = [];
    private evaluacionSecciones = new Map<number, EvaluacionProgramadaSeccion[]>();

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
        this.reloadData();

        this.selectedFechaControl.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((fecha) => {
                if (!fecha) {
                    this.treeDataSource.data = [];
                    return;
                }

                this.loadEvaluacionesPorFecha(fecha);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected formatSelectedFecha(fecha: string | null): string {
        if (!fecha) {
            return '';
        }

        return this.formatFechaLabel(fecha);
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

    private reloadData(selectFecha?: string): void {
        this.isLoadingFechas$.next(true);

        this.evaluacionProgramadasService
            .listAll()
            .pipe(
                finalize(() => this.isLoadingFechas$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (evaluaciones) => {
                    this.allEvaluaciones = evaluaciones;
                    this.updateFechaOptions(selectFecha);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las evaluaciones programadas.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    private updateFechaOptions(selectFecha?: string): void {
        const options = this.buildFechaOptions(this.allEvaluaciones);
        this.fechaOptions$.next(options);

        const current = this.selectedFechaControl.value;
        const targetFecha = selectFecha ?? current ?? options[0]?.value ?? null;

        if (targetFecha && options.some((option) => option.value === targetFecha)) {
            if (targetFecha !== current) {
                this.selectedFechaControl.setValue(targetFecha);
                return;
            }

            this.loadEvaluacionesPorFecha(targetFecha);
        } else {
            this.selectedFechaControl.setValue(null, { emitEvent: false });
            this.treeDataSource.data = [];
        }
    }

    private loadEvaluacionesPorFecha(fecha: string): void {
        this.isLoadingEvaluaciones$.next(true);

        this.evaluacionProgramadasService
            .listByFechaInicio(fecha)
            .pipe(
                switchMap((evaluaciones) => {
                    const evaluacionesMap = new Map<number, EvaluacionProgramada>();
                    evaluaciones.forEach((item) => evaluacionesMap.set(item.id, item));
                    this.allEvaluaciones = this.mergeEvaluaciones(this.allEvaluaciones, evaluaciones);

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
                    this.evaluacionSecciones = seccionesMap;
                    this.buildTreeData(items.map((item) => item.evaluacion), seccionesMap);
                },
                error: (error) => {
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

    private buildTreeData(
        evaluaciones: EvaluacionProgramada[],
        seccionesMap: Map<number, EvaluacionProgramadaSeccion[]>
    ): void {
        const nodes: EvaluacionTreeNode[] = evaluaciones.map((evaluacion) => {
            const sede = this.getSedeNombre(evaluacion.sedeId);
            const ciclo = this.getCicloNombre(evaluacion.cicloId);
            const tipo = this.getTipoEvaluacionNombre(evaluacion.tipoEvaluacionId);
            const carrera = this.getCarreraNombre(evaluacion.carreraId);
            const fecha = this.formatFechaLabel(evaluacion.fechaInicio);
            const horario = `${this.formatHora(evaluacion.horaInicio)} – ${this.formatHora(evaluacion.horaFin)}`;
            const secciones = seccionesMap.get(evaluacion.id) ?? [];

            const children = secciones.length
                ? secciones.map((seccion) => {
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
                      } satisfies EvaluacionTreeNode;
                  })
                : [
                      {
                          id: `seccion-empty-${evaluacion.id}`,
                          title: 'No hay secciones registradas',
                          subtitleLines: [],
                          status: 'info',
                      },
                  ];

            const subtitleLines = [
                `Fecha: ${fecha}`,
                `Tipo: ${tipo}`,
                `Horario: ${horario}`,
                `Sede: ${sede}`,
                `Ciclo: ${ciclo}`,
                carrera ? `Carrera: ${carrera}` : null,
                `Estado: ${evaluacion.activo ? 'Activo' : 'Inactivo'}`,
            ].filter((line): line is string => !!line);

            return {
                id: `evaluacion-${evaluacion.id}`,
                title: evaluacion.nombre,
                subtitleLines,
                status: 'default',
                evaluacionId: evaluacion.id,
                children,
            } satisfies EvaluacionTreeNode;
        });

        this.treeControl.dataNodes = nodes;
        this.treeDataSource.data = nodes;
        queueMicrotask(() => this.treeControl.expandAll());
    }

    private buildFechaOptions(evaluaciones: EvaluacionProgramada[]): FechaOption[] {
        const unique = new Map<string, string>();

        evaluaciones.forEach((evaluacion) => {
            const fecha = evaluacion.fechaInicio?.trim();
            if (!fecha || unique.has(fecha)) {
                return;
            }

            unique.set(fecha, this.formatFechaLabel(fecha));
        });

        return Array.from(unique.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => this.compareDatesDesc(a.value, b.value));
    }

    private compareDatesDesc(a: string, b: string): number {
        const dateA = DateTime.fromISO(a, { zone: 'utc' });
        const dateB = DateTime.fromISO(b, { zone: 'utc' });

        if (dateA.isValid && dateB.isValid) {
            return dateB.toMillis() - dateA.toMillis();
        }

        return b.localeCompare(a);
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

    private mergeEvaluaciones(
        existing: EvaluacionProgramada[],
        incoming: EvaluacionProgramada[]
    ): EvaluacionProgramada[] {
        const map = new Map<number, EvaluacionProgramada>();
        existing.forEach((evaluacion) => map.set(evaluacion.id, evaluacion));
        incoming.forEach((evaluacion) => map.set(evaluacion.id, evaluacion));
        return Array.from(map.values());
    }

    private openProgramacionDialog(evaluacion?: EvaluacionProgramada | null): void {
        blurActiveElement();

        void import('./evaluacion-programada-dialog/evaluacion-programada-dialog.component').then(
            ({ EvaluacionProgramadaDialogComponent }) => {
                const existingFechas = this.fechaOptions$
                    .value.map((option) => option.value)
                    .filter((fecha) => !evaluacion || fecha !== evaluacion.fechaInicio);

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
                            this.reloadData(result.evaluacion.fechaInicio);

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
}
