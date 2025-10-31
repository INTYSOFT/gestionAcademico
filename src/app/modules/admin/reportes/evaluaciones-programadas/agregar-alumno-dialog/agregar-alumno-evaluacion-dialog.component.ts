import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
    catchError,
    debounceTime,
    finalize,
    map,
    startWith,
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { EvaluacionesService } from 'app/core/services/centro-estudios/evaluaciones.service';
import { Evaluacion } from 'app/core/models/centro-estudios/evaluacion.model';

export interface AgregarAlumnoEvaluacionDialogData {
    evaluacionProgramadaId: number;
    sedeNombre: string | null;
    cicloNombre: string | null;
    seccionNombre: string | null;
}

export interface AgregarAlumnoEvaluacionDialogResult {
    creado: boolean;
    evaluacion?: Evaluacion;
    alumno?: Alumno | null;
}

@Component({
    selector: 'app-agregar-alumno-evaluacion-dialog',
    standalone: true,
    templateUrl: './agregar-alumno-evaluacion-dialog.component.html',
    styleUrls: ['./agregar-alumno-evaluacion-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatAutocompleteModule,
        MatProgressBarModule,
        MatSnackBarModule,
    ],
})
export class AgregarAlumnoEvaluacionDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(
        MatDialogRef<AgregarAlumnoEvaluacionDialogComponent, AgregarAlumnoEvaluacionDialogResult>
    );
    private readonly data = inject<AgregarAlumnoEvaluacionDialogData>(MAT_DIALOG_DATA);
    private readonly destroyRef = inject(DestroyRef);
    private readonly snackBar = inject(MatSnackBar);
    private readonly sedeService = inject(SedeService);
    private readonly ciclosService = inject(CiclosService);
    private readonly seccionesService = inject(SeccionesService);
    private readonly seccionCicloService = inject(SeccionCicloService);
    private readonly alumnosService = inject(AlumnosService);
    private readonly evaluacionesService = inject(EvaluacionesService);

    protected readonly form: FormGroup = this.fb.group({
        sedeId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        cicloId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        seccionId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        alumnoId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    });

    protected readonly alumnoBusquedaControl = new FormControl<string | Alumno>('', {
        validators: [Validators.required],
    });

    protected readonly isLoadingInicial$ = new BehaviorSubject<boolean>(false);
    protected readonly isGuardando$ = new BehaviorSubject<boolean>(false);
    protected readonly isCargandoSecciones$ = new BehaviorSubject<boolean>(false);

    private readonly sedesSubject = new BehaviorSubject<Sede[]>([]);
    private readonly ciclosSubject = new BehaviorSubject<Ciclo[]>([]);
    private readonly seccionesDisponiblesSubject = new BehaviorSubject<Seccion[]>([]);
    private readonly alumnosFiltradosSubject = new BehaviorSubject<Alumno[]>([]);

    protected readonly sedes$ = this.sedesSubject.asObservable();
    protected readonly ciclos$ = this.ciclosSubject.asObservable();
    protected readonly seccionesDisponibles$ = this.seccionesDisponiblesSubject.asObservable();
    protected readonly alumnosFiltrados$ = this.alumnosFiltradosSubject.asObservable();

    private readonly seccionesMap = new Map<number, Seccion>();
    private alumnosCache: Alumno[] = [];
    private preseleccionSeccionNombre: string | null = this.data.seccionNombre;

    constructor() {
        this.configurarReactividad();
        this.cargarDatosIniciales();
    }

    protected mostrarAlumno(valor: Alumno | string | null): string {
        if (!valor) {
            return '';
        }

        if (typeof valor === 'string') {
            return valor;
        }

        const nombres = `${valor.apellidos ?? ''} ${valor.nombres ?? ''}`.trim();
        return nombres.length > 0 ? `${nombres} · ${valor.dni}` : valor.dni;
    }

    protected readonly displayAlumno = (valor: Alumno | string | null): string =>
        this.mostrarAlumno(valor);

    protected cancelar(): void {
        this.dialogRef.close();
    }

    protected guardar(): void {
        if (this.form.invalid || this.alumnoBusquedaControl.invalid) {
            this.form.markAllAsTouched();
            this.alumnoBusquedaControl.markAsTouched();
            return;
        }

        const { sedeId, cicloId, seccionId, alumnoId } = this.form.getRawValue();

        if (!sedeId || !cicloId || !seccionId || !alumnoId) {
            return;
        }

        this.isGuardando$.next(true);

        this.evaluacionesService
            .create({
                evaluacionProgramadaId: this.data.evaluacionProgramadaId,
                alumnoId,
                sedeId,
                cicloId,
                seccionId,
                activo: true,
            })
            .pipe(
                finalize(() => this.isGuardando$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (evaluacion) => {
                    const alumnoSeleccionado = this.alumnosCache.find(
                        (alumno) => alumno.id === alumnoId
                    );

                    this.dialogRef.close({
                        creado: true,
                        evaluacion,
                        alumno: alumnoSeleccionado ?? null,
                    });
                },
                error: (error) => {
                    console.error('Error al agregar alumno a la evaluación', error);
                    this.mostrarError('No se pudo agregar al alumno a la evaluación.');
                },
            });
    }

    private configurarReactividad(): void {
        combineLatest([
            this.form.controls.sedeId.valueChanges.pipe(
                startWith(this.form.controls.sedeId.value)
            ),
            this.form.controls.cicloId.valueChanges.pipe(
                startWith(this.form.controls.cicloId.value)
            ),
        ])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([sedeId, cicloId]) => {
                this.form.controls.seccionId.setValue(null, { emitEvent: false });

                if (!sedeId || !cicloId) {
                    this.seccionesDisponiblesSubject.next([]);
                    return;
                }

                this.cargarSeccionesDisponibles(sedeId, cicloId);
            });

        this.alumnoBusquedaControl.valueChanges
            .pipe(
                startWith(this.alumnoBusquedaControl.value),
                debounceTime(200),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((valor) => {
                if (typeof valor === 'string') {
                    this.form.controls.alumnoId.setValue(null, { emitEvent: false });
                    this.actualizarAlumnosFiltrados(valor);
                    return;
                }

                if (valor) {
                    this.form.controls.alumnoId.setValue(valor.id, { emitEvent: false });
                }
            });
    }

    private cargarDatosIniciales(): void {
        this.isLoadingInicial$.next(true);

        forkJoin({
            sedes: this.sedeService.getSedes().pipe(
                catchError((error) => this.handleCargaError('sedes', error, [] as Sede[]))
            ),
            ciclos: this.cargarCiclos(),
            secciones: this.cargarSecciones(),
            alumnos: this.cargarAlumnos(),
        })
            .pipe(
                finalize(() => this.isLoadingInicial$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ sedes, ciclos, secciones, alumnos }) => {
                this.sedesSubject.next(sedes);
                this.ciclosSubject.next(ciclos);
                secciones.forEach((seccion) => this.seccionesMap.set(seccion.id, seccion));
                this.alumnosCache = alumnos;
                this.actualizarAlumnosFiltrados(
                    typeof this.alumnoBusquedaControl.value === 'string'
                        ? this.alumnoBusquedaControl.value
                        : ''
                );
                this.preseleccionarControles();
            });
    }

    private cargarCiclos(): Observable<Ciclo[]> {
        return this.ciclosService.listAll().pipe(
            map((ciclos) =>
                ciclos
                    .filter((ciclo) => ciclo.activo !== false)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre))
            ),
            catchError((error) => this.handleCargaError('ciclos', error, [] as Ciclo[]))
        );
    }

    private cargarSecciones(): Observable<Seccion[]> {
        return this.seccionesService.list().pipe(
            map((secciones) => secciones.filter((seccion) => seccion.activo)),
            catchError((error) => this.handleCargaError('secciones', error, [] as Seccion[]))
        );
    }

    private cargarAlumnos(): Observable<Alumno[]> {
        return this.alumnosService.list().pipe(
            catchError((error) => this.handleCargaError('alumnos', error, [] as Alumno[]))
        );
    }

    private cargarSeccionesDisponibles(sedeId: number, cicloId: number): void {
        this.isCargandoSecciones$.next(true);
        this.seccionCicloService
            .listBySedeAndCiclo(sedeId, cicloId)
            .pipe(
                map((relaciones) => this.mapearSeccionesDesdeRelacion(relaciones)),
                catchError((error) => this.handleCargaError('secciones del ciclo', error, [])),
                finalize(() => this.isCargandoSecciones$.next(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((secciones) => {
                this.seccionesDisponiblesSubject.next(secciones);
                if (this.preseleccionSeccionNombre) {
                    this.preseleccionarSeccionPorNombre(this.preseleccionSeccionNombre);
                    this.preseleccionSeccionNombre = null;
                }
            });
    }

    private mapearSeccionesDesdeRelacion(relaciones: SeccionCiclo[]): Seccion[] {
        const ids = new Set<number>();
        const resultado: Seccion[] = [];

        relaciones.forEach((relacion) => {
            if (!ids.has(relacion.seccionId)) {
                ids.add(relacion.seccionId);
                const seccion = this.seccionesMap.get(relacion.seccionId);
                if (seccion) {
                    resultado.push(seccion);
                }
            }
        });

        return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    private preseleccionarControles(): void {
        this.preseleccionarSedePorNombre(this.data.sedeNombre);
        this.preseleccionarCicloPorNombre(this.data.cicloNombre);
    }

    private preseleccionarSedePorNombre(nombre: string | null): void {
        if (!nombre) {
            return;
        }

        const sede = this.buscarPorNombre(this.sedesSubject.value, nombre);
        if (sede) {
            this.form.controls.sedeId.setValue(sede.id, { emitEvent: true });
        }
    }

    private preseleccionarCicloPorNombre(nombre: string | null): void {
        if (!nombre) {
            return;
        }

        const ciclo = this.buscarPorNombre(this.ciclosSubject.value, nombre);
        if (ciclo) {
            this.form.controls.cicloId.setValue(ciclo.id, { emitEvent: true });
        }
    }

    private preseleccionarSeccionPorNombre(nombre: string): void {
        const seccion = this.buscarPorNombre(this.seccionesDisponiblesSubject.value, nombre);
        if (seccion) {
            this.form.controls.seccionId.setValue(seccion.id, { emitEvent: true });
        }
    }

    private buscarPorNombre<T extends { nombre: string }>(coleccion: T[], nombre: string): T | null {
        const normalizado = nombre.trim().toLocaleLowerCase('es-PE');
        return (
            coleccion.find(
                (item) => item.nombre.trim().toLocaleLowerCase('es-PE') === normalizado
            ) ?? null
        );
    }

    private actualizarAlumnosFiltrados(termino: string): void {
        const normalizado = termino.trim().toLocaleLowerCase('es-PE');

        if (!normalizado) {
            this.alumnosFiltradosSubject.next(this.alumnosCache.slice(0, 20));
            return;
        }

        const filtrados = this.alumnosCache.filter((alumno) =>
            this.crearCadenaBusquedaAlumno(alumno).includes(normalizado)
        );

        this.alumnosFiltradosSubject.next(filtrados.slice(0, 20));
    }

    private crearCadenaBusquedaAlumno(alumno: Alumno): string {
        return [alumno.dni, alumno.apellidos, alumno.nombres, alumno.correo]
            .filter((valor): valor is string => !!valor)
            .map((valor) => valor.trim().toLocaleLowerCase('es-PE'))
            .join(' ');
    }

    private mostrarError(mensaje: string): void {
        this.snackBar.open(mensaje, 'Cerrar', {
            duration: 4000,
        });
    }

    private handleCargaError<T>(contexto: string, error: unknown, fallback: T): Observable<T> {
        console.error(`Error al cargar ${contexto}`, error);
        this.mostrarError(`No se pudieron cargar los ${contexto}.`);
        return of(fallback);
    }
}
