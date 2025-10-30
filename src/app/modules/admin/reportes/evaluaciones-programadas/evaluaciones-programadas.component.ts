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
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { EstadoEvaluacionProgramada } from 'app/core/models/centro-estudios/estado-evaluacion-programada.model';
import { EvaluacionProgramadaConsulta } from 'app/core/models/centro-estudios/evaluacion-programada-consulta.model';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EstadoEvaluacionProgramadaService } from 'app/core/services/centro-estudios/estado-evaluacion-programada.service';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaConsultasService } from 'app/core/services/centro-estudios/evaluacion-programada-consultas.service';

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

    protected readonly filtrosForm = this.fb.group({
        estadoId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        fechaModo: this.fb.nonNullable.control<FechaModo>(FECHA_MODO.Unica),
        fechaUnica: this.fb.control<Date | null>(null, { validators: [Validators.required] }),
        fechaRango: this.fb.group(
            {
                start: this.fb.control<Date | null>(null),
                end: this.fb.control<Date | null>(null),
            },
            { validators: [requireDateRange, validateDateRange] }
        ),
    });

    protected readonly estados$ = new BehaviorSubject<EstadoEvaluacionProgramada[]>([]);
    protected readonly estaCargandoEstados$ = new BehaviorSubject<boolean>(false);
    protected readonly estaCargandoResultados$ = new BehaviorSubject<boolean>(false);
    protected readonly filas$ = new BehaviorSubject<EvaluacionProgramadaAlumnoRow[]>([]);

    protected readonly totalFilas$ = this.filas$.pipe(map((filas) => filas.length));

    protected readonly mostrarSinDatos$ = combineLatest([
        this.estaCargandoResultados$,
        this.filas$,
    ]).pipe(map(([cargando, filas]) => !cargando && filas.length === 0));

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
        this.suscribirseACambiosDeModo();
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

        this.estaCargandoResultados$.next(true);
        this.obtenerEvaluacionesSegunFiltro(estadoId, fechaModo)
            .pipe(
                finalize(() => this.estaCargandoResultados$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (filas) => {
                    this.filas$.next(filas);
                    this.ajustarColumnas();
                    if (filas.length === 0) {
                        this.mostrarMensaje('No se encontraron alumnos para los filtros indicados.');
                    }
                },
                error: (error) => {
                    this.filas$.next([]);
                    this.mostrarError('Ocurrió un error al obtener las evaluaciones.', error);
                },
            });
    }

    protected limpiarFiltros(): void {
        this.filtrosForm.reset({
            estadoId: null,
            fechaModo: FECHA_MODO.Unica,
            fechaUnica: null,
            fechaRango: { start: null, end: null },
        });
        this.filtrosForm.markAsPristine();
        this.filtrosForm.markAsUntouched();
        this.configurarValidacionesIniciales();
        this.filas$.next([]);
        this.ajustarColumnas();
    }

    private configurarValidacionesIniciales(): void {
        const { fechaUnica, fechaRango } = this.filtrosForm.controls;
        fechaUnica.enable({ emitEvent: false });
        fechaUnica.setValidators([Validators.required]);
        fechaUnica.updateValueAndValidity({ emitEvent: false });

        fechaRango.disable({ emitEvent: false });
        fechaRango.updateValueAndValidity({ emitEvent: false });
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

    private suscribirseACambiosDeModo(): void {
        this.filtrosForm.controls.fechaModo.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((modo) => {
                this.ajustarControlesSegunModo(modo);
            });
    }

    private ajustarControlesSegunModo(modo: FechaModo): void {
        const { fechaUnica, fechaRango } = this.filtrosForm.controls;

        if (modo === FECHA_MODO.Unica) {
            fechaRango.reset({ start: null, end: null }, { emitEvent: false });
            fechaRango.disable({ emitEvent: false });
            fechaUnica.enable({ emitEvent: false });
            fechaUnica.setValidators([Validators.required]);
        } else {
            fechaUnica.setValue(null, { emitEvent: false });
            fechaUnica.disable({ emitEvent: false });
            fechaUnica.clearValidators();
            fechaRango.enable({ emitEvent: false });
        }

        fechaUnica.updateValueAndValidity({ emitEvent: false });
        fechaRango.updateValueAndValidity({ emitEvent: false });
    }

    private obtenerEvaluacionesSegunFiltro(
        estadoId: number,
        modo: FechaModo
    ): Observable<EvaluacionProgramadaAlumnoRow[]> {
        if (modo === FECHA_MODO.Unica) {
            const fecha = this.filtrosForm.controls.fechaUnica.value;
            if (!fecha) {
                return of([]);
            }
            const fechaIso = this.formatearFechaParaApi(fecha);
            if (!fechaIso) {
                this.mostrarError('La fecha seleccionada no es válida.');
                return of([]);
            }

            return this.evaluacionProgramadasService
                .listByFechaInicio(fechaIso)
                .pipe(switchMap((evaluaciones) => this.procesarEvaluaciones(evaluaciones, estadoId)));
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
            .pipe(switchMap((evaluaciones) => this.procesarEvaluaciones(evaluaciones, estadoId)));
    }

    private procesarEvaluaciones(
        evaluaciones: EvaluacionProgramada[],
        estadoId: number
    ): Observable<EvaluacionProgramadaAlumnoRow[]> {
        const filtradas = evaluaciones.filter((evaluacion) => evaluacion.estadoId === estadoId);

        if (filtradas.length === 0) {
            return of([]);
        }

        const solicitudes = filtradas.map((evaluacion) =>
            this.consultasService.listByEvaluacionProgramadaId(evaluacion.id).pipe(
                map((consultas) =>
                    consultas.map((consulta) => this.crearFilaDesdeConsulta(consulta, evaluacion))
                ),
                catchError((error: HttpErrorResponse | Error) => {
                    this.mostrarError('No se pudo obtener la lista de alumnos.', error);
                    return of([]);
                })
            )
        );

        return forkJoin(solicitudes).pipe(
            map((resultadoPorEvaluacion) => resultadoPorEvaluacion.flat()),
            map((filas) => this.ordenarFilas(filas))
        );
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
