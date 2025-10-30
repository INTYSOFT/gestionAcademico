import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GridApi,
    GridReadyEvent,
    SizeColumnsToFitGridStrategy,
    ValueFormatterParams,
} from 'ag-grid-community';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, startWith, switchMap, tap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { EstadoEvaluacionProgramada } from 'app/core/models/centro-estudios/estado-evaluacion-programada.model';
import { EvaluacionProgramadaConsulta } from 'app/core/models/centro-estudios/evaluacion-programada-consulta.model';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { EstadoEvaluacionProgramadaService } from 'app/core/services/centro-estudios/estado-evaluacion-programada.service';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaConsultasService } from 'app/core/services/centro-estudios/evaluacion-programada-consultas.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';

const FECHA_MODO = {
    Unica: 'single',
    Rango: 'range',
} as const;

type FechaModo = (typeof FECHA_MODO)[keyof typeof FECHA_MODO];

type FechaRangoValor = { start: Date | null; end: Date | null };

interface EvaluacionProgramadaAlumnoRow {
    evaluacionProgramadaId: number;
    evaluacionId: number;
    evaluacionNombre: string;
    estadoNombre: string;
    fechaInicioIso: string;
    fechaInicioFormateada: string;
    horario: string;
    sede: string;
    ciclo: string;
    seccion: string;
    alumnoDocumento: string;
    alumnoApellidos: string;
    alumnoNombres: string;
    alumnoCelular: string;
}

function requireDateRange(control: AbstractControl<FechaRangoValor | null>): ValidationErrors | null {
    const value = control.value;
    if (!value) {
        return { required: true };
    }

    const { start, end } = value;
    if (!start || !end) {
        return { required: true };
    }

    return null;
}

function validateDateRange(control: AbstractControl<FechaRangoValor | null>): ValidationErrors | null {
    const value = control.value;
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
    selector: 'app-reportes-evaluaciones-programadas',
    standalone: true,
    templateUrl: './evaluaciones-programadas.component.html',
    styleUrls: ['./evaluaciones-programadas.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatOptionModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonToggleModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        AgGridAngular,
    ],
})
export class ReporteEvaluacionesProgramadasComponent {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly snackBar = inject(MatSnackBar);
    private readonly estadoService = inject(EstadoEvaluacionProgramadaService);
    private readonly evaluacionProgramadasService = inject(EvaluacionProgramadasService);
    private readonly consultasService = inject(EvaluacionProgramadaConsultasService);
    private readonly ciclosService = inject(CiclosService);

    protected readonly filtrosForm = this.fb.group({
        estadoId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        fechaModo: this.fb.nonNullable.control<FechaModo>(FECHA_MODO.Unica),
        fechaUnica: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
        cicloId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        fechaRango: this.fb.group(
            {
                start: this.fb.control<Date | null>(null),
                end: this.fb.control<Date | null>(null),
            },
            { validators: [requireDateRange, validateDateRange] }
        ),
        evaluacionProgramadaId: this.fb.control<number | null>({ value: null, disabled: true }),
    });

    protected readonly estados$ = new BehaviorSubject<EstadoEvaluacionProgramada[]>([]);
    protected readonly estaCargandoEstados$ = new BehaviorSubject<boolean>(false);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly estaCargandoCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly evaluacionesProgramadas$ = new BehaviorSubject<EvaluacionProgramada[]>([]);
    protected readonly estaCargandoProgramaciones$ = new BehaviorSubject<boolean>(false);
    protected readonly estaCargandoResultados$ = new BehaviorSubject<boolean>(false);
    protected readonly filas$ = new BehaviorSubject<EvaluacionProgramadaAlumnoRow[]>([]);

    protected readonly totalFilas$ = this.filas$.pipe(map((filas) => filas.length));

    protected readonly evaluacionSeleccionadaId$ = this.filtrosForm.controls.evaluacionProgramadaId.valueChanges.pipe(
        startWith(this.filtrosForm.controls.evaluacionProgramadaId.value)
    );

    protected readonly mostrarSinDatos$ = combineLatest([
        this.estaCargandoResultados$,
        this.estaCargandoProgramaciones$,
        this.filas$,
        this.evaluacionSeleccionadaId$,
    ]).pipe(
        map(
            ([cargandoResultados, cargandoProgramaciones, filas, evaluacionId]) =>
                !cargandoResultados && !cargandoProgramaciones && evaluacionId !== null && filas.length === 0
        )
    );

    protected readonly fechaModoOpciones: ReadonlyArray<{
        valor: FechaModo;
        etiqueta: string;
        icono: string;
    }> = [
        { valor: FECHA_MODO.Unica, etiqueta: 'Fecha específica', icono: 'event' },
        { valor: FECHA_MODO.Rango, etiqueta: 'Rango de fechas', icono: 'event_range' },
    ];

    protected readonly columnas: ColDef<EvaluacionProgramadaAlumnoRow>[] = [
        {
            headerName: 'Evaluación',
            field: 'evaluacionNombre',
            minWidth: 220,
            wrapHeaderText: true,
            autoHeaderHeight: true,
        },
        {
            headerName: 'Estado',
            field: 'estadoNombre',
            minWidth: 160,
        },
        {
            headerName: 'Fecha',
            field: 'fechaInicioFormateada',
            minWidth: 180,
        },
        {
            headerName: 'Horario',
            field: 'horario',
            minWidth: 140,
        },
        {
            headerName: 'Sede',
            field: 'sede',
            minWidth: 180,
        },
        {
            headerName: 'Ciclo',
            field: 'ciclo',
            minWidth: 160,
        },
        {
            headerName: 'Sección',
            field: 'seccion',
            minWidth: 140,
        },
        {
            headerName: 'DNI',
            field: 'alumnoDocumento',
            minWidth: 140,
        },
        {
            headerName: 'Apellidos',
            field: 'alumnoApellidos',
            minWidth: 220,
        },
        {
            headerName: 'Nombres',
            field: 'alumnoNombres',
            minWidth: 220,
        },
        {
            headerName: 'Celular',
            field: 'alumnoCelular',
            minWidth: 160,
        },
    ];

    protected readonly configuracionColumnasPorDefecto: ColDef<EvaluacionProgramadaAlumnoRow> = {
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 120,
        suppressHeaderMenuButton: true,
        valueFormatter: ({ value }: ValueFormatterParams<EvaluacionProgramadaAlumnoRow, string>) =>
            typeof value === 'string' ? value : '',
    };

    protected readonly autoSizeStrategy: SizeColumnsToFitGridStrategy = {
        type: 'fitGridWidth',
    };

    private readonly estadosPorId = new Map<number, EstadoEvaluacionProgramada>();
    private readonly evaluacionesPorId = new Map<number, EvaluacionProgramada>();
    private gridApi?: GridApi<EvaluacionProgramadaAlumnoRow>;

    private readonly fechaLargaFormatter = new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit',
    });

    private readonly horaFormatter = new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
    });

    constructor() {
        this.configurarValidacionesIniciales();
        this.cargarEstados();
        this.cargarCiclos();
        this.suscribirseACambiosDeModo();
        this.suscribirseASeleccionDeEvaluacion();
    }

    protected manejarGridReady(evento: GridReadyEvent<EvaluacionProgramadaAlumnoRow>): void {
        this.gridApi = evento.api;
        evento.api.sizeColumnsToFit();
    }

    protected buscarEvaluaciones(): void {
        this.filtrosForm.markAllAsTouched();

        if (!this.filtrosForm.valid) {
            this.mostrarError('Completa los filtros requeridos para continuar.');
            return;
        }

        const estadoId = this.filtrosForm.controls.estadoId.value;
        const fechaModo = this.filtrosForm.controls.fechaModo.value;

        if (estadoId === null) {
            this.mostrarError('Selecciona un estado válido.');
            return;
        }

        this.limpiarProgramaciones();
        this.estaCargandoProgramaciones$.next(true);
        this.obtenerEvaluacionesSegunFiltro(estadoId, fechaModo)
            .pipe(
                finalize(() => this.estaCargandoProgramaciones$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (programaciones) => {
                    if (programaciones.length === 0) {
                        this.evaluacionesProgramadas$.next([]);
                        this.mostrarMensaje('No se encontraron evaluaciones programadas para los filtros indicados.');
                        return;
                    }

                    const evaluacionControl = this.filtrosForm.controls.evaluacionProgramadaId;
                    this.evaluacionesProgramadas$.next(programaciones);
                    programaciones.forEach((programacion) =>
                        this.evaluacionesPorId.set(programacion.id, programacion)
                    );

                    evaluacionControl.enable({ emitEvent: false });
                    if (programaciones.length === 1) {
                        evaluacionControl.setValue(programaciones[0].id);
                    } else {
                        evaluacionControl.setValue(null, { emitEvent: false });
                    }
                    evaluacionControl.markAsUntouched();
                    evaluacionControl.updateValueAndValidity({ emitEvent: false });
                },
                error: (error) => {
                    this.mostrarError('Ocurrió un error al obtener las evaluaciones programadas.', error);
                },
            });
    }

    protected limpiarFiltros(): void {
        this.filtrosForm.reset({
            estadoId: null,
            fechaModo: FECHA_MODO.Unica,
            fechaUnica: null,
            cicloId: null,
            fechaRango: { start: null, end: null },
            evaluacionProgramadaId: null,
        });
        this.filtrosForm.markAsPristine();
        this.filtrosForm.markAsUntouched();
        this.configurarValidacionesIniciales();
        this.limpiarProgramaciones();
    }

    private configurarValidacionesIniciales(): void {
        const { fechaUnica, fechaRango, cicloId, evaluacionProgramadaId } = this.filtrosForm.controls;
        fechaUnica.enable({ emitEvent: false });
        fechaUnica.setValidators([Validators.required]);
        fechaUnica.updateValueAndValidity({ emitEvent: false });

        fechaRango.disable({ emitEvent: false });
        fechaRango.updateValueAndValidity({ emitEvent: false });

        cicloId.enable({ emitEvent: false });
        cicloId.setValidators([Validators.required]);
        cicloId.updateValueAndValidity({ emitEvent: false });

        evaluacionProgramadaId.disable({ emitEvent: false });
        evaluacionProgramadaId.setValue(null, { emitEvent: false });
        evaluacionProgramadaId.updateValueAndValidity({ emitEvent: false });
    }

    private cargarEstados(): void {
        this.estaCargandoEstados$.next(true);
        this.estadoService
            .listAll()
            .pipe(
                map((estados) => estados.filter((estado) => estado.activo)),
                map((estados) => [...estados].sort((a, b) => a.orden - b.orden)),
                tap((estados) => {
                    this.estadosPorId.clear();
                    estados.forEach((estado) => this.estadosPorId.set(estado.id, estado));
                }),
                finalize(() => this.estaCargandoEstados$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (estados) => {
                    this.estados$.next(estados);
                },
                error: (error) => {
                    this.estados$.next([]);
                    this.mostrarError('No se pudieron cargar los estados de evaluación.', error);
                },
            });
    }

    private cargarCiclos(): void {
        this.estaCargandoCiclos$.next(true);
        this.ciclosService
            .listAll()
            .pipe(
                map((ciclos) => ciclos.filter((ciclo) => ciclo.activo)),
                map((ciclos) => [...ciclos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
                finalize(() => this.estaCargandoCiclos$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (ciclos) => {
                    this.ciclos$.next(ciclos);
                },
                error: (error) => {
                    this.ciclos$.next([]);
                    this.mostrarError('No se pudieron cargar los ciclos.', error);
                },
            });
    }

    private suscribirseACambiosDeModo(): void {
        this.filtrosForm.controls.fechaModo.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((modo) => {
                this.ajustarControlesSegunModo(modo);
                this.limpiarProgramaciones();
            });
    }

    private suscribirseASeleccionDeEvaluacion(): void {
        this.evaluacionSeleccionadaId$
            .pipe(
                switchMap((evaluacionId) => {
                    this.filas$.next([]);
                    this.ajustarColumnas();

                    if (evaluacionId === null) {
                        this.estaCargandoResultados$.next(false);
                        return of<EvaluacionProgramadaAlumnoRow[]>([]);
                    }

                    const evaluacion = this.evaluacionesPorId.get(evaluacionId);
                    if (!evaluacion) {
                        this.mostrarError('No se encontró la programación seleccionada.');
                        return of<EvaluacionProgramadaAlumnoRow[]>([]);
                    }

                    this.estaCargandoResultados$.next(true);

                    return this.consultasService.listByEvaluacionProgramadaId(evaluacionId).pipe(
                        map((consultas) =>
                            consultas.map((consulta) => this.crearFilaDesdeConsulta(consulta, evaluacion))
                        ),
                        map((filas) => this.ordenarFilas(filas)),
                        catchError((error: HttpErrorResponse | Error) => {
                            this.mostrarError('No se pudo obtener la lista de alumnos.', error);
                            return of<EvaluacionProgramadaAlumnoRow[]>([]);
                        }),
                        finalize(() => this.estaCargandoResultados$.next(false))
                    );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((filas) => {
                this.filas$.next(filas);
                this.ajustarColumnas();

                if (filas.length === 0 && this.filtrosForm.controls.evaluacionProgramadaId.value !== null) {
                    this.mostrarMensaje('No se encontraron alumnos para la programación seleccionada.');
                }
            });
    }

    private ajustarControlesSegunModo(modo: FechaModo): void {
        const { fechaUnica, fechaRango, cicloId } = this.filtrosForm.controls;

        if (modo === FECHA_MODO.Unica) {
            fechaRango.reset({ start: null, end: null }, { emitEvent: false });
            fechaRango.disable({ emitEvent: false });
            fechaUnica.enable({ emitEvent: false });
            fechaUnica.setValidators([Validators.required]);
            cicloId.enable({ emitEvent: false });
            cicloId.setValidators([Validators.required]);
        } else {
            fechaUnica.setValue(null, { emitEvent: false });
            fechaUnica.disable({ emitEvent: false });
            fechaUnica.clearValidators();
            fechaRango.enable({ emitEvent: false });
            cicloId.setValue(null, { emitEvent: false });
            cicloId.disable({ emitEvent: false });
            cicloId.clearValidators();
        }

        fechaUnica.updateValueAndValidity({ emitEvent: false });
        fechaRango.updateValueAndValidity({ emitEvent: false });
        cicloId.updateValueAndValidity({ emitEvent: false });
    }

    private limpiarProgramaciones(): void {
        const { evaluacionProgramadaId } = this.filtrosForm.controls;
        evaluacionProgramadaId.enable({ emitEvent: false });
        evaluacionProgramadaId.setValue(null);
        evaluacionProgramadaId.disable({ emitEvent: false });
        evaluacionProgramadaId.markAsPristine();
        evaluacionProgramadaId.markAsUntouched();
        evaluacionProgramadaId.updateValueAndValidity({ emitEvent: false });

        this.evaluacionesProgramadas$.next([]);
        this.evaluacionesPorId.clear();
        this.filas$.next([]);
        this.estaCargandoResultados$.next(false);
        this.ajustarColumnas();
    }

    private obtenerEvaluacionesSegunFiltro(
        estadoId: number,
        modo: FechaModo
    ): Observable<EvaluacionProgramada[]> {
        if (modo === FECHA_MODO.Unica) {
            const fecha = this.filtrosForm.controls.fechaUnica.value;
            const cicloId = this.filtrosForm.controls.cicloId.value;

            if (!fecha || cicloId === null) {
                return of([]);
            }

            const fechaIso = this.formatearFechaParaApi(fecha);
            if (!fechaIso) {
                this.mostrarError('La fecha seleccionada no es válida.');
                return of([]);
            }

            return this.evaluacionProgramadasService
                .listByFechaYCiclo(fechaIso, cicloId)
                .pipe(map((evaluaciones) => this.filtrarProgramacionesPorEstado(evaluaciones, estadoId)));
        }

        const rango = this.filtrosForm.controls.fechaRango.value;
        if (!rango?.start || !rango.end) {
            return of([]);
        }

        const desde = this.formatearFechaParaApi(rango.start);
        const hasta = this.formatearFechaParaApi(rango.end);

        if (!desde || !hasta) {
            this.mostrarError('El rango de fechas no es válido.');
            return of([]);
        }

        return this.evaluacionProgramadasService
            .listByFechaInicioRange(desde, hasta)
            .pipe(map((evaluaciones) => this.filtrarProgramacionesPorEstado(evaluaciones, estadoId)));
    }

    private filtrarProgramacionesPorEstado(
        evaluaciones: EvaluacionProgramada[],
        estadoId: number
    ): EvaluacionProgramada[] {
        const filtradas = evaluaciones.filter((evaluacion) => evaluacion.estadoId === estadoId);
        return this.ordenarProgramaciones(filtradas);
    }

    private ordenarProgramaciones(
        evaluaciones: EvaluacionProgramada[]
    ): EvaluacionProgramada[] {
        return [...evaluaciones].sort((a, b) => {
            if (a.fechaInicio !== b.fechaInicio) {
                return a.fechaInicio.localeCompare(b.fechaInicio);
            }

            return a.nombre.localeCompare(b.nombre, 'es');
        });
    }

    protected obtenerEtiquetaProgramacion(evaluacion: EvaluacionProgramada): string {
        const nombre = this.valorParaMostrar(evaluacion.nombre);
        const fecha = this.formatearFechaPresentacion(evaluacion.fechaInicio);
        return `${nombre} — ${fecha}`;
    }

    private crearFilaDesdeConsulta(
        consulta: EvaluacionProgramadaConsulta,
        evaluacion: EvaluacionProgramada
    ): EvaluacionProgramadaAlumnoRow {
        const estadoNombre = this.obtenerNombreEstado(consulta.estadoId ?? evaluacion.estadoId);
        const fechaInicioIso = evaluacion.fechaInicio;

        return {
            evaluacionProgramadaId: evaluacion.id,
            evaluacionId: consulta.evaluacionId,
            evaluacionNombre: evaluacion.nombre,
            estadoNombre,
            fechaInicioIso,
            fechaInicioFormateada: this.formatearFechaPresentacion(evaluacion.fechaInicio),
            horario: this.formatearHorario(evaluacion.horaInicio, evaluacion.horaFin),
            sede: this.valorParaMostrar(consulta.sede),
            ciclo: this.valorParaMostrar(consulta.ciclo),
            seccion: this.valorParaMostrar(consulta.seccion),
            alumnoDocumento: this.valorParaMostrar(consulta.alumnoDni),
            alumnoApellidos: this.valorParaMostrar(consulta.alumnoApellidos),
            alumnoNombres: this.valorParaMostrar(consulta.alumnoNombres),
            alumnoCelular: this.valorParaMostrar(consulta.alumnoCelular),
        };
    }

    private ordenarFilas(
        filas: EvaluacionProgramadaAlumnoRow[]
    ): EvaluacionProgramadaAlumnoRow[] {
        return [...filas].sort((a, b) => {
            if (a.fechaInicioIso !== b.fechaInicioIso) {
                return a.fechaInicioIso.localeCompare(b.fechaInicioIso);
            }

            if (a.evaluacionNombre !== b.evaluacionNombre) {
                return a.evaluacionNombre.localeCompare(b.evaluacionNombre, 'es');
            }

            if (a.alumnoApellidos !== b.alumnoApellidos) {
                return a.alumnoApellidos.localeCompare(b.alumnoApellidos, 'es');
            }

            return a.alumnoNombres.localeCompare(b.alumnoNombres, 'es');
        });
    }

    private valorParaMostrar(valor: string | null | undefined): string {
        if (!valor) {
            return '—';
        }

        const texto = valor.trim();
        return texto.length > 0 ? texto : '—';
    }

    private obtenerNombreEstado(estadoId: number | null | undefined): string {
        if (estadoId === null || estadoId === undefined) {
            return 'Sin estado';
        }

        const estado = this.estadosPorId.get(estadoId);
        return estado ? estado.nombre : `Estado ${estadoId}`;
    }

    private formatearFechaParaApi(fecha: Date): string | null {
        const dateTime = DateTime.fromJSDate(fecha).startOf('day');
        return dateTime.isValid ? dateTime.toISODate() : null;
    }

    private formatearFechaPresentacion(fechaIso: string): string {
        const fecha = DateTime.fromISO(fechaIso);
        if (!fecha.isValid) {
            return this.valorParaMostrar(fechaIso);
        }

        return this.fechaLargaFormatter.format(fecha.toJSDate());
    }

    private formatearHorario(horaInicio: string, horaFin: string): string {
        const inicio = this.formatearHora(horaInicio);
        const fin = this.formatearHora(horaFin);
        if (!inicio && !fin) {
            return '—';
        }

        if (!inicio) {
            return fin;
        }

        if (!fin) {
            return inicio;
        }

        return `${inicio} - ${fin}`;
    }

    private formatearHora(hora: string | null | undefined): string {
        if (!hora) {
            return '';
        }

        const date = DateTime.fromFormat(hora, 'HH:mm:ss', { zone: 'utc' });
        if (!date.isValid) {
            const fallback = DateTime.fromFormat(hora, 'HH:mm', { zone: 'utc' });
            if (!fallback.isValid) {
                return hora;
            }

            return this.horaFormatter.format(fallback.toJSDate());
        }

        return this.horaFormatter.format(date.toJSDate());
    }

    private ajustarColumnas(): void {
        queueMicrotask(() => {
            this.gridApi?.sizeColumnsToFit();
        });
    }

    private mostrarMensaje(mensaje: string): void {
        this.snackBar.open(mensaje, 'Cerrar', {
            duration: 4500,
        });
    }

    private mostrarError(mensaje: string, error?: unknown): void {
        const detalle =
            error instanceof Error
                ? error.message
                : typeof error === 'string'
                ? error
                : null;

        this.snackBar.open(detalle ? `${mensaje} ${detalle}` : mensaje, 'Cerrar', {
            duration: 6000,
        });
    }
}
