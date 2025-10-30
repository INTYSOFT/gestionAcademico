import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GridApi,
    GridReadyEvent,
    ValueFormatterParams,
} from 'ag-grid-community';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import {
    catchError,
    debounceTime,
    finalize,
    map,
    shareReplay,
    startWith,
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateTime } from 'luxon';
import { EstadoEvaluacionProgramada } from 'app/core/models/centro-estudios/estado-evaluacion-programada.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaConsulta } from 'app/core/models/centro-estudios/evaluacion-programada-consulta.model';
import { EstadoEvaluacionProgramadaService } from 'app/core/services/centro-estudios/estado-evaluacion-programada.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaConsultasService } from 'app/core/services/centro-estudios/evaluacion-programada-consultas.service';

const enum BusquedaModo {
    Rango = 'rango',
    FechaYCiclo = 'fecha-ciclo',
}

type FiltrosFormValue = {
    estadoId: number | null;
    modo: BusquedaModo;
    fechaUnica: Date | null;
    cicloId: number | null;
    fechaDesde: Date | null;
    fechaHasta: Date | null;
};

@Component({
    selector: 'app-reporte-evaluaciones-programadas',
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
        MatButtonToggleModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatTooltipModule,
        AgGridAngular,
        DatePipe,
        NgIf,
    ],
})
export class ReporteEvaluacionesProgramadasComponent {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly snackBar = inject(MatSnackBar);
    private readonly estadoEvaluacionProgramadaService = inject(
        EstadoEvaluacionProgramadaService
    );
    private readonly ciclosService = inject(CiclosService);
    private readonly evaluacionProgramadasService = inject(
        EvaluacionProgramadasService
    );
    private readonly evaluacionProgramadaConsultasService = inject(
        EvaluacionProgramadaConsultasService
    );

    protected readonly filtrosForm = this.fb.nonNullable.group({
        estadoId: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        modo: this.fb.nonNullable.control<BusquedaModo>(BusquedaModo.Rango),
        fechaUnica: this.fb.control<Date | null>({ value: null, disabled: true }),
        cicloId: this.fb.control<number | null>({ value: null, disabled: true }),
        fechaDesde: this.fb.control<Date | null>(null),
        fechaHasta: this.fb.control<Date | null>(null),
    });

    protected readonly programacionControl = new FormControl<number | null>({
        value: null,
        disabled: true,
    });

    protected readonly estados$ = new BehaviorSubject<EstadoEvaluacionProgramada[]>([]);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly programaciones$ = new BehaviorSubject<EvaluacionProgramada[]>([]);
    protected readonly consultas$ = new BehaviorSubject<EvaluacionProgramadaConsulta[]>([]);

    protected readonly isLoadingEstados$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingProgramaciones$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingConsultas$ = new BehaviorSubject<boolean>(false);

    protected readonly rangoInvalido$ = new BehaviorSubject<boolean>(false);

    protected readonly totalResultados$ = this.consultas$.pipe(
        map((filas) => filas.length)
    );

    protected readonly resumenFiltros$ = combineLatest([
        this.filtrosForm.controls.estadoId.valueChanges.pipe(
            startWith(this.filtrosForm.controls.estadoId.value),
            map((estadoId) =>
                this.estados$.value.find((estado) => estado.id === estadoId) ?? null
            )
        ),
        this.filtrosForm.controls.modo.valueChanges.pipe(
            startWith(this.filtrosForm.controls.modo.value)
        ),
    ]).pipe(shareReplay({ refCount: true, bufferSize: 1 }));

    protected readonly columnDefs: ColDef<EvaluacionProgramadaConsulta>[] = [
        {
            field: 'alumnoDni',
            headerName: 'DNI',
            minWidth: 140,
            maxWidth: 180,
        },
        {
            field: 'alumnoApellidos',
            headerName: 'Apellidos',
            minWidth: 200,
            flex: 1,
        },
        {
            field: 'alumnoNombres',
            headerName: 'Nombres',
            minWidth: 180,
            flex: 1,
        },
        {
            field: 'alumnoCelular',
            headerName: 'Celular',
            minWidth: 160,
            valueFormatter: (params: ValueFormatterParams<EvaluacionProgramadaConsulta>) =>
                params.value ? String(params.value) : '—',
        },
        {
            field: 'sede',
            headerName: 'Sede',
            minWidth: 180,
            flex: 1,
        },
        {
            field: 'ciclo',
            headerName: 'Ciclo',
            minWidth: 160,
        },
        {
            field: 'seccion',
            headerName: 'Sección',
            minWidth: 160,
        },
    ];

    protected readonly defaultColDef: ColDef<EvaluacionProgramadaConsulta> = {
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        suppressMovable: true,
    };

    private gridApi?: GridApi<EvaluacionProgramadaConsulta>;

    constructor() {
        this.configurarReactividad();
        this.cargarEstados();
        this.cargarCiclos();
    }

    protected manejarGridReady(evento: GridReadyEvent<EvaluacionProgramadaConsulta>): void {
        this.gridApi = evento.api;
        this.gridApi.sizeColumnsToFit();
    }

    protected manejarGridRedimension(): void {
        this.gridApi?.sizeColumnsToFit();
    }

    protected describirProgramacion(programacion: EvaluacionProgramada): string {
        const fecha = this.formatearFecha(programacion.fechaInicio);
        return `${programacion.nombre} · ${fecha}`;
    }

    protected trackPorId<T extends { id: number }>(_: number, item: T): number {
        return item.id;
    }

    private configurarReactividad(): void {
        this.filtrosForm.controls.modo.valueChanges
            .pipe(startWith(this.filtrosForm.controls.modo.value), takeUntilDestroyed())
            .subscribe((modo) => {
                this.actualizarModoBusqueda(modo);
            });

        this.filtrosForm.valueChanges
            .pipe(
                startWith(this.filtrosForm.getRawValue()),
                debounceTime(250),
                takeUntilDestroyed()
            )
            .subscribe((valor) => {
                this.buscarProgramaciones(valor as FiltrosFormValue);
            });

        this.programaciones$
            .pipe(takeUntilDestroyed())
            .subscribe((programaciones) => {
                if (programaciones.length === 0) {
                    this.programacionControl.disable({ emitEvent: false });
                    this.programacionControl.setValue(null, { emitEvent: false });
                    this.consultas$.next([]);
                    return;
                }

                this.programacionControl.enable({ emitEvent: false });

                if (
                    this.programacionControl.value === null &&
                    programaciones.length === 1
                ) {
                    this.programacionControl.setValue(programaciones[0].id, {
                        emitEvent: true,
                    });
                }
            });

        this.programacionControl.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe((programacionId) => {
                this.consultas$.next([]);

                if (programacionId === null) {
                    return;
                }

                this.cargarConsultas(programacionId);
            });
    }

    private actualizarModoBusqueda(modo: BusquedaModo): void {
        const { fechaUnica, cicloId, fechaDesde, fechaHasta } = this.filtrosForm.controls;

        if (modo === BusquedaModo.Rango) {
            fechaUnica.disable({ emitEvent: false });
            cicloId.disable({ emitEvent: false });
            fechaDesde.enable({ emitEvent: false });
            fechaHasta.enable({ emitEvent: false });

            fechaUnica.setValue(null, { emitEvent: false });
            cicloId.setValue(null, { emitEvent: false });

            fechaDesde.addValidators(Validators.required);
            fechaHasta.addValidators(Validators.required);

            fechaUnica.removeValidators(Validators.required);
            cicloId.removeValidators(Validators.required);
        } else {
            fechaUnica.enable({ emitEvent: false });
            cicloId.enable({ emitEvent: false });
            fechaDesde.disable({ emitEvent: false });
            fechaHasta.disable({ emitEvent: false });

            fechaDesde.setValue(null, { emitEvent: false });
            fechaHasta.setValue(null, { emitEvent: false });

            fechaUnica.addValidators(Validators.required);
            cicloId.addValidators(Validators.required);

            fechaDesde.removeValidators(Validators.required);
            fechaHasta.removeValidators(Validators.required);
        }

        fechaUnica.updateValueAndValidity({ emitEvent: false });
        cicloId.updateValueAndValidity({ emitEvent: false });
        fechaDesde.updateValueAndValidity({ emitEvent: false });
        fechaHasta.updateValueAndValidity({ emitEvent: false });

        this.resetProgramaciones();
    }

    private buscarProgramaciones(valor: FiltrosFormValue): void {
        this.resetProgramaciones(false);

        if (!valor.estadoId) {
            return;
        }

        if (valor.modo === BusquedaModo.Rango) {
            if (!valor.fechaDesde || !valor.fechaHasta) {
                this.rangoInvalido$.next(false);
                return;
            }

            if (valor.fechaDesde > valor.fechaHasta) {
                this.rangoInvalido$.next(true);
                return;
            }

            this.rangoInvalido$.next(false);
            this.cargarProgramacionesPorRango(
                valor.estadoId,
                valor.fechaDesde,
                valor.fechaHasta
            );
            return;
        }

        this.rangoInvalido$.next(false);

        if (!valor.fechaUnica || !valor.cicloId) {
            return;
        }

        this.cargarProgramacionesPorFechaYCiclo(
            valor.estadoId,
            valor.fechaUnica,
            valor.cicloId
        );
    }

    private cargarEstados(): void {
        this.isLoadingEstados$.next(true);
        this.estadoEvaluacionProgramadaService
            .listAll()
            .pipe(
                map((estados) =>
                    estados
                        .filter((estado) => estado.activo)
                        .sort((a, b) => a.orden - b.orden)
                ),
                finalize(() => this.isLoadingEstados$.next(false)),
                catchError((error) => {
                    this.mostrarError('No se pudo obtener la lista de estados.');
                    console.error('Error al cargar estados', error);
                    return of([] as EstadoEvaluacionProgramada[]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((estados) => this.estados$.next(estados));
    }

    private cargarCiclos(): void {
        this.isLoadingCiclos$.next(true);
        this.ciclosService
            .listAll()
            .pipe(
                map((ciclos) =>
                    ciclos
                        .filter((ciclo) => ciclo.activo !== false)
                        .sort((a, b) => a.nombre.localeCompare(b.nombre))
                ),
                finalize(() => this.isLoadingCiclos$.next(false)),
                catchError((error) => {
                    this.mostrarError('No se pudo obtener la lista de ciclos.');
                    console.error('Error al cargar ciclos', error);
                    return of([] as Ciclo[]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((ciclos) => this.ciclos$.next(ciclos));
    }

    private cargarProgramacionesPorRango(
        estadoId: number,
        fechaDesde: Date,
        fechaHasta: Date
    ): void {
        const desde = this.formatearFechaIso(fechaDesde);
        const hasta = this.formatearFechaIso(fechaHasta);

        if (!desde || !hasta) {
            this.mostrarError('Las fechas seleccionadas no son válidas.');
            return;
        }

        this.isLoadingProgramaciones$.next(true);
        this.evaluacionProgramadasService
            .listByFechaInicioRange(desde, hasta)
            .pipe(
                map((programaciones) =>
                    this.filtrarProgramacionesPorEstado(programaciones, estadoId)
                ),
                finalize(() => this.isLoadingProgramaciones$.next(false)),
                catchError((error) => {
                    this.mostrarError(
                        'Ocurrió un error al cargar las programaciones para el rango seleccionado.'
                    );
                    console.error('Error al cargar programaciones', error);
                    return of([] as EvaluacionProgramada[]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((programaciones) => {
                this.programaciones$.next(programaciones);
            });
    }

    private cargarProgramacionesPorFechaYCiclo(
        estadoId: number,
        fecha: Date,
        cicloId: number
    ): void {
        const fechaInicio = this.formatearFechaIso(fecha);

        if (!fechaInicio) {
            this.mostrarError('La fecha seleccionada no es válida.');
            return;
        }

        this.isLoadingProgramaciones$.next(true);
        this.evaluacionProgramadasService
            .listByFechaYCiclo(fechaInicio, cicloId)
            .pipe(
                map((programaciones) =>
                    this.filtrarProgramacionesPorEstado(programaciones, estadoId)
                ),
                finalize(() => this.isLoadingProgramaciones$.next(false)),
                catchError((error) => {
                    this.mostrarError(
                        'Ocurrió un error al cargar las programaciones para la fecha seleccionada.'
                    );
                    console.error('Error al cargar programaciones', error);
                    return of([] as EvaluacionProgramada[]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((programaciones) => {
                this.programaciones$.next(programaciones);
            });
    }

    private cargarConsultas(evaluacionProgramadaId: number): void {
        this.isLoadingConsultas$.next(true);
        this.evaluacionProgramadaConsultasService
            .listByEvaluacionProgramadaId(evaluacionProgramadaId)
            .pipe(
                finalize(() => this.isLoadingConsultas$.next(false)),
                catchError((error) => {
                    this.mostrarError(
                        'Ocurrió un error al cargar la lista de alumnos para la evaluación seleccionada.'
                    );
                    console.error('Error al cargar consultas', error);
                    return of([] as EvaluacionProgramadaConsulta[]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((consultas) => {
                this.consultas$.next(consultas);
                queueMicrotask(() => this.gridApi?.sizeColumnsToFit());
            });
    }

    private resetProgramaciones(resetFormulario: boolean = true): void {
        this.programaciones$.next([]);
        this.consultas$.next([]);

        if (resetFormulario) {
            this.programacionControl.setValue(null, { emitEvent: false });
            this.programacionControl.disable({ emitEvent: false });
        }
    }

    private filtrarProgramacionesPorEstado(
        programaciones: EvaluacionProgramada[],
        estadoId: number
    ): EvaluacionProgramada[] {
        return programaciones
            .filter((programacion) => programacion.estadoId === estadoId)
            .sort((a, b) =>
                a.fechaInicio === b.fechaInicio
                    ? a.nombre.localeCompare(b.nombre)
                    : a.fechaInicio.localeCompare(b.fechaInicio)
            );
    }

    private formatearFechaIso(fecha: Date | null): string | null {
        if (!fecha) {
            return null;
        }

        return DateTime.fromJSDate(fecha).toISODate();
    }

    private formatearFecha(fechaIso: string): string {
        const date = DateTime.fromISO(fechaIso, { zone: 'utc' });
        return date.isValid ? date.toFormat('dd/MM/yyyy') : fechaIso;
    }

    private mostrarError(mensaje: string): void {
        this.snackBar.open(mensaje, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
        });
    }

    protected limpiarFiltros(): void {
        this.filtrosForm.reset({
            estadoId: null,
            modo: BusquedaModo.Rango,
            fechaUnica: null,
            cicloId: null,
            fechaDesde: null,
            fechaHasta: null,
        });

        this.rangoInvalido$.next(false);
        this.resetProgramaciones();
    }
}
