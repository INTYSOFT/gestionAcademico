import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    MatAutocompleteModule,
    MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
    BehaviorSubject,
    Subject,
    finalize,
    map,
    startWith,
    switchMap,
    takeUntil,
} from 'rxjs';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { Concepto } from 'app/core/models/centro-estudios/concepto.model';
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { ConceptosService } from 'app/core/services/centro-estudios/conceptos.service';
import { MatriculasService } from 'app/core/services/centro-estudios/matriculas.service';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import {
    CreateMatriculaItemPayload,
    CreateMatriculaWithItemsPayload,
} from 'app/core/models/centro-estudios/matricula.model';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import type {
    AlumnoFormDialogData,
    AlumnoFormDialogResult,
} from '../../mantenimiento/alumnos/alumno-form-dialog/alumno-form-dialog.component';

interface ConceptoFormGroup {
    conceptoId: FormControl<number | null>;
    cantidad: FormControl<number>;
    precioUnit: FormControl<number>;
    descuento: FormControl<number>;
}

interface MatriculaFormGroup {
    sedeId: FormControl<number | null>;
    cicloId: FormControl<number | null>;
    seccionCicloId: FormControl<number | null>;
    alumnoId: FormControl<number | null>;
    carreraId: FormControl<number | null>;
}

@Component({
    selector: 'app-matricula-registro',
    standalone: true,
    templateUrl: './matricula-registro.component.html',
    styleUrls: ['./matricula-registro.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressBarModule
],
})
export class MatriculaRegistroComponent implements OnInit, OnDestroy {
    protected readonly matriculaForm: FormGroup<MatriculaFormGroup> = this.fb.group({
        sedeId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        cicloId: this.fb.control<number | null>({ value: null, disabled: true }, {
            validators: [Validators.required],
        }),
        seccionCicloId: this.fb.control<number | null>({ value: null, disabled: true }, {
            validators: [Validators.required],
        }),
        alumnoId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        carreraId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    });

    protected readonly alumnoSearchControl = this.fb.nonNullable.control<string>('');
    protected readonly conceptoSelectorControl = this.fb.control<number | null>({
        value: null,
        disabled: true,
    });
    protected readonly conceptoItems = this.fb.array<FormGroup<ConceptoFormGroup>>([]);
    protected readonly alumnoDisplayFn = (alumno?: Alumno | null): string =>
        alumno ? this.mostrarAlumno(alumno) : '';

    protected readonly sedes$ = new BehaviorSubject<Sede[]>([]);
    protected readonly ciclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly ciclosDisponibles$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly secciones$ = new BehaviorSubject<SeccionCiclo[]>([]);
    protected readonly alumnos$ = new BehaviorSubject<Alumno[]>([]);
    protected readonly alumnosFiltrados$ = new BehaviorSubject<Alumno[]>([]);
    protected readonly conceptos$ = new BehaviorSubject<Concepto[]>([]);
    protected readonly conceptosDataSource$ = new BehaviorSubject<
        FormGroup<ConceptoFormGroup>[]
    >([]);
    protected readonly seccionesCatalogo$ = new BehaviorSubject<Map<number, Seccion>>(new Map());
    protected readonly carreras$ = new BehaviorSubject<Carrera[]>([]);

    protected readonly total$ = new BehaviorSubject<number>(0);
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingSecciones$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);

    protected readonly displayedColumns = [
        'concepto',
        'cantidad',
        'precio',
        'descuento',
        'subtotal',
        'acciones',
    ];

    private selectedSede: Sede | null = null;
    private selectedCiclo: Ciclo | null = null;
    private selectedSeccion: SeccionCiclo | null = null;
    private selectedAlumno: Alumno | null = null;
    private selectedCarrera: Carrera | null = null;

    private readonly destroy$ = new Subject<void>();
    private readonly conceptoMatriculaId = 1;
    private readonly conceptoMatriculaFallback: Concepto = {
        id: this.conceptoMatriculaId,
        nombre: 'Matrícula',
        precio: 0,
        impuesto: null,
        activo: true,
        fechaRegistro: null,
        fechaActualizacion: null,
        usuaraioRegistroId: null,
        usuaraioActualizacionId: null,
        conceptoTipoId: null,
    };
    private pendingMatriculaConceptInsertion = false;

    constructor(
        private readonly fb: FormBuilder,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly aperturaCicloService: AperturaCicloService,
        private readonly seccionCicloService: SeccionCicloService,
        private readonly seccionesService: SeccionesService,
        private readonly alumnosService: AlumnosService,
        private readonly conceptosService: ConceptosService,
        private readonly matriculasService: MatriculasService,
        private readonly carrerasService: CarrerasService,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly cdr: ChangeDetectorRef
    ) {}

    get conceptosFormArray(): FormArray<FormGroup<ConceptoFormGroup>> {
        return this.conceptoItems;
    }

    ngOnInit(): void {
        this.loadInitialData();
        this.handleFormChanges();
        this.handleAlumnoSearch();
        this.listenConceptChanges();
        this.syncDependentControlStates();
        this.emitConceptosDataSource();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected trackById(index: number, item: { id: number }): number {
        return item.id;
    }

    protected trackByConcept(index: number, group: FormGroup<ConceptoFormGroup>): number | null {
        return group.controls.conceptoId.value;
    }

    protected mostrarAlumno(alumno: Alumno): string {
        const nombres = [alumno.apellidos, alumno.nombres]
            .filter((value) => !!value && value.trim().length > 0)
            .join(', ');

        return nombres ? `${alumno.dni} - ${nombres}` : alumno.dni ?? '';
    }

    protected obtenerNombreConcepto(conceptoId: number | null): string {
        if (!conceptoId) {
            return '';
        }

        if (conceptoId === this.conceptoMatriculaId) {
            return (
                this.conceptos$.value.find((concepto) => concepto.id === conceptoId)?.nombre ??
                this.conceptoMatriculaFallback.nombre
            );
        }

        return this.conceptos$.value.find((concepto) => concepto.id === conceptoId)?.nombre ?? '';
    }

    protected get alumnoSeleccionado(): Alumno | null {
        return this.selectedAlumno;
    }

    protected get cicloSeleccionado(): Ciclo | null {
        return this.selectedCiclo;
    }

    protected get seccionSeleccionada(): SeccionCiclo | null {
        return this.selectedSeccion;
    }

    protected get sedeSeleccionada(): Sede | null {
        return this.selectedSede;
    }

    protected get carreraSeleccionada(): Carrera | null {
        return this.selectedCarrera;
    }

    protected onAlumnoSeleccionado(event: MatAutocompleteSelectedEvent): void {
        const alumno = event.option.value as Alumno | null;
        if (!alumno) {
            return;
        }

        const cicloId = this.matriculaForm.get('cicloId')!.value;

        if (cicloId === null) {
            this.snackBar.open('Seleccione un ciclo antes de elegir un alumno.', 'Cerrar', {
                duration: 4000,
            });
            this.restablecerBusquedaAlumno();
            return;
        }

        this.validarMatriculaAlumno(alumno, cicloId);
    }

    protected crearAlumno(): void {
        blurActiveElement();

        void import(
            '../../mantenimiento/alumnos/alumno-form-dialog/alumno-form-dialog.component'
        ).then(({ AlumnoFormDialogComponent }) => {
            this.dialog
                .open(AlumnoFormDialogComponent, {
                    width: '520px',
                    disableClose: true,
                    data: {} as AlumnoFormDialogData,
                })
                .afterClosed()
                .pipe(takeUntil(this.destroy$))
                .subscribe((resultado?: AlumnoFormDialogResult) => {
                    if (!resultado) {
                        return;
                    }

                    this.recargarAlumnos(resultado.alumno.id);
                });
        });
    }

    protected gestionarApoderados(): void {
        if (!this.selectedAlumno) {
            return;
        }

        blurActiveElement();

        void import('../../mantenimiento/alumnos/apoderados/alumno-apoderados-dialog.component').then(
            ({ AlumnoApoderadosDialogComponent }) => {
                this.dialog
                    .open(AlumnoApoderadosDialogComponent, {
                        width: '900px',
                        disableClose: true,
                        data: this.selectedAlumno!,
                    })
                    .afterClosed()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe();
            }
        );
    }

    protected conceptosDisponibles(): Concepto[] {
        const seleccionados = new Set(
            this.conceptosFormArray.controls
                .map((control) => control.controls.conceptoId.value)
                .filter((value): value is number => value !== null)
        );

        return this.conceptos$.value.filter(
            (concepto) => concepto.activo && !seleccionados.has(concepto.id)
        );
    }

    protected agregarConcepto(conceptoId: number | null): void {
        if (conceptoId === null) {
            return;
        }

        const existente = this.obtenerControlConcepto(conceptoId);

        if (existente) {
            this.snackBar.open('El concepto seleccionado ya fue agregado.', 'Cerrar', {
                duration: 4000,
            });
            this.conceptoSelectorControl.setValue(null);
            return;
        }

        const concepto =
            this.conceptos$.value.find((item) => item.id === conceptoId) ??
            (conceptoId === this.conceptoMatriculaId
                ? this.conceptoMatriculaFallback
                : null);

        if (!concepto) {
            this.snackBar.open('No se encontró la información del concepto.', 'Cerrar', {
                duration: 4000,
            });
            this.conceptoSelectorControl.setValue(null);
            return;
        }

        const precioNumerico = Number(concepto.precio ?? 0);

        const grupo = this.fb.group<ConceptoFormGroup>({
            conceptoId: this.fb.control<number | null>(concepto.id, {
                validators: [Validators.required],
            }),
            cantidad: this.fb.nonNullable.control<number>(1, {
                validators: [Validators.required, Validators.min(1)],
            }),
            precioUnit: this.fb.nonNullable.control<number>(
                Number.isFinite(precioNumerico) ? precioNumerico : 0,
                {
                validators: [Validators.required, Validators.min(0)],
            }),
            descuento: this.fb.nonNullable.control<number>(0, {
                validators: [Validators.min(0)],
            }),
        });

        this.conceptosFormArray.push(grupo);
        this.conceptoSelectorControl.setValue(null);
        this.emitConceptosDataSource();
        this.cdr.markForCheck();
    }

    protected eliminarConcepto(index: number): void {
        const control = this.conceptosFormArray.at(index);
        if (!control) {
            return;
        }

        const conceptoId = control.controls.conceptoId.value;
        if (conceptoId === this.conceptoMatriculaId && this.selectedSeccion) {
            this.snackBar.open('El concepto de matrícula no puede eliminarse.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.conceptosFormArray.removeAt(index);
        this.emitConceptosDataSource();
        this.cdr.markForCheck();
    }

    protected subtotal(control: FormGroup<ConceptoFormGroup>): number {
        const cantidad = Number(control.controls.cantidad.value ?? 0);
        const precio = Number(control.controls.precioUnit.value ?? 0);
        const descuento = Number(control.controls.descuento.value ?? 0);

        const total = cantidad * precio - descuento;
        return total >= 0 ? total : 0;
    }

    protected registrarMatricula(): void {
        if (this.matriculaForm.invalid) {
            this.matriculaForm.markAllAsTouched();
        }

        if (this.conceptosFormArray.length === 0) {
            this.snackBar.open('Debe agregar al menos un concepto.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        if (this.matriculaForm.invalid) {
            return;
        }

        const sedeId = this.matriculaForm.value.sedeId;
        const cicloId = this.matriculaForm.value.cicloId;
        const alumnoId = this.matriculaForm.value.alumnoId!;
        const seccionCicloId = this.matriculaForm.value.seccionCicloId!;
        const seccionId = this.selectedSeccion?.seccionId ?? null;

        if (
            sedeId === null ||
            sedeId === undefined ||
            cicloId === null ||
            cicloId === undefined ||
            seccionId === null
        ) {
            this.snackBar.open(
                'Debe seleccionar la sede, el ciclo y la sección antes de registrar.',
                'Cerrar',
                {
                    duration: 4000,
                }
            );
            return;
        }

        const payload: CreateMatriculaWithItemsPayload = {
            alumnoId,
            seccionCicloId,
            sedeId,
            cicloId,
            seccionId,
            carreraId: this.matriculaForm.value.carreraId!,
            items: this.conceptosFormArray.controls.map((control) =>
                this.mapToItemPayload(control)
            ),
        };

        this.isSaving$.next(true);

        this.matriculasService
            .createWithItems(payload)
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (response) => {
                    this.snackBar.open('Matrícula registrada correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.imprimirComprobante(response.matricula.id);
                    this.limpiarFormularioParcial();
                },
                error: (error) => {
                    this.snackBar.open(error?.message ?? 'No se pudo registrar la matrícula.', 'Cerrar', {
                        duration: 4000,
                    });
                },
            });
    }

    protected nuevaMatricula(): void {
        this.limpiarFormularioParcial();
    }

    protected nombreCiclo(cicloId: number | null): string {
        if (!cicloId) {
            return '';
        }

        return this.ciclos$.value.find((c) => c.id === cicloId)?.nombre ?? '';
    }

    protected nombreSeccion(seccionCiclo: SeccionCiclo | null): string {
        if (!seccionCiclo) {
            return '';
        }

        const seccion = this.seccionesCatalogo$.value.get(seccionCiclo.seccionId);
        return seccion?.nombre ?? `Sección ${seccionCiclo.seccionId}`;
    }

    protected tituloSeccion(): string {
        if (!this.selectedSeccion) {
            return '';
        }

        const seccionNombre = this.nombreSeccion(this.selectedSeccion);
        const cicloNombre = this.selectedCiclo?.nombre?.trim();
        const sedeNombre = this.selectedSede?.nombre?.trim();

        const partes = [seccionNombre, cicloNombre, sedeNombre]
            .map((valor) => valor?.trim())
            .filter((valor): valor is string => Boolean(valor));

        if (partes.length === 0) {
            return `Sección ${this.selectedSeccion.id}`;
        }

        return partes.join(' · ');
    }

    private handleFormChanges(): void {
        const cicloControl = this.matriculaForm.get('cicloId')!;
        const seccionControl = this.matriculaForm.get('seccionCicloId')!;
        const carreraControl = this.matriculaForm.get('carreraId')!;

        carreraControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((carreraId) => {
            this.updateCarreraSeleccionada(carreraId);
            this.cdr.markForCheck();
        });
        this.updateCarreraSeleccionada(carreraControl.value);

        this.matriculaForm
            .get('sedeId')!
            .valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((sedeId) => {
                this.selectedSede = sedeId
                    ? this.sedes$.value.find((sede) => sede.id === sedeId) ?? null
                    : null;
                this.matriculaForm.patchValue(
                    {
                        cicloId: null,
                        seccionCicloId: null,
                    },
                    { emitEvent: false }
                );
                this.selectedCiclo = null;
                this.selectedSeccion = null;
                this.conceptosFormArray.clear();
                this.emitConceptosDataSource();
                this.secciones$.next([]);
                this.ciclosDisponibles$.next([]);
                this.total$.next(0);
                this.toggleControl(seccionControl, false);
                this.toggleControl(this.conceptoSelectorControl, false);
                this.conceptoSelectorControl.setValue(null, { emitEvent: false });

                const carreraId = this.matriculaForm.value.carreraId ?? null;
                this.updateCarreraSeleccionada(carreraId);

                if (sedeId) {
                    this.toggleControl(cicloControl, true);
                    this.cargarCiclosDisponibles(sedeId);
                } else {
                    this.toggleControl(cicloControl, false);
                }

                this.cdr.markForCheck();
            });

        this.matriculaForm
            .get('cicloId')!
            .valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((cicloId) => {
                this.selectedCiclo = cicloId
                    ? this.ciclosDisponibles$.value.find((ciclo) => ciclo.id === cicloId) ?? null
                    : null;
                this.matriculaForm.patchValue({ seccionCicloId: null }, { emitEvent: false });
                this.selectedSeccion = null;
                this.secciones$.next([]);
                this.conceptosFormArray.clear();
                this.emitConceptosDataSource();
                this.total$.next(0);
                this.toggleControl(this.conceptoSelectorControl, false);
                this.conceptoSelectorControl.setValue(null, { emitEvent: false });

                if (cicloId && this.selectedSede) {
                    this.toggleControl(seccionControl, true);
                    this.cargarSecciones(this.selectedSede.id, cicloId);
                } else {
                    this.toggleControl(seccionControl, false);
                }

                this.cdr.markForCheck();
            });

        this.matriculaForm
            .get('seccionCicloId')!
            .valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((seccionId) => {
                this.selectedSeccion = seccionId
                    ? this.secciones$.value.find((item) => item.id === seccionId) ?? null
                    : null;

                this.pendingMatriculaConceptInsertion = false;
                this.conceptosFormArray.clear();
                this.emitConceptosDataSource();
                this.total$.next(0);
                const hasSeccionSeleccionada = !!this.selectedSeccion;
                this.toggleControl(this.conceptoSelectorControl, hasSeccionSeleccionada);
                if (!hasSeccionSeleccionada) {
                    this.conceptoSelectorControl.setValue(null, { emitEvent: false });
                }

                if (this.selectedSeccion) {
                    this.insertarConceptoMatriculaPorDefecto();
                }

                this.cdr.markForCheck();
            });
    }

    private handleAlumnoSearch(): void {
        this.alumnoSearchControl.valueChanges
            .pipe(startWith(this.alumnoSearchControl.value), takeUntil(this.destroy$))
            .subscribe((termino) => {
                const filtro = this.normalizarBusquedaAlumno(termino);
                const alumnos = this.alumnos$.value;

                if (!filtro) {
                    this.alumnosFiltrados$.next(alumnos);
                    this.matriculaForm.get('alumnoId')!.setValue(null);
                    this.selectedAlumno = null;
                    this.cdr.markForCheck();
                    return;
                }

                const filtrados = alumnos.filter((alumno) =>
                    this.normalizarAlumno(alumno).includes(filtro)
                );

                this.alumnosFiltrados$.next(filtrados);

                const seleccionado = filtrados.find(
                    (alumno) => alumno.id === this.selectedAlumno?.id
                );

                if (!seleccionado) {
                    this.matriculaForm.get('alumnoId')!.setValue(null);
                    this.selectedAlumno = null;
                }

                this.cdr.markForCheck();
            });
    }

    private listenConceptChanges(): void {
        this.conceptosFormArray.valueChanges
            .pipe(startWith(this.conceptosFormArray.value), takeUntil(this.destroy$))
            .subscribe(() => {
                const total = this.conceptosFormArray.controls.reduce((acc, control) => {
                    const subtotal = this.subtotal(control);
                    return acc + subtotal;
                }, 0);

                this.total$.next(total);
                this.emitConceptosDataSource();
                this.cdr.markForCheck();
            });
    }

    private mapToItemPayload(
        control: FormGroup<ConceptoFormGroup>
    ): CreateMatriculaItemPayload {
        const conceptoId = Number(control.controls.conceptoId.value);
        const cantidad = Number(control.controls.cantidad.value);
        const precioUnit = Number(control.controls.precioUnit.value);
        const descuento = Number(control.controls.descuento.value ?? 0);

        return {
            conceptoId,
            cantidad,
            precioUnit,
            descuento,
        };
    }

    private cargarCiclosDisponibles(sedeId: number): void {
        this.isLoadingCiclos$.next(true);
        this.aperturaCicloService
            .listBySede(sedeId)
            .pipe(
                switchMap((aperturas) => {
                    const activos = new Set(
                        aperturas.filter((item) => item.activo).map((item) => item.cicloId)
                    );

                    return this.ciclos$.pipe(
                        map((ciclos) =>
                            ciclos.filter(
                                (ciclo) =>
                                    activos.has(ciclo.id) && this.estaDentroDeApertura(ciclo)
                            )
                        )
                    );
                }),
                finalize(() => this.isLoadingCiclos$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((ciclos) => {
                this.ciclosDisponibles$.next(ciclos);
                this.cdr.markForCheck();
            });
    }

    private cargarSecciones(sedeId: number, cicloId: number): void {
        this.isLoadingSecciones$.next(true);
        this.seccionCicloService
            .listBySedeAndCiclo(sedeId, cicloId)
            .pipe(
                map((secciones) => secciones.filter((item) => item.activo)),
                finalize(() => this.isLoadingSecciones$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((secciones) => {
                this.secciones$.next(secciones);
                this.cdr.markForCheck();
            });
    }

    private insertarConceptoMatriculaPorDefecto(): void {
        if (!this.selectedSeccion) {
            this.pendingMatriculaConceptInsertion = false;
            return;
        }

        const conceptoMatricula = this.obtenerConceptoMatricula();

        if (!conceptoMatricula) {
            this.pendingMatriculaConceptInsertion = true;
            return;
        }

        this.pendingMatriculaConceptInsertion = false;

        const precioDesdeSeccion = this.obtenerPrecioDeSeccion();
        const precio = precioDesdeSeccion ?? conceptoMatricula.precio;

        const existente = this.obtenerControlConcepto(this.conceptoMatriculaId);

        if (existente) {
            const cantidadActual = existente.controls.cantidad.value ?? 1;
            if (cantidadActual !== 1) {
                existente.controls.cantidad.setValue(1);
            }

            if (existente.controls.precioUnit.value !== precio) {
                existente.controls.precioUnit.setValue(precio);
            }

            this.cdr.markForCheck();
            return;
        }

        const grupo = this.fb.group<ConceptoFormGroup>({
            conceptoId: this.fb.control<number | null>(conceptoMatricula.id, {
                validators: [Validators.required],
            }),
            cantidad: this.fb.nonNullable.control(1, {
                validators: [Validators.required, Validators.min(1)],
            }),
            precioUnit: this.fb.nonNullable.control(precio, {
                validators: [Validators.required, Validators.min(0)],
            }),
            descuento: this.fb.nonNullable.control(0, {
                validators: [Validators.min(0)],
            }),
        });

        this.conceptosFormArray.push(grupo);
        this.emitConceptosDataSource();
        this.cdr.markForCheck();
    }

    private obtenerControlConcepto(
        conceptoId: number
    ): FormGroup<ConceptoFormGroup> | null {
        return (
            this.conceptosFormArray.controls.find(
                (control) => control.controls.conceptoId.value === conceptoId
            ) ?? null
        );
    }

    private obtenerConceptoMatricula(): Concepto | null {
        const concepto = this.conceptos$.value.find(
            (item) => item.id === this.conceptoMatriculaId
        );

        if (!concepto) {
            return null;
        }

        const precioNumerico = Number(concepto.precio ?? 0);

        return {
            ...this.conceptoMatriculaFallback,
            ...concepto,
            nombre:
                concepto.nombre?.trim().length
                    ? concepto.nombre.trim()
                    : this.conceptoMatriculaFallback.nombre,
            precio: Number.isFinite(precioNumerico)
                ? precioNumerico
                : this.conceptoMatriculaFallback.precio,
        };
    }

    private obtenerPrecioDeSeccion(): number | null {
        if (!this.selectedSeccion) {
            return null;
        }

        const precio = Number(this.selectedSeccion.precio);

        if (!Number.isFinite(precio) || precio <= 0) {
            return null;
        }

        return precio;
    }

    private seleccionarAlumno(alumno: Alumno): void {
        this.selectedAlumno = alumno;
        this.matriculaForm.get('alumnoId')!.setValue(alumno.id);
        this.alumnoSearchControl.setValue(this.mostrarAlumno(alumno), {
            emitEvent: false,
        });
        this.cdr.markForCheck();
    }

    private validarMatriculaAlumno(alumno: Alumno, cicloId: number): void {
        this.matriculasService
            .getMatriculasByAlumnoYCiclo(alumno.id, cicloId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (matriculas) => {
                    if (matriculas.length > 0) {
                        this.snackBar.open(
                            'El alumno ya se encuentra matriculado en el ciclo seleccionado.',
                            'Cerrar',
                            {
                                duration: 5000,
                            }
                        );
                        this.restablecerBusquedaAlumno();
                        return;
                    }

                    this.seleccionarAlumno(alumno);
                },
                error: (error) => {
                    const message =
                        error instanceof Error && error.message
                            ? error.message
                            : 'No se pudo verificar la matrícula del alumno. Intente nuevamente.';

                    this.snackBar.open(message, 'Cerrar', {
                        duration: 5000,
                    });
                    this.restablecerBusquedaAlumno();
                },
            });
    }

    private restablecerBusquedaAlumno(): void {
        const alumnoActual = this.selectedAlumno
            ? this.mostrarAlumno(this.selectedAlumno)
            : '';

        this.alumnoSearchControl.setValue(alumnoActual, {
            emitEvent: false,
        });
        if (!this.selectedAlumno) {
            this.matriculaForm.get('alumnoId')!.setValue(null);
        }
        this.cdr.markForCheck();
    }

    private normalizarAlumno(alumno: Alumno): string {
        return [alumno.dni, alumno.apellidos, alumno.nombres]
            .map((valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : ''))
            .filter((valor) => valor.length > 0)
            .join(' ');
    }

    private normalizarBusquedaAlumno(termino: unknown): string {
        if (typeof termino === 'string') {
            return termino.trim().toLowerCase();
        }

        if (termino && typeof termino === 'object') {
            return this.normalizarAlumno(termino as Alumno);
        }

        return '';
    }

    private recargarAlumnos(alumnoId?: number): void {
        this.alumnosService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe((alumnos) => {
                const activos = alumnos.filter((alumno) => alumno.activo !== false);
                this.alumnos$.next(activos);
                this.alumnosFiltrados$.next(activos);

                if (alumnoId) {
                    const alumno = activos.find((item) => item.id === alumnoId);
                    if (alumno) {
                        this.seleccionarAlumno(alumno);
                    }
                }

                this.cdr.markForCheck();
            });
    }

    private loadInitialData(): void {
        this.sedeService
            .getSedes()
            .pipe(takeUntil(this.destroy$))
            .subscribe((sedes) => {
                this.sedes$.next(sedes.filter((sede) => sede.activo));
                this.cdr.markForCheck();
            });

        this.ciclosService
            .listAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe((ciclos) => {
                this.ciclos$.next(ciclos.filter((ciclo) => ciclo.activo));
                this.cdr.markForCheck();
            });

        this.seccionesService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe((secciones) => {
                const mapa = new Map<number, Seccion>();
                secciones
                    .filter((item) => item.activo)
                    .forEach((seccion) => mapa.set(seccion.id, seccion));
                this.seccionesCatalogo$.next(mapa);
                this.cdr.markForCheck();
            });

        this.carrerasService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe((carreras) => {
                this.carreras$.next(
                    carreras.filter((carrera) => carrera.activo !== false)
                );
                this.updateCarreraSeleccionada(this.matriculaForm.value.carreraId ?? null);
                this.cdr.markForCheck();
            });

        this.recargarAlumnos();

        this.conceptosService
            .listAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe((conceptos) => {
                const activos = conceptos
                    .filter((concepto) => concepto.activo)
                    .map((concepto) => {
                        if (concepto.id !== this.conceptoMatriculaId) {
                            return concepto;
                        }

                        const precioNumerico = Number(concepto.precio ?? 0);

                        return {
                            ...this.conceptoMatriculaFallback,
                            ...concepto,
                            nombre:
                                concepto.nombre?.trim().length
                                    ? concepto.nombre.trim()
                                    : this.conceptoMatriculaFallback.nombre,
                            precio: Number.isFinite(precioNumerico)
                                ? precioNumerico
                                : this.conceptoMatriculaFallback.precio,
                        };
                    });

                const incluyeConceptoMatricula = activos.some(
                    (concepto) => concepto.id === this.conceptoMatriculaId
                );
                const listaActualizada = incluyeConceptoMatricula
                    ? activos
                    : [...activos, { ...this.conceptoMatriculaFallback }];

                this.conceptos$.next(listaActualizada);

                if (
                    this.selectedSeccion &&
                    (this.pendingMatriculaConceptInsertion ||
                        !this.obtenerControlConcepto(this.conceptoMatriculaId))
                ) {
                    this.insertarConceptoMatriculaPorDefecto();
                }

                this.cdr.markForCheck();
            });
    }

    private estaDentroDeApertura(ciclo: Ciclo): boolean {
        if (!ciclo.activo) {
            return false;
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const fechaInicio = ciclo.fechaAperturaInscripcion
            ? new Date(ciclo.fechaAperturaInscripcion)
            : null;
        const fechaFin = ciclo.fechaCierreInscripcion
            ? new Date(ciclo.fechaCierreInscripcion)
            : null;

        if (fechaInicio) {
            fechaInicio.setHours(0, 0, 0, 0);
        }

        if (fechaFin) {
            fechaFin.setHours(23, 59, 59, 999);
        }

        if (fechaInicio && hoy < fechaInicio) {
            return false;
        }

        if (fechaFin && hoy.getTime() > fechaFin.getTime()) {
            return false;
        }

        return true;
    }

    private limpiarFormularioParcial(): void {
        const sedeId = this.matriculaForm.value.sedeId ?? null;
        const cicloId = this.matriculaForm.value.cicloId ?? null;

        this.matriculaForm.patchValue(
            {
                sedeId,
                cicloId,
                seccionCicloId: null,
                alumnoId: null,
                carreraId: this.matriculaForm.value.carreraId ?? null,
            },
            { emitEvent: false }
        );
        this.updateCarreraSeleccionada(this.matriculaForm.value.carreraId ?? null);
        this.conceptosFormArray.clear();
        this.emitConceptosDataSource();
        this.alumnoSearchControl.setValue('');
        this.conceptoSelectorControl.setValue(null, { emitEvent: false });
        this.selectedAlumno = null;
        this.selectedSeccion = null;
        this.total$.next(0);
        this.toggleControl(this.conceptoSelectorControl, false);

        if (this.selectedSede && this.selectedCiclo) {
            this.cargarSecciones(this.selectedSede.id, this.selectedCiclo.id);
            this.toggleControl(this.matriculaForm.get('seccionCicloId')!, true);
        } else {
            this.secciones$.next([]);
            this.toggleControl(this.matriculaForm.get('seccionCicloId')!, false);
        }
        this.toggleControl(this.matriculaForm.get('cicloId')!, !!sedeId);
        this.cdr.markForCheck();
    }

    private toggleControl(control: AbstractControl, enabled: boolean): void {
        if (enabled && control.disabled) {
            control.enable({ emitEvent: false });
        } else if (!enabled && control.enabled) {
            control.disable({ emitEvent: false });
        }
    }

    private emitConceptosDataSource(): void {
        this.conceptosDataSource$.next([...this.conceptosFormArray.controls]);
    }

    private updateCarreraSeleccionada(carreraId: number | null): void {
        const parsedId =
            typeof carreraId === 'number'
                ? carreraId
                : carreraId !== null
                ? Number(carreraId)
                : Number.NaN;

        if (!Number.isFinite(parsedId)) {
            this.selectedCarrera = null;
            return;
        }

        this.selectedCarrera =
            this.carreras$.value.find((carrera) => carrera.id === parsedId) ?? null;
    }

    private syncDependentControlStates(): void {
        const sedeId = this.matriculaForm.get('sedeId')!.value;
        const cicloId = this.matriculaForm.get('cicloId')!.value;
        const seccionId = this.matriculaForm.get('seccionCicloId')!.value;

        this.toggleControl(this.matriculaForm.get('cicloId')!, !!sedeId);
        this.toggleControl(this.matriculaForm.get('seccionCicloId')!, !!sedeId && !!cicloId);
        this.toggleControl(this.conceptoSelectorControl, !!seccionId);
    }

    private imprimirComprobante(matriculaId: number): void {
        if (!this.selectedAlumno || !this.selectedSede || !this.selectedCiclo || !this.selectedSeccion) {
            return;
        }

        const conceptoDetalles = this.conceptosFormArray.controls.map((control) => {
            const conceptoId = control.controls.conceptoId.value;
            const concepto = this.conceptos$.value.find((item) => item.id === conceptoId);
            const subtotal = this.subtotal(control);
            return {
                nombre: concepto?.nombre ?? `Concepto ${conceptoId}`,
                cantidad: control.controls.cantidad.value,
                precioUnit: control.controls.precioUnit.value,
                descuento: control.controls.descuento.value,
                subtotal,
            };
        });

        const total = this.total$.value;
        const fecha = new Date();
        const sede = this.selectedSede.nombre;
        const ciclo = this.selectedCiclo.nombre;
        const seccion = this.nombreSeccion(this.selectedSeccion);
        const alumno = this.mostrarAlumno(this.selectedAlumno);
        const carrera = this.selectedCarrera?.nombre ?? '';

        const ventana = window.open('', '_blank', 'width=900,height=650');
        if (!ventana) {
            this.snackBar.open('No se pudo abrir la ventana de impresión.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        const estilos = `
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111827; }
                h1 { text-align: center; margin-bottom: 24px; font-size: 20px; }
                .detalle { margin-bottom: 24px; }
                .detalle span { display: block; margin-bottom: 4px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; }
                th { background-color: #f3f4f6; text-align: left; }
                tfoot td { font-weight: bold; }
            </style>
        `;

        const filas = conceptoDetalles
            .map(
                (detalle) => `
                <tr>
                    <td>${detalle.nombre}</td>
                    <td style="text-align:right;">${detalle.cantidad}</td>
                    <td style="text-align:right;">S/ ${detalle.precioUnit.toFixed(2)}</td>
                    <td style="text-align:right;">S/ ${detalle.descuento.toFixed(2)}</td>
                    <td style="text-align:right;">S/ ${detalle.subtotal.toFixed(2)}</td>
                </tr>
            `
            )
            .join('');

        ventana.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>Comprobante de matrícula</title>
                    ${estilos}
                </head>
                <body>
                    <h1>Comprobante de matrícula</h1>
                    <div class="detalle">
                        <span><strong>N° matrícula:</strong> ${matriculaId}</span>
                        <span><strong>Fecha:</strong> ${fecha.toLocaleString()}</span>
                        <span><strong>Sede:</strong> ${sede}</span>
                        <span><strong>Ciclo:</strong> ${ciclo}</span>
                        <span><strong>Sección:</strong> ${seccion}</span>
                        ${
                            carrera
                                ? `<span><strong>Carrera:</strong> ${carrera}</span>`
                                : ''
                        }
                        <span><strong>Alumno:</strong> ${alumno}</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th style="text-align:right;">Cantidad</th>
                                <th style="text-align:right;">Precio unitario</th>
                                <th style="text-align:right;">Descuento</th>
                                <th style="text-align:right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" style="text-align:right;">Total</td>
                                <td style="text-align:right;">S/ ${total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p>Este documento es válido como comprobante de pago de la matrícula.</p>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 100);
                        };
                    </script>
                </body>
            </html>
        `);
        ventana.document.close();
    }
}
