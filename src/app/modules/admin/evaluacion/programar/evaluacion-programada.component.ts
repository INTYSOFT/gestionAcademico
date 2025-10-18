import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { BehaviorSubject, Subject, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { EvaluacionProgramadaService } from 'app/core/services/centro-estudios/evaluacion-programada.service';
import { EvaluacionProgramadaSeccionService } from 'app/core/services/centro-estudios/evaluacion-programada-seccion.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { EvaluacionProgramadaFormDialogData,
    EvaluacionProgramadaFormDialogResult,
} from './evaluacion-programada-form-dialog/evaluacion-programada-form-dialog.component';

interface ProgramacionTreeNode {
    label: string;
    children?: ProgramacionTreeNode[];
}

interface EvaluacionProgramadaSeccionView extends EvaluacionProgramadaSeccion {
    seccionNombre: string | null;
}

interface EvaluacionProgramadaView extends EvaluacionProgramada {
    sedeNombre: string | null;
    cicloNombre: string | null;
    tipoEvaluacionNombre: string | null;
    secciones: EvaluacionProgramadaSeccionView[];
    treeControl: NestedTreeControl<ProgramacionTreeNode>;
    treeDataSource: MatTreeNestedDataSource<ProgramacionTreeNode>;
}

@Component({
    selector: 'app-evaluacion-programada',
    standalone: true,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        NgClass,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatListModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatTreeModule,
    ],
    templateUrl: './evaluacion-programada.component.html',
    styleUrls: ['./evaluacion-programada.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionProgramadaComponent implements OnInit, OnDestroy {
    protected readonly fechas$ = new BehaviorSubject<string[]>([]);
    protected readonly selectedFecha$ = new BehaviorSubject<string | null>(null);
    protected readonly programaciones$ = new BehaviorSubject<EvaluacionProgramadaView[]>([]);
    protected readonly isLoadingFechas$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingProgramaciones$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();
    private sedes: Sede[] = [];
    private ciclos: Ciclo[] = [];
    private tiposEvaluacion: TipoEvaluacion[] = [];
    private secciones: Seccion[] = [];

    constructor(
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionProgramadaService: EvaluacionProgramadaService,
        private readonly evaluacionProgramadaSeccionService: EvaluacionProgramadaSeccionService,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService,
        private readonly seccionesService: SeccionesService
    ) {}

    ngOnInit(): void {
        this.loadReferenceData();

        this.selectedFecha$
            .pipe(takeUntil(this.destroy$))
            .subscribe((fecha) => {
                if (fecha) {
                    this.loadProgramaciones(fecha);
                } else {
                    this.programaciones$.next([]);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected trackByFecha(index: number, fecha: string): string {
        return fecha;
    }

    protected trackByProgramacion(index: number, programacion: EvaluacionProgramadaView): number {
        return programacion.id;
    }

    protected isFechaSeleccionada(fecha: string, seleccionada: string | null): boolean {
        return seleccionada === fecha;
    }

    protected seleccionarFecha(fecha: string): void {
        if (this.selectedFecha$.value !== fecha) {
            this.selectedFecha$.next(fecha);
        }
    }

    protected crearProgramacion(): void {
        this.abrirDialogoProgramacion();
    }

    protected editarProgramacion(programacion: EvaluacionProgramadaView): void {
        this.abrirDialogoProgramacion(programacion);
    }

    protected hasChild = (_: number, node: ProgramacionTreeNode): boolean =>
        Array.isArray(node.children) && node.children.length > 0;

    private loadReferenceData(): void {
        forkJoin({
            sedes: this.sedeService.getSedes().pipe(catchError(() => of([]))),
            ciclos: this.ciclosService.listAll().pipe(catchError(() => of([]))),
            tiposEvaluacion: this.tipoEvaluacionesService.listAll().pipe(catchError(() => of([]))),
            secciones: this.seccionesService.list().pipe(catchError(() => of([]))),
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ sedes, ciclos, tiposEvaluacion, secciones }) => {
                    this.sedes = sedes;
                    this.ciclos = ciclos;
                    this.tiposEvaluacion = tiposEvaluacion;
                    this.secciones = secciones;
                    this.cargarFechas();
                },
                error: (error) => {
                    this.mostrarError(
                        error?.message || 'Ocurrió un error al cargar la información inicial.'
                    );
                },
            });
    }

    private cargarFechas(fechaASeleccionar?: string): void {
        this.isLoadingFechas$.next(true);
        this.evaluacionProgramadaService
            .listAll()
            .pipe(
                finalize(() => this.isLoadingFechas$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (evaluaciones) => {
                    const fechasUnicas = Array.from(
                        new Set(
                            evaluaciones
                                .map((evaluacion) => evaluacion.fechaInicio)
                                .filter((fecha): fecha is string => !!fecha)
                        )
                    ).sort((a, b) => this.compareFechasDesc(a, b));

                    this.fechas$.next(fechasUnicas);

                    const fechaActual = fechaASeleccionar ?? this.selectedFecha$.value;
                    const fechaSeleccionada = fechaActual && fechasUnicas.includes(fechaActual)
                        ? fechaActual
                        : fechasUnicas[0] ?? null;

                    if (fechaSeleccionada !== this.selectedFecha$.value) {
                        this.selectedFecha$.next(fechaSeleccionada);
                    } else if (!fechaSeleccionada) {
                        this.programaciones$.next([]);
                    }
                },
                error: (error) => {
                    this.mostrarError(
                        error?.message || 'No fue posible cargar las fechas de evaluación programada.'
                    );
                },
            });
    }

    private loadProgramaciones(fecha: string): void {
        this.isLoadingProgramaciones$.next(true);
        this.evaluacionProgramadaService
            .listByFechaInicio(fecha)
            .pipe(
                switchMap((evaluaciones) => {
                    if (!evaluaciones.length) {
                        return of([]);
                    }

                    return forkJoin(
                        evaluaciones.map((evaluacion) =>
                            this.evaluacionProgramadaSeccionService
                                .listByEvaluacionProgramada(evaluacion.id)
                                .pipe(
                                    catchError(() => of([])),
                                    map((secciones) => ({ evaluacion, secciones }))
                                )
                        )
                    );
                }),
                map((resultados) => {
                    if (!Array.isArray(resultados) || resultados.length === 0) {
                        return [];
                    }

                    return resultados
                        .map((resultado) =>
                            this.construirProgramacionView(
                                resultado.evaluacion,
                                resultado.secciones
                            )
                        )
                        .filter((programacion): programacion is EvaluacionProgramadaView => programacion !== null);
                }),
                finalize(() => this.isLoadingProgramaciones$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (programaciones) => {
                    this.programaciones$.next(programaciones);
                },
                error: (error) => {
                    this.mostrarError(
                        error?.message || 'No fue posible cargar las evaluaciones programadas.'
                    );
                    this.programaciones$.next([]);
                },
            });
    }

    private construirProgramacionView(
        evaluacion: EvaluacionProgramada,
        secciones: EvaluacionProgramadaSeccion[]
    ): EvaluacionProgramadaView | null {
        const sedeNombre = this.sedes.find((sede) => sede.id === evaluacion.sedeId)?.nombre ?? null;
        const cicloNombre = evaluacion.cicloId
            ? this.ciclos.find((ciclo) => ciclo.id === evaluacion.cicloId)?.nombre ?? null
            : null;
        const tipoEvaluacionNombre =
            this.tiposEvaluacion.find((tipo) => tipo.id === evaluacion.tipoEvaluacionId)?.nombre ?? null;

        const seccionesView: EvaluacionProgramadaSeccionView[] = secciones.map((seccion) => ({
            ...seccion,
            seccionNombre: seccion.seccionId
                ? this.secciones.find((item) => item.id === seccion.seccionId)?.nombre ?? null
                : null,
        }));

        const treeData = this.construirNodosArbol(evaluacion, seccionesView, {
            sedeNombre,
            cicloNombre,
            tipoEvaluacionNombre,
        });

        const treeControl = new NestedTreeControl<ProgramacionTreeNode>((node) => node.children ?? []);
        const treeDataSource = new MatTreeNestedDataSource<ProgramacionTreeNode>();
        treeDataSource.data = treeData;

        return {
            ...evaluacion,
            sedeNombre,
            cicloNombre,
            tipoEvaluacionNombre,
            secciones: seccionesView,
            treeControl,
            treeDataSource,
        };
    }

    private construirNodosArbol(
        evaluacion: EvaluacionProgramada,
        secciones: EvaluacionProgramadaSeccionView[],
        nombres: {
            sedeNombre: string | null;
            cicloNombre: string | null;
            tipoEvaluacionNombre: string | null;
        }
    ): ProgramacionTreeNode[] {
        const horario = `${this.formatearHora(evaluacion.horaInicio)} – ${this.formatearHora(
            evaluacion.horaFin
        )}`;

        const seccionNodes = secciones.map<ProgramacionTreeNode>((seccion) => ({
            label:
                seccion.seccionNombre ??
                `Sección ${seccion.seccionId ?? seccion.seccionCicloId}`,
            children: [
                { label: `Sección ciclo: ${seccion.seccionCicloId}` },
                { label: `Activo: ${seccion.activo ? 'Sí' : 'No'}` },
            ],
        }));

        const seccionesChildren = seccionNodes.length
            ? seccionNodes
            : [{ label: 'Sin secciones asociadas' }];

        const rootNode: ProgramacionTreeNode = {
            label: evaluacion.nombre,
            children: [
                { label: `Sede: ${nombres.sedeNombre ?? 'No asignada'}` },
                { label: `Ciclo: ${nombres.cicloNombre ?? 'No asignado'}` },
                { label: `Tipo de evaluación: ${nombres.tipoEvaluacionNombre ?? 'No asignado'}` },
                { label: `Horario: ${horario}` },
                { label: 'Secciones', children: seccionesChildren },
            ],
        };

        return [rootNode];
    }

    private abrirDialogoProgramacion(programacion?: EvaluacionProgramadaView | null): void {
        void import('./evaluacion-programada-form-dialog/evaluacion-programada-form-dialog.component').then(
            ({ EvaluacionProgramadaFormDialogComponent }) => {
                const data: EvaluacionProgramadaFormDialogData = {
                    evaluacion: programacion ?? null,
                    evaluacionSecciones: programacion?.secciones ?? [],
                    existingFechas: this.fechas$.value,
                    sedes: this.sedes,
                    ciclos: this.ciclos,
                    tiposEvaluacion: this.tiposEvaluacion,
                    secciones: this.secciones,
                    selectedFecha: this.selectedFecha$.value,
                };

                const dialogRef = this.dialog.open(EvaluacionProgramadaFormDialogComponent, {
                    width: '720px',
                    disableClose: true,
                    data,
                });

                dialogRef
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((result?: EvaluacionProgramadaFormDialogResult | null) => {
                        if (!result || !result.evaluacion) {
                            return;
                        }

                        const fechaSeleccionar = result.evaluacion.fechaInicio;
                        this.cargarFechas(fechaSeleccionar);
                        this.mostrarMensaje(
                            result.action === 'created'
                                ? 'Evaluación programada creada correctamente.'
                                : 'Evaluación programada actualizada correctamente.'
                        );
                    });
            }
        );
    }

    private mostrarMensaje(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
        });
    }

    private mostrarError(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 6000,
            panelClass: ['mat-mdc-snack-bar-container-error'],
            horizontalPosition: 'end',
            verticalPosition: 'top',
        });
    }

    private compareFechasDesc(a: string, b: string): number {
        const fechaA = DateTime.fromISO(a, { zone: 'utc' });
        const fechaB = DateTime.fromISO(b, { zone: 'utc' });

        return fechaB.toMillis() - fechaA.toMillis();
    }

    private formatearHora(valor: string | null | undefined): string {
        if (!valor) {
            return '—';
        }

        const partes = valor.split(':');
        if (partes.length < 2) {
            return valor;
        }

        return `${partes[0]}:${partes[1]}`;
    }
}
