import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import {
    ColDef,
    GridApi,
    GridReadyEvent,
    ValueFormatterParams,
} from 'ag-grid-community';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
    catchError,
    finalize,
    map,
    switchMap,
    take,
    tap,
    filter,
    startWith,
} from 'rxjs/operators';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { MatriculasService } from 'app/core/services/centro-estudios/matriculas.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { Matricula } from 'app/core/models/centro-estudios/matricula.model';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { NivelesService } from 'app/core/services/centro-estudios/niveles.service';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';

interface MatriculaReporteRow {
    id: number;
    alumnoId: number;
    alumnoNombre: string;
    cicloId: number;
    seccionCicloId: number;
    seccionNombre: string | null;
    nivelNombre: string | null;
    carreraNombre: string | null;
    fechaRegistro: string | null;
    activo: boolean;
}

@Component({
    selector: 'app-reportes-alumnos-matriculados',
    standalone: true,
    templateUrl: './alumnos-matriculados.component.html',
    styleUrls: ['./alumnos-matriculados.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        NgForOf,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatOptionModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        MatProgressBarModule,
        MatSnackBarModule,
        AgGridAngular,
    ],
})
export class ReporteMatriculasPorSedeCicloComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly snackBar = inject(MatSnackBar);
    private readonly matriculasService = inject(MatriculasService);
    private readonly sedeService = inject(SedeService);
    private readonly ciclosService = inject(CiclosService);
    private readonly aperturaCicloService = inject(AperturaCicloService);
    private readonly seccionCicloService = inject(SeccionCicloService);
    private readonly seccionesService = inject(SeccionesService);
    private readonly nivelesService = inject(NivelesService);
    private readonly carrerasService = inject(CarrerasService);
    private readonly alumnosService = inject(AlumnosService);

    protected readonly filtrosForm = this.fb.group({
        sedeId: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        cicloId: this.fb.control<number | null>({ value: null, disabled: true }, {
            validators: [Validators.required],
        }),
        tipoCiclo: this.fb.control<'vigentes' | 'todos'>('vigentes', { nonNullable: true }),
    });

    protected readonly sedes$ = new BehaviorSubject<Sede[]>([]);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly filas$ = new BehaviorSubject<MatriculaReporteRow[]>([]);
    protected readonly estaCargandoSedes$ = new BehaviorSubject<boolean>(false);
    protected readonly estaCargandoCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly estaGenerandoReporte$ = new BehaviorSubject<boolean>(false);

    protected readonly totalFilas$ = this.filas$.pipe(map((filas) => filas.length));

    /**
     * Emits true when not generating report and there are no filas to display.
     */
    protected readonly mostrarSinDatos$ = this.estaGenerandoReporte$.pipe(
        switchMap((generando) =>
            generando ? of(false) : this.filas$.pipe(map((filas) => (filas.length ?? 0) === 0), take(1))
        )
    );

    protected readonly cicloBusquedaControl = new FormControl<Ciclo | string>({
        value: '',
        disabled: true,
    });

    protected readonly ciclosFiltrados$ = combineLatest([
        this.ciclos$,
        this.filtrosForm.controls.tipoCiclo.valueChanges.pipe(
            startWith(this.filtrosForm.controls.tipoCiclo.value)
        ),
        this.cicloBusquedaControl.valueChanges.pipe(
            startWith(this.cicloBusquedaControl.value),
            map((valor) => (typeof valor === 'string' ? valor : ''))
        ),
    ]).pipe(
        map(([ciclos, tipo, termino]) => {
            const porTipo = this.filtrarCiclosPorTipo(ciclos, tipo);
            if (!termino.trim()) {
                return porTipo;
            }

            const terminoNormalizado = termino.trim().toLowerCase();
            return porTipo.filter((ciclo) =>
                this.obtenerEtiquetaCiclo(ciclo).toLowerCase().includes(terminoNormalizado)
            );
        })
    );

    protected readonly columnas: ColDef<MatriculaReporteRow>[] = [
        {
            headerName: 'Alumno',
            field: 'alumnoNombre',
            minWidth: 220,
            flex: 1,
            tooltipField: 'alumnoNombre',
        },
        {
            headerName: 'Sección',
            field: 'seccionNombre',
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Nivel',
            field: 'nivelNombre',
            minWidth: 160,
            valueFormatter: (params) => params.value ?? '',
        },
        {
            headerName: 'Carrera',
            field: 'carreraNombre',
            minWidth: 180,
            valueFormatter: (params) => params.value ?? 'Sin asignar',
        },
        {
            headerName: 'Fecha registro',
            field: 'fechaRegistro',
            minWidth: 200,
            valueFormatter: (params) => this.formatearFecha(params),
        },
        {
            headerName: 'Activo',
            field: 'activo',
            width: 120,
            valueFormatter: (params) => (params.value ? 'Sí' : 'No'),
        },
        {
            headerName: 'ID matrícula',
            field: 'id',
            width: 140,
        },
    ];

    protected readonly configuracionColumnasPorDefecto: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
    };

    private readonly dateFormatter = new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    private readonly alumnosCache = new Map<number, Alumno>();
    private readonly seccionesCache = new Map<number, Seccion>();
    private readonly nivelesCache = new Map<number, Nivel>();
    private readonly carrerasCache = new Map<number, Carrera>();
    private readonly ciclosCatalogo$ = new BehaviorSubject<Ciclo[]>([]);
    private readonly cicloFechaFormatter = new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
    });

    private ciclosCatalogoCargado = false;
    private seccionesCargadas = false;
    private nivelesCargados = false;
    private carrerasCargadas = false;

    private gridApi?: GridApi<MatriculaReporteRow>;

    ngOnInit(): void {
        this.cargarSedes();
        this.cargarCatalogoCiclos();
        this.suscribirCambiosDeSede();
        this.suscribirBusquedaCiclo();
        this.suscribirCambiosTipoCiclo();
    }

    protected manejarGridReady(evento: GridReadyEvent<MatriculaReporteRow>): void {
        this.gridApi = evento.api;
        evento.api.sizeColumnsToFit();
    }

    protected generarReporte(): void {
        if (this.filtrosForm.invalid) {
            this.filtrosForm.markAllAsTouched();
            return;
        }

        const { sedeId, cicloId } = this.filtrosForm.getRawValue();

        if (sedeId === null || cicloId === null) {
            return;
        }

        this.estaGenerandoReporte$.next(true);

        this.matriculasService
            .getMatriculasBySedeYCiclo(sedeId, cicloId)
            .pipe(
                switchMap((matriculas) =>
                    matriculas.length === 0
                        ? of({ filas: [], faltantes: [] as number[] })
                        : this.construirFilasReporte({
                              matriculas,
                              sedeId,
                              cicloId,
                          })
                ),
                finalize(() => this.estaGenerandoReporte$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: ({ filas, faltantes }) => {
                    this.filas$.next(filas);
                    this.gridApi?.setGridOption('rowData', filas);

                    if (filas.length === 0) {
                        this.mostrarMensaje(
                            'No se encontraron matrículas para la sede y ciclo seleccionados.'
                        );
                    }

                    if (faltantes.length > 0) {
                        this.mostrarMensaje(
                            'No se pudieron obtener los datos de algunos alumnos del reporte.'
                        );
                    }
                },
                error: (error) => {
                    this.filas$.next([]);
                    this.gridApi?.setGridOption('rowData', []);
                    this.mostrarError('No se pudo generar el reporte.', error);
                },
            });
    }

    protected limpiarFiltros(): void {
        this.filtrosForm.reset();
        this.filtrosForm.controls.cicloId.disable();
        this.filtrosForm.controls.tipoCiclo.setValue('vigentes');
        this.filas$.next([]);
        this.gridApi?.setGridOption('rowData', []);
        this.cicloBusquedaControl.setValue('', { emitEvent: false });
        this.cicloBusquedaControl.disable();
    }

    private cargarSedes(): void {
        this.estaCargandoSedes$.next(true);

        this.sedeService
            .getSedes()
            .pipe(
                map((sedes) =>
                    [...sedes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                ),
                finalize(() => this.estaCargandoSedes$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (sedes) => this.sedes$.next(sedes),
                error: (error) => {
                    this.sedes$.next([]);
                    this.mostrarError('No se pudieron cargar las sedes.', error);
                },
            });
    }

    private cargarCatalogoCiclos(): void {
        this.ciclosService
            .listAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (ciclos) => {
                    const ordenados = [...ciclos].sort((a, b) =>
                        a.nombre.localeCompare(b.nombre, 'es')
                    );
                    this.ciclosCatalogoCargado = true;
                    this.ciclosCatalogo$.next(ordenados);
                },
                error: (error) => {
                    this.ciclosCatalogoCargado = false;
                    this.ciclosCatalogo$.next([]);
                    this.mostrarError('No se pudieron cargar los ciclos.', error);
                },
            });
    }

    private suscribirCambiosDeSede(): void {
        this.filtrosForm.controls.sedeId.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((sedeId) => {
                this.filtrosForm.controls.cicloId.reset();
                this.filtrosForm.controls.cicloId.disable();
                this.cicloBusquedaControl.setValue('', { emitEvent: false });
                this.cicloBusquedaControl.disable();
                this.ciclos$.next([]);

                if (sedeId === null) {
                    return;
                }

                this.cargarCiclosPorSede(sedeId);
            });
    }

    private cargarCiclosPorSede(sedeId: number): void {
        this.estaCargandoCiclos$.next(true);

        this.aperturaCicloService
            .listBySede(sedeId)
            .pipe(
                switchMap((aperturas) =>
                    this.ciclosCatalogo$
                        .pipe(
                            filter(() => this.ciclosCatalogoCargado),
                            take(1),
                            map((catalogo) => this.filtrarCiclosPorSede(catalogo, aperturas))
                        )
                ),
                finalize(() => this.estaCargandoCiclos$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (ciclos) => {
                    this.ciclos$.next(ciclos);
                    if (ciclos.length > 0) {
                        this.filtrosForm.controls.cicloId.enable();
                    } else {
                        this.mostrarMensaje(
                            'La sede seleccionada no tiene ciclos disponibles. Se mostrarán todos los ciclos.'
                        );
                        this.utilizarCatalogoCompleto();
                    }
                },
                error: (error) => {
                    this.ciclos$.next([]);
                    this.mostrarError('No se pudieron cargar los ciclos de la sede.', error);
                    this.utilizarCatalogoCompleto();
                },
            });
    }

    private utilizarCatalogoCompleto(): void {
        this.ciclosCatalogo$
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe((catalogo) => {
                this.ciclos$.next(catalogo);
                if (catalogo.length > 0) {
                    this.habilitarSeleccionCiclo();
                } else {
                    this.deshabilitarSeleccionCiclo();
                }
            });
    }

    private filtrarCiclosPorTipo(
        ciclos: Ciclo[],
        tipo: 'vigentes' | 'todos'
    ): Ciclo[] {
        if (tipo === 'todos') {
            return ciclos;
        }

        return ciclos.filter((ciclo) => this.esCicloVigente(ciclo));
    }

    private esCicloVigente(ciclo: Ciclo): boolean {
        if (!ciclo.activo) {
            return false;
        }

        if (!ciclo.fechaInicio || !ciclo.fechaFin) {
            return false;
        }

        const fechaInicio = new Date(ciclo.fechaInicio);
        const fechaFin = new Date(ciclo.fechaFin);

        if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
            return false;
        }

        const hoy = new Date();
        return fechaInicio <= hoy && hoy <= fechaFin;
    }

    private habilitarSeleccionCiclo(): void {
        if (this.filtrosForm.controls.cicloId.disabled) {
            this.filtrosForm.controls.cicloId.enable();
        }

        if (this.cicloBusquedaControl.disabled) {
            this.cicloBusquedaControl.enable();
        }

        this.cicloBusquedaControl.setValue('', { emitEvent: true });
    }

    private deshabilitarSeleccionCiclo(): void {
        this.filtrosForm.controls.cicloId.setValue(null);
        if (!this.filtrosForm.controls.cicloId.disabled) {
            this.filtrosForm.controls.cicloId.disable();
        }

        this.cicloBusquedaControl.setValue('', { emitEvent: false });
        if (!this.cicloBusquedaControl.disabled) {
            this.cicloBusquedaControl.disable();
        }
    }

    private suscribirBusquedaCiclo(): void {
        this.cicloBusquedaControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((valor) => {
                if (typeof valor === 'object' && valor !== null) {
                    this.filtrosForm.controls.cicloId.setValue(valor.id);
                } else {
                    this.filtrosForm.controls.cicloId.setValue(null);
                }
            });
    }

    private suscribirCambiosTipoCiclo(): void {
        this.filtrosForm.controls.tipoCiclo.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.filtrosForm.controls.cicloId.setValue(null);
                this.cicloBusquedaControl.setValue('', { emitEvent: true });
            });
    }

    protected manejarCicloSeleccionado({ option }: MatAutocompleteSelectedEvent): void {
        const ciclo = option.value as Ciclo | null;
        if (ciclo) {
            this.filtrosForm.controls.cicloId.setValue(ciclo.id);
        }
    }

    protected mostrarCicloEnBuscador = (valor: Ciclo | string | null): string => {
        if (!valor) {
            return '';
        }

        if (typeof valor === 'string') {
            return valor;
        }

        return this.obtenerEtiquetaCiclo(valor);
    };

    protected limpiarBusquedaCiclo(): void {
        this.cicloBusquedaControl.setValue('', { emitEvent: true });
        this.filtrosForm.controls.cicloId.setValue(null);
    }

    protected obtenerEtiquetaCiclo(ciclo: Ciclo): string {
        const fechaInicio = this.formatearFechaCiclo(ciclo.fechaInicio);
        const fechaFin = this.formatearFechaCiclo(ciclo.fechaFin);

        return `${ciclo.nombre} - ${fechaInicio} - ${fechaFin}`.trim();
    }

    private formatearFechaCiclo(fechaIso: string | null): string {
        if (!fechaIso) {
            return 'Sin fecha';
        }

        const fecha = new Date(fechaIso);
        if (Number.isNaN(fecha.getTime())) {
            return 'Fecha no válida';
        }

        return this.cicloFechaFormatter.format(fecha);
    }

    private filtrarCiclosPorSede(
        catalogo: Ciclo[],
        aperturas: { cicloId: number }[]
    ): Ciclo[] {
        const ids = new Set(aperturas.map((apertura) => apertura.cicloId));

        if (ids.size === 0) {
            return catalogo;
        }

        return catalogo.filter((ciclo) => ids.has(ciclo.id));
    }

    private construirFilasReporte({
        matriculas,
        sedeId,
        cicloId,
    }: {
        matriculas: Matricula[];
        sedeId: number;
        cicloId: number;
    }): Observable<{ filas: MatriculaReporteRow[]; faltantes: number[] }> {
        const alumnoIds = matriculas.map((matricula) => matricula.alumnoId);
        const seccionCicloIds = matriculas.map((matricula) => matricula.seccionCicloId);
        const carreraIds = matriculas
            .map((matricula) => matricula.carreraId)
            .filter((id): id is number => id !== null && id !== undefined);

        return forkJoin({
            alumnos: this.cargarAlumnos(alumnoIds),
            seccionCiclos: this.cargarSeccionesCiclo(sedeId, cicloId, seccionCicloIds),
            secciones: this.obtenerSecciones(),
            niveles: this.obtenerNiveles(),
            carreras: this.obtenerCarreras(carreraIds),
        }).pipe(
            map(({ alumnos, seccionCiclos, secciones, niveles, carreras }) => {
                const filas = matriculas.map((matricula) =>
                    this.crearFila(matricula, {
                        alumnos: alumnos.map,
                        seccionCiclos,
                        secciones,
                        niveles,
                        carreras,
                    })
                );

                this.gridApi?.setGridOption('rowData', filas);

                return { filas, faltantes: alumnos.faltantes };
            })
        );
    }

    private crearFila(
        matricula: Matricula,
        mapas: {
            alumnos: Map<number, Alumno>;
            seccionCiclos: Map<number, SeccionCiclo>;
            secciones: Map<number, Seccion>;
            niveles: Map<number, Nivel>;
            carreras: Map<number, Carrera>;
        }
    ): MatriculaReporteRow {
        const alumno = mapas.alumnos.get(matricula.alumnoId);
        const seccionCiclo = mapas.seccionCiclos.get(matricula.seccionCicloId);
        const seccion = seccionCiclo ? mapas.secciones.get(seccionCiclo.seccionId) : null;
        const nivel = seccionCiclo ? mapas.niveles.get(seccionCiclo.nivelId) : null;
        const carrera =
            matricula.carreraId !== null && matricula.carreraId !== undefined
                ? mapas.carreras.get(matricula.carreraId)
                : null;

        const alumnoNombre = alumno
            ? `${alumno.apellidos ?? ''} ${alumno.nombres ?? ''}`.trim() ||
              `Alumno ${alumno.id}`
            : `Alumno ${matricula.alumnoId}`;

        return {
            id: matricula.id,
            alumnoId: matricula.alumnoId,
            alumnoNombre,
            cicloId: matricula.cicloId,
            seccionCicloId: matricula.seccionCicloId,
            seccionNombre: seccion?.nombre ?? null,
            nivelNombre: nivel?.nombre ?? null,
            carreraNombre: carrera?.nombre ?? null,
            fechaRegistro: matricula.fechaRegistro,
            activo: matricula.activo,
        };
    }

    private cargarAlumnos(ids: number[]): Observable<{
        map: Map<number, Alumno>;
        faltantes: number[];
    }> {
        const unicos = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));

        if (unicos.length === 0) {
            return of({ map: new Map<number, Alumno>(), faltantes: [] });
        }

        const faltantes: number[] = [];
        const observables = unicos.map((id) => {
            const cacheado = this.alumnosCache.get(id);
            if (cacheado) {
                return of(cacheado);
            }

            return this.alumnosService.get(id).pipe(
                tap((alumno) => this.alumnosCache.set(alumno.id, alumno)),
                catchError(() => {
                    faltantes.push(id);
                    return of(null);
                })
            );
        });

        return forkJoin(observables).pipe(
            map((alumnos) => {
                const mapa = new Map<number, Alumno>();
                alumnos.forEach((alumno) => {
                    if (alumno) {
                        mapa.set(alumno.id, alumno);
                    }
                });

                return { map: mapa, faltantes };
            })
        );
    }

    private cargarSeccionesCiclo(
        sedeId: number,
        cicloId: number,
        seccionCicloIds: number[]
    ): Observable<Map<number, SeccionCiclo>> {
        return this.seccionCicloService
            .listBySedeAndCiclo(sedeId, cicloId)
            .pipe(
                map((secciones) => {
                    const mapa = new Map<number, SeccionCiclo>();
                    secciones.forEach((seccion) => mapa.set(seccion.id, seccion));

                    if (mapa.size === 0) {
                        seccionCicloIds.forEach((id) => {
                            if (!mapa.has(id)) {
                                mapa.set(id, {
                                    id,
                                    cicloId,
                                    seccionId: 0,
                                    nivelId: 0,
                                    sedeId,
                                    capacidad: 0,
                                    precio: 0,
                                    activo: true,
                                    fechaRegistro: null,
                                    fechaActualizacion: null,
                                    usuaraioRegistroId: null,
                                    usuaraioActualizacionId: null,
                                });
                            }
                        });
                    }

                    return mapa;
                }),
                catchError((error) => {
                    this.mostrarError(
                        'No se pudieron obtener las secciones del ciclo para el reporte.',
                        error
                    );
                    return of(new Map<number, SeccionCiclo>());
                })
            );
    }

    private obtenerSecciones(): Observable<Map<number, Seccion>> {
        if (this.seccionesCargadas) {
            return of(this.seccionesCache);
        }

        return this.seccionesService.list().pipe(
            map((secciones) => {
                this.seccionesCache.clear();
                secciones.forEach((seccion) => this.seccionesCache.set(seccion.id, seccion));
                this.seccionesCargadas = true;
                return this.seccionesCache;
            }),
            catchError((error) => {
                this.mostrarError('No se pudieron obtener las secciones.', error);
                return of(this.seccionesCache);
            })
        );
    }

    private obtenerNiveles(): Observable<Map<number, Nivel>> {
        if (this.nivelesCargados) {
            return of(this.nivelesCache);
        }

        return this.nivelesService.listAll().pipe(
            map((niveles) => {
                this.nivelesCache.clear();
                niveles.forEach((nivel) => this.nivelesCache.set(nivel.id, nivel));
                this.nivelesCargados = true;
                return this.nivelesCache;
            }),
            catchError((error) => {
                this.mostrarError('No se pudieron obtener los niveles.', error);
                return of(this.nivelesCache);
            })
        );
    }

    private obtenerCarreras(ids: number[]): Observable<Map<number, Carrera>> {
        if (this.carrerasCargadas) {
            return of(this.carrerasCache);
        }

        return this.carrerasService.list().pipe(
            map((carreras) => {
                this.carrerasCache.clear();
                carreras.forEach((carrera) => this.carrerasCache.set(carrera.id, carrera));
                this.carrerasCargadas = true;
                return this.carrerasCache;
            }),
            catchError((error) => {
                this.mostrarError('No se pudieron obtener las carreras.', error);
                return of(this.carrerasCache);
            })
        );
    }

    private formatearFecha({ value }: ValueFormatterParams<MatriculaReporteRow>): string {
        if (!value) {
            return '';
        }

        const fecha = new Date(value);
        if (Number.isNaN(fecha.getTime())) {
            return '';
        }

        return this.dateFormatter.format(fecha);
    }

    private mostrarMensaje(mensaje: string): void {
        this.snackBar.open(mensaje, 'Cerrar', {
            duration: 5000,
        });
    }

    private mostrarError(mensaje: string, error: unknown): void {
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
