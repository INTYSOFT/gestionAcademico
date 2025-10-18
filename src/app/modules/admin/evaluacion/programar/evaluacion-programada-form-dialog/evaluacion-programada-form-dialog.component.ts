import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    Inject,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
    catchError,
    distinctUntilChanged,
    finalize,
    map,
    shareReplay,
    skip,
    startWith,
    switchMap,
    tap,
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateTime } from 'luxon';
import {
    CreateEvaluacionProgramadaPayload,
    EvaluacionProgramada,
} from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { EvaluacionProgramadaSeccionService } from 'app/core/services/centro-estudios/evaluacion-programada-seccion.service';
import { EvaluacionProgramadaService } from 'app/core/services/centro-estudios/evaluacion-programada.service';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';

interface SeccionCicloOption {
    seccionCicloId: number;
    seccionId: number | null;
    label: string;
    activo: boolean;
}

export interface EvaluacionProgramadaFormDialogData {
    evaluacion: EvaluacionProgramada | null;
    evaluacionSecciones: EvaluacionProgramadaSeccion[];
    existingFechas: string[];
    sedes: Sede[];
    ciclos: Ciclo[];
    tiposEvaluacion: TipoEvaluacion[];
    secciones: Seccion[];
    selectedFecha?: string | null;
}

export type EvaluacionProgramadaFormDialogResult =
    | { action: 'created'; evaluacion: EvaluacionProgramada; secciones: EvaluacionProgramadaSeccion[] }
    | { action: 'updated'; evaluacion: EvaluacionProgramada; secciones: EvaluacionProgramadaSeccion[] };

@Component({
    selector: 'app-evaluacion-programada-form-dialog',
    standalone: true,
    templateUrl: './evaluacion-programada-form-dialog.component.html',
    styleUrls: ['./evaluacion-programada-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatProgressBarModule,
        MatIconModule,
        MatDatepickerModule,
    ],
})
export class EvaluacionProgramadaFormDialogComponent {
    protected readonly sedes = this.data.sedes;
    protected readonly tiposEvaluacion = this.data.tiposEvaluacion;

    protected readonly form = this.fb.group({
        nombre: this.fb.control('', {
            validators: [Validators.required, Validators.maxLength(150)],
            nonNullable: true,
        }),
        tipoEvaluacionId: this.fb.control<number | null>(null, {
            validators: [Validators.required],
        }),
        fechaInicio: this.fb.control<Date | DateTime | null>(null, {
            validators: [Validators.required, this.fechaUnicaValidator()],
        }),
        horaInicio: this.fb.control('', {
            validators: [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)],
            nonNullable: true,
        }),
        horaFin: this.fb.control('', {
            validators: [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)],
            nonNullable: true,
        }),
        sedeId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        cicloId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
        seccionCicloIds: this.fb.control<number[]>([], { validators: [Validators.required] }),
        activo: this.fb.control(true),
    });

    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    protected readonly ciclosDisponibles$ = this.form.controls.sedeId.valueChanges.pipe(
        startWith(this.data.evaluacion?.sedeId ?? null),
        distinctUntilChanged(),
        switchMap((sedeId) => this.obtenerCiclosDisponibles(sedeId)),
        shareReplay(1)
    );

    protected readonly seccionesDisponibles$ = combineLatest([
        this.form.controls.sedeId.valueChanges.pipe(startWith(this.data.evaluacion?.sedeId ?? null)),
        this.form.controls.cicloId.valueChanges.pipe(startWith(this.data.evaluacion?.cicloId ?? null)),
    ]).pipe(
        switchMap(([sedeId, cicloId]) => this.obtenerSeccionesDisponibles(sedeId, cicloId)),
        shareReplay(1)
    );

    private readonly destroyRef = inject(DestroyRef);
    private readonly seccionCicloOptions = new Map<number, SeccionCicloOption>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly dialogRef: MatDialogRef<
            EvaluacionProgramadaFormDialogComponent,
            EvaluacionProgramadaFormDialogResult | undefined
        >,
        private readonly evaluacionProgramadaService: EvaluacionProgramadaService,
        private readonly evaluacionProgramadaSeccionService: EvaluacionProgramadaSeccionService,
        private readonly aperturaCicloService: AperturaCicloService,
        private readonly seccionCicloService: SeccionCicloService,
        @Inject(MAT_DIALOG_DATA) protected readonly data: EvaluacionProgramadaFormDialogData
    ) {
        this.establecerValoresIniciales();
        this.configurarResetsDependientes();
        this.observarCiclosDisponibles();
        this.observarSeccionesDisponibles();
        this.form.setValidators(this.validarRangoHorario());
    }

    protected cancelar(): void {
        this.dialogRef.close();
    }

    protected guardar(): void {
        if (this.form.invalid || this.isSaving$.value) {
            this.form.markAllAsTouched();
            return;
        }

        const fechaControl = this.form.controls.fechaInicio;
        const fechaInicioIso = this.formatFechaControl(fechaControl.value);
        if (!fechaInicioIso) {
            this.mostrarError('La fecha de inicio seleccionada no es válida.');
            const currentErrors = fechaControl.errors ?? {};
            fechaControl.setErrors({ ...currentErrors, fechaInvalida: true });
            fechaControl.markAsTouched();
            return;
        }

        if (fechaControl.hasError('fechaInvalida')) {
            const { fechaInvalida: _ignored, ...rest } = fechaControl.errors ?? {};
            fechaControl.setErrors(Object.keys(rest).length ? rest : null);
        }

        const payload = this.construirPayload(fechaInicioIso);
        const opcionesSeleccionadas = this.obtenerOpcionesSeleccionadas();

        this.isSaving$.next(true);
        this.form.disable();

        const evaluacion = this.data.evaluacion;

        const request$ = evaluacion
            ? this.actualizarEvaluacion(evaluacion, payload, opcionesSeleccionadas)
            : this.crearEvaluacion(payload, opcionesSeleccionadas);

        request$
            .pipe(
                finalize(() => {
                    this.isSaving$.next(false);
                    this.form.enable();
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (result) => {
                    this.dialogRef.close(result);
                },
                error: (error) => {
                    this.mostrarError(
                        error?.message || 'No fue posible guardar la evaluación programada.'
                    );
                },
            });
    }

    protected compararPorId(option: { id: number } | null, value: number | null): boolean {
        return !!option && option.id === value;
    }

    protected mostrarError(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 6000,
            panelClass: ['mat-mdc-snack-bar-container-error'],
            horizontalPosition: 'end',
            verticalPosition: 'top',
        });
    }

    private establecerValoresIniciales(): void {
        const evaluacion = this.data.evaluacion;
        const fechaPorDefecto = evaluacion?.fechaInicio ?? this.data.selectedFecha ?? null;

        this.form.patchValue({
            nombre: evaluacion?.nombre ?? '',
            tipoEvaluacionId: evaluacion?.tipoEvaluacionId ?? null,
            fechaInicio: fechaPorDefecto ? this.parseFecha(fechaPorDefecto) : null,
            horaInicio: this.parseHora(evaluacion?.horaInicio) ?? '08:00',
            horaFin: this.parseHora(evaluacion?.horaFin) ?? '10:00',
            sedeId: evaluacion?.sedeId ?? null,
            cicloId: evaluacion?.cicloId ?? null,
            seccionCicloIds: this.data.evaluacionSecciones.map((item) => item.seccionCicloId),
            activo: evaluacion?.activo ?? true,
        });

        this.agregarOpcionesInicialesSecciones();
    }

    private configurarResetsDependientes(): void {
        this.form.controls.sedeId.valueChanges
            .pipe(
                skip(1),
                tap(() => {
                    this.form.controls.cicloId.setValue(null);
                    this.form.controls.seccionCicloIds.setValue([]);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        this.form.controls.cicloId.valueChanges
            .pipe(
                skip(1),
                tap(() => this.form.controls.seccionCicloIds.setValue([])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();

        this.form.controls.fechaInicio.valueChanges
            .pipe(
                tap(() => {
                    const control = this.form.controls.fechaInicio;
                    if (control.hasError('fechaInvalida')) {
                        const { fechaInvalida: _ignored, ...rest } = control.errors ?? {};
                        control.setErrors(Object.keys(rest).length ? rest : null);
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    private observarCiclosDisponibles(): void {
        this.ciclosDisponibles$
            .pipe(
                tap((ciclos) => {
                    const cicloId = this.form.controls.cicloId.value;
                    if (cicloId && !ciclos.some((ciclo) => ciclo.id === cicloId)) {
                        this.form.controls.cicloId.setValue(null);
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    private observarSeccionesDisponibles(): void {
        this.seccionesDisponibles$
            .pipe(
                tap((opciones) => {
                    opciones.forEach((opcion) => this.seccionCicloOptions.set(opcion.seccionCicloId, opcion));

                    const seleccionadas = this.form.controls.seccionCicloIds.value ?? [];
                    const filtradas = seleccionadas.filter((id) =>
                        opciones.some((opcion) => opcion.seccionCicloId === id)
                    );

                    if (filtradas.length !== seleccionadas.length) {
                        this.form.controls.seccionCicloIds.setValue(filtradas);
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    private fechaUnicaValidator() {
        const fechas = new Set(
            this.data.existingFechas
                .map((fecha) => this.formatFechaControl(fecha))
                .filter((fecha): fecha is string => !!fecha)
        );
        const fechaActual = this.formatFechaControl(
            this.data.evaluacion?.fechaInicio ?? null
        );

        return (control: AbstractControl) => {
            const value = control.value;
            if (!value) {
                return null;
            }

            const isoDate = this.formatFechaControl(value);
            if (!isoDate) {
                return null;
            }

            if (fechaActual && isoDate === fechaActual) {
                return null;
            }

            return fechas.has(isoDate) ? { fechaDuplicada: true } : null;
        };
    }

    private validarRangoHorario() {
        return (group: AbstractControl) => {
            const horaInicio = group.get('horaInicio')?.value;
            const horaFin = group.get('horaFin')?.value;

            if (!horaInicio || !horaFin) {
                return null;
            }

            const inicio = this.convertirHoraAHoras(horaInicio);
            const fin = this.convertirHoraAHoras(horaFin);

            if (inicio === null || fin === null || fin > inicio) {
                return null;
            }

            return { rangoHorarioInvalido: true };
        };
    }

    private obtenerCiclosDisponibles(sedeId: number | null): Observable<Ciclo[]> {
        if (!sedeId) {
            return of([]);
        }

        const cicloActual = this.form.controls.cicloId.value;

        return this.aperturaCicloService.listBySede(sedeId).pipe(
            switchMap((aperturas) => {
                if (!aperturas.length) {
                    return of(this.incluirCicloActual([], cicloActual));
                }

                const cicloIds = new Set(aperturas.map((apertura) => apertura.cicloId));
                const ahora = DateTime.now().startOf('day');

                const ciclosElegibles = this.data.ciclos.filter((ciclo) => {
                    if (!cicloIds.has(ciclo.id)) {
                        return false;
                    }

                    if (!ciclo.activo) {
                        return false;
                    }

                    const apertura = ciclo.fechaAperturaInscripcion
                        ? DateTime.fromISO(ciclo.fechaAperturaInscripcion).startOf('day')
                        : null;
                    const cierre = ciclo.fechaCierreInscripcion
                        ? DateTime.fromISO(ciclo.fechaCierreInscripcion).endOf('day')
                        : null;

                    if (apertura && ahora < apertura) {
                        return false;
                    }

                    if (cierre && ahora > cierre) {
                        return false;
                    }

                    return true;
                });

                return of(this.incluirCicloActual(ciclosElegibles, cicloActual));
            }),
            catchError(() => of(this.incluirCicloActual([], cicloActual)))
        );
    }

    private obtenerSeccionesDisponibles(
        sedeId: number | null,
        cicloId: number | null
    ): Observable<SeccionCicloOption[]> {
        if (!sedeId || !cicloId) {
            return of([]);
        }

        const seleccionInicial = this.data.evaluacionSecciones;

        return this.seccionCicloService.listBySedeAndCiclo(sedeId, cicloId).pipe(
            map((seccionCiclos) => {
                const activos = seccionCiclos.filter((item) => item.activo);
                const opciones = activos.map((item) => this.crearSeccionCicloOption(item));

                seleccionInicial
                    .filter(
                        (item) =>
                            item.seccionCicloId &&
                            !opciones.some((op) => op.seccionCicloId === item.seccionCicloId)
                    )
                    .forEach((item) => {
                        opciones.push({
                            seccionCicloId: item.seccionCicloId,
                            seccionId: item.seccionId ?? null,
                            label: `${this.obtenerNombreSeccion(item.seccionId)} (Histórico)`,
                            activo: item.activo,
                        });
                    });

                return opciones;
            }),
            catchError(() => of([]))
        );
    }

    private crearSeccionCicloOption(seccionCiclo: SeccionCiclo): SeccionCicloOption {
        const nombreSeccion = this.obtenerNombreSeccion(seccionCiclo.seccionId);
        return {
            seccionCicloId: seccionCiclo.id,
            seccionId: seccionCiclo.seccionId,
            label: `${nombreSeccion} · Capacidad ${seccionCiclo.capacidad}`,
            activo: seccionCiclo.activo,
        };
    }

    private obtenerNombreSeccion(seccionId: number | null): string {
        if (!seccionId) {
            return 'Sin sección';
        }

        return (
            this.data.secciones.find((seccion) => seccion.id === seccionId)?.nombre ??
            `Sección #${seccionId}`
        );
    }

    private incluirCicloActual(ciclos: Ciclo[], cicloActual: number | null): Ciclo[] {
        if (!cicloActual) {
            return ciclos;
        }

        const existe = ciclos.some((ciclo) => ciclo.id === cicloActual);
        if (existe) {
            return ciclos;
        }

        const ciclo = this.data.ciclos.find((item) => item.id === cicloActual);
        if (!ciclo) {
            return ciclos;
        }

        return [...ciclos, ciclo].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    private agregarOpcionesInicialesSecciones(): void {
        this.data.evaluacionSecciones.forEach((item) => {
            if (item.seccionCicloId) {
                this.seccionCicloOptions.set(item.seccionCicloId, {
                    seccionCicloId: item.seccionCicloId,
                    seccionId: item.seccionId ?? null,
                    label: `${this.obtenerNombreSeccion(item.seccionId)} (Histórico)`,
                    activo: item.activo,
                });
            }
        });
    }

    private construirPayload(fechaInicioIso: string): CreateEvaluacionProgramadaPayload {
        const raw = this.form.getRawValue();

        return {
            nombre: raw.nombre.trim(),
            tipoEvaluacionId: raw.tipoEvaluacionId!,
            fechaInicio: fechaInicioIso,
            horaInicio: this.normalizarHora(raw.horaInicio),
            horaFin: this.normalizarHora(raw.horaFin),
            sedeId: raw.sedeId!,
            cicloId: raw.cicloId!,
            carreraId: null,
            activo: raw.activo ?? true,
        };
    }

    private obtenerOpcionesSeleccionadas(): SeccionCicloOption[] {
        const seleccionados = this.form.controls.seccionCicloIds.value ?? [];
        return seleccionados
            .map((id) => this.seccionCicloOptions.get(id))
            .filter((opcion): opcion is SeccionCicloOption => !!opcion)
            .map((opcion) => ({
                ...opcion,
                activo: true,
            }));
    }

    private crearEvaluacion(
        payload: CreateEvaluacionProgramadaPayload,
        opciones: SeccionCicloOption[]
    ): Observable<EvaluacionProgramadaFormDialogResult> {
        return this.evaluacionProgramadaService.create(payload).pipe(
            switchMap((evaluacion) =>
                this.guardarSecciones(evaluacion.id, opciones).pipe(
                    switchMap(() =>
                        this.evaluacionProgramadaSeccionService
                            .listByEvaluacionProgramada(evaluacion.id)
                            .pipe(map((secciones) => ({ action: 'created' as const, evaluacion, secciones })))
                    )
                )
            )
        );
    }

    private actualizarEvaluacion(
        evaluacion: EvaluacionProgramada,
        payload: CreateEvaluacionProgramadaPayload,
        opciones: SeccionCicloOption[]
    ): Observable<EvaluacionProgramadaFormDialogResult> {
        return this.evaluacionProgramadaService.update(evaluacion.id, payload).pipe(
            switchMap((evaluacionActualizada) =>
                this.sincronizarSecciones(evaluacionActualizada.id, opciones).pipe(
                    switchMap(() =>
                        this.evaluacionProgramadaSeccionService
                            .listByEvaluacionProgramada(evaluacionActualizada.id)
                            .pipe(
                                map((secciones) => ({
                                    action: 'updated' as const,
                                    evaluacion: evaluacionActualizada,
                                    secciones,
                                }))
                            )
                    )
                )
            )
        );
    }

    private guardarSecciones(
        evaluacionId: number,
        opciones: SeccionCicloOption[]
    ): Observable<unknown> {
        if (!opciones.length) {
            return of(null);
        }

        const payloads = opciones.map((opcion) => ({
            evaluacionProgramadaId: evaluacionId,
            seccionCicloId: opcion.seccionCicloId,
            seccionId: opcion.seccionId,
            activo: opcion.activo ?? true,
        }));

        return this.evaluacionProgramadaSeccionService.createMany(payloads);
    }

    private sincronizarSecciones(
        evaluacionId: number,
        opciones: SeccionCicloOption[]
    ): Observable<unknown> {
        const existentes = this.data.evaluacionSecciones;
        const existentesMap = new Map(
            existentes.map((item) => [item.seccionCicloId, item])
        );
        const seleccionadosIds = new Set(opciones.map((opcion) => opcion.seccionCicloId));

        const aCrear = opciones.filter(
            (opcion) => !existentesMap.has(opcion.seccionCicloId)
        );

        const aActivar = opciones
            .map((opcion) => existentesMap.get(opcion.seccionCicloId))
            .filter(
                (existente): existente is EvaluacionProgramadaSeccion =>
                    !!existente && !existente.activo
            );

        const aDesactivar = existentes.filter(
            (item) => item.activo && !seleccionadosIds.has(item.seccionCicloId)
        );

        const operaciones: Observable<unknown>[] = [];

        if (aCrear.length) {
            operaciones.push(this.guardarSecciones(evaluacionId, aCrear));
        }

        aActivar.forEach((item) => {
            operaciones.push(
                this.evaluacionProgramadaSeccionService.update(item.id, { activo: true })
            );
        });

        aDesactivar.forEach((item) => {
            operaciones.push(
                this.evaluacionProgramadaSeccionService.update(item.id, { activo: false })
            );
        });

        if (!operaciones.length) {
            return of(null);
        }

        return forkJoin(operaciones);
    }

    private formatFechaControl(value: Date | DateTime | string | null): string | null {
        if (!value) {
            return null;
        }

        if (this.isLuxonDateTime(value)) {
            return value.isValid ? value.toISODate() : null;
        }

        if (value instanceof Date) {
            return DateTime.fromJSDate(value).toISODate();
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }

            let parsed = DateTime.fromISO(trimmed);
            if (parsed.isValid) {
                return parsed.toISODate();
            }

            parsed = DateTime.fromFormat(trimmed, 'd/M/yyyy');
            if (parsed.isValid) {
                return parsed.toISODate();
            }

            parsed = DateTime.fromFormat(trimmed, 'd/M/yy');
            if (parsed.isValid) {
                return parsed.toISODate();
            }

            parsed = DateTime.fromFormat(trimmed, "d 'de' MMMM 'de' yyyy", { locale: 'es' });
            if (parsed.isValid) {
                return parsed.toISODate();
            }

            return null;
        }

        return null;
    }

    private parseFecha(value: string | null | undefined): DateTime | null {
        if (!value) {
            return null;
        }

        const dt = DateTime.fromISO(value);
        return dt.isValid ? dt : null;
    }

    private parseHora(value: string | null | undefined): string | null {
        if (!value) {
            return null;
        }

        const partes = value.split(':');
        if (partes.length < 2) {
            return null;
        }

        return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
    }

    private normalizarHora(value: string): string {
        const partes = value.split(':');
        if (partes.length < 2) {
            return value;
        }

        const horas = partes[0].padStart(2, '0');
        const minutos = partes[1].padStart(2, '0');

        return `${horas}:${minutos}:00`;
    }

    private convertirHoraAHoras(value: string): number | null {
        const partes = value.split(':');
        if (partes.length < 2) {
            return null;
        }

        const horas = Number(partes[0]);
        const minutos = Number(partes[1]);

        if (Number.isNaN(horas) || Number.isNaN(minutos)) {
            return null;
        }

        return horas + minutos / 60;
    }

    private isLuxonDateTime(value: unknown): value is DateTime {
        return DateTime.isDateTime(value);
    }

}
