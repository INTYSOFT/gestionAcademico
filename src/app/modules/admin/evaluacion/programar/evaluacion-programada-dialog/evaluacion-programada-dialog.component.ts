import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
    BehaviorSubject,
    Observable,
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
import {
    CreateEvaluacionProgramadaPayload,
    EvaluacionProgramada,
    UpdateEvaluacionProgramadaPayload,
} from 'app/core/models/centro-estudios/evaluacion-programada.model';
import {
    EvaluacionProgramadaSeccion,
    CreateEvaluacionProgramadaSeccionPayload,
    UpdateEvaluacionProgramadaSeccionPayload,
} from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { AperturaCiclo } from 'app/core/models/centro-estudios/apertura-ciclo.model';
import { SeccionCiclo } from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaSeccionesService } from 'app/core/services/centro-estudios/evaluacion-programada-secciones.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';

export interface EvaluacionProgramadaDialogData {
    mode: 'create' | 'edit';
    existingFechas: string[];
    evaluacion: EvaluacionProgramada | null;
    secciones: EvaluacionProgramadaSeccion[];
}

export interface EvaluacionProgramadaDialogResult {
    action: 'created' | 'updated';
    evaluacion: EvaluacionProgramada;
    secciones: EvaluacionProgramadaSeccion[];
}

interface SeccionOption {
    seccionCicloId: number;
    seccionId: number | null;
    label: string;
    activo: boolean;
}

@Component({
    selector: 'app-evaluacion-programada-dialog',
    standalone: true,
    templateUrl: './evaluacion-programada-dialog.component.html',
    styleUrls: ['./evaluacion-programada-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDialogModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatSnackBarModule,
    ],
})
export class EvaluacionProgramadaDialogComponent implements OnInit, OnDestroy {
    protected readonly form: FormGroup;

    protected readonly sedes$ = new BehaviorSubject<Sede[]>([]);
    protected readonly filteredCiclos$ = new BehaviorSubject<Ciclo[]>([]);
    protected readonly tipoEvaluaciones$ = new BehaviorSubject<TipoEvaluacion[]>([]);
    protected readonly carreras$ = new BehaviorSubject<Carrera[]>([]);
    protected readonly secciones$ = new BehaviorSubject<Seccion[]>([]);
    protected readonly seccionOptions$ = new BehaviorSubject<SeccionOption[]>([]);

    protected readonly isLoadingCatalogs$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingCiclos$ = new BehaviorSubject<boolean>(false);
    protected readonly isLoadingSecciones$ = new BehaviorSubject<boolean>(false);
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    protected readonly dialogTitle =
        this.data.mode === 'create' ? 'Registrar evaluación programada' : 'Editar evaluación programada';

    private readonly destroy$ = new Subject<void>();
    private readonly existingFechasSet = new Set(this.data.existingFechas);
    private ciclosCache: Ciclo[] = [];
    private initialSeccionRecords: EvaluacionProgramadaSeccion[] = [...this.data.secciones];

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialogRef: MatDialogRef<
            EvaluacionProgramadaDialogComponent,
            EvaluacionProgramadaDialogResult
        >,
        @Inject(MAT_DIALOG_DATA) private readonly data: EvaluacionProgramadaDialogData,
        private readonly evaluacionProgramadasService: EvaluacionProgramadasService,
        private readonly evaluacionProgramadaSeccionesService: EvaluacionProgramadaSeccionesService,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService,
        private readonly carrerasService: CarrerasService,
        private readonly seccionesService: SeccionesService,
        private readonly aperturaCicloService: AperturaCicloService,
        private readonly seccionCicloService: SeccionCicloService,
        private readonly snackBar: MatSnackBar
    ) {
        this.form = this.fb.group({
            nombre: this.fb.control('', {
                validators: [Validators.required, Validators.maxLength(150)],
            }),
            tipoEvaluacionId: this.fb.control<number | null>(null, {
                validators: [Validators.required],
            }),
            sedeId: this.fb.control<number | null>(null, {
                validators: [Validators.required],
            }),
            cicloId: this.fb.control<number | null>(null, {
                validators: [Validators.required],
            }),
            fechaInicio: this.fb.control<Date | null>(null, {
                validators: [Validators.required, this.fechaDuplicadaValidator.bind(this)],
            }),
            horaInicio: this.fb.control('', {
                validators: [Validators.required],
            }),
            horaFin: this.fb.control('', {
                validators: [Validators.required],
            }),
            carreraId: this.fb.control<number | null>(null),
            activo: this.fb.control(true, { nonNullable: true }),
            seccionCicloIds: this.fb.control<number[]>([], {
                validators: [Validators.required],
                nonNullable: true,
            }),
        });

        this.form.setValidators(this.horarioValidator.bind(this));
    }

    ngOnInit(): void {
        this.loadCatalogs();
        this.handleSedeChanges();
        this.handleCicloChanges();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildEvaluacionPayload();

        if (!payload) {
            return;
        }

        this.isSaving$.next(true);

        const selectedSeccionIds = this.form.controls['seccionCicloIds'].value ?? [];

        const save$ = this.data.mode === 'create'
            ? this.evaluacionProgramadasService.create(payload).pipe(
                  switchMap((evaluacion) =>
                      this.syncSecciones(evaluacion.id, selectedSeccionIds).pipe(
                          map((secciones) => ({ evaluacion, secciones }))
                      )
                  )
              )
            : this.evaluacionProgramadasService
                  .update(this.data.evaluacion!.id, payload as UpdateEvaluacionProgramadaPayload)
                  .pipe(
                      switchMap((evaluacion) =>
                          this.syncSecciones(evaluacion.id, selectedSeccionIds).pipe(
                              map((secciones) => ({ evaluacion, secciones }))
                          )
                      )
                  );

        save$
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: ({ evaluacion, secciones }) => {
                    const action = this.data.mode === 'create' ? 'created' : 'updated';
                    this.dialogRef.close({ action, evaluacion, secciones });
                },
                error: (error) => {
                    this.dialogRef.disableClose = false;
                    this.isSaving$.next(false);
                    this.snackBar.open(
                        error.message ?? 'No fue posible guardar la evaluación programada.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                },
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    private loadCatalogs(): void {
        this.isLoadingCatalogs$.next(true);

        forkJoin({
            sedes: this.sedeService.getSedes().pipe(catchError(() => of([]))),
            ciclos: this.ciclosService.listAll().pipe(catchError(() => of([]))),
            tipos: this.tipoEvaluacionesService.listAll().pipe(catchError(() => of([]))),
            carreras: this.carrerasService.list().pipe(catchError(() => of([]))),
            secciones: this.seccionesService.list().pipe(catchError(() => of([]))),
        })
            .pipe(
                finalize(() => this.isLoadingCatalogs$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: ({ sedes, ciclos, tipos, carreras, secciones }) => {
                    this.sedes$.next(sedes);
                    this.ciclosCache = ciclos;
                    this.tipoEvaluaciones$.next(tipos);
                    this.carreras$.next(carreras);
                    this.secciones$.next(secciones);

                    if (this.data.mode === 'edit' && this.data.evaluacion) {
                        this.patchFormWithEvaluacion(this.data.evaluacion);
                    }
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'No fue posible cargar la información necesaria.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                },
            });
    }

    private handleSedeChanges(): void {
        this.form.controls['sedeId'].valueChanges
            .pipe(
                takeUntil(this.destroy$),
                switchMap((sedeId) => {
                    this.form.controls['cicloId'].setValue(null);
                    this.form.controls['seccionCicloIds'].setValue([]);
                    this.filteredCiclos$.next([]);

                    if (sedeId === null || sedeId === undefined) {
                        return of<AperturaCiclo[]>([]);
                    }

                    this.isLoadingCiclos$.next(true);
                    return this.aperturaCicloService
                        .listBySede(sedeId)
                        .pipe(
                            catchError((error) => {
                                this.snackBar.open(
                                    error.message ?? 'No fue posible obtener las aperturas de ciclo.',
                                    'Cerrar',
                                    { duration: 5000 }
                                );
                                return of([]);
                            }),
                            finalize(() => this.isLoadingCiclos$.next(false))
                        );
                })
            )
            .subscribe((aperturas) => {
                this.filteredCiclos$.next(this.filterCiclos(aperturas));

                if (this.data.mode === 'edit' && this.data.evaluacion) {
                    const cicloId = this.data.evaluacion.cicloId;
                    if (cicloId !== null && cicloId !== undefined) {
                        const currentValue = this.form.controls['cicloId'].value;
                        if (currentValue === null || currentValue === undefined) {
                            this.form.controls['cicloId'].setValue(cicloId);
                        }
                    }
                }
            });
    }

    private handleCicloChanges(): void {
        this.form.controls['cicloId'].valueChanges
            .pipe(
                takeUntil(this.destroy$),
                switchMap((cicloId) => {
                    const sedeId = this.form.controls['sedeId'].value;
                    this.form.controls['seccionCicloIds'].setValue([]);
                    this.seccionOptions$.next([]);

                    if (
                        cicloId === null ||
                        cicloId === undefined ||
                        sedeId === null ||
                        sedeId === undefined
                    ) {
                        return of<SeccionCiclo[]>([]);
                    }

                    this.isLoadingSecciones$.next(true);
                    return this.seccionCicloService
                        .listBySedeAndCiclo(sedeId, cicloId)
                        .pipe(
                            catchError((error) => {
                                this.snackBar.open(
                                    error.message ?? 'No fue posible obtener las secciones asociadas.',
                                    'Cerrar',
                                    { duration: 5000 }
                                );
                                return of([]);
                            }),
                            finalize(() => this.isLoadingSecciones$.next(false))
                        );
                })
            )
            .subscribe((seccionCiclos) => {
                const options = this.buildSeccionOptions(seccionCiclos);
                this.seccionOptions$.next(options);

                if (this.data.mode === 'edit' && this.initialSeccionRecords.length) {
                    const initialIds = this.initialSeccionRecords.map((item) => item.seccionCicloId);
                    this.form.controls['seccionCicloIds'].setValue(initialIds);
                }
            });
    }

    private buildSeccionOptions(seccionCiclos: SeccionCiclo[]): SeccionOption[] {
        const initialIds = new Set(this.initialSeccionRecords.map((item) => item.seccionCicloId));
        const seccionOptions: SeccionOption[] = seccionCiclos
            .filter((seccionCiclo) => seccionCiclo.activo || initialIds.has(seccionCiclo.id))
            .map((seccionCiclo) => ({
                seccionCicloId: seccionCiclo.id,
                seccionId: seccionCiclo.seccionId,
                label: this.getSeccionLabel(seccionCiclo.seccionId),
                activo: seccionCiclo.activo,
            }));

        this.initialSeccionRecords.forEach((record) => {
            if (!seccionOptions.some((option) => option.seccionCicloId === record.seccionCicloId)) {
                seccionOptions.push({
                    seccionCicloId: record.seccionCicloId,
                    seccionId: record.seccionId ?? null,
                    label: this.getSeccionLabel(record.seccionId ?? null),
                    activo: record.activo,
                });
            }
        });

        return seccionOptions;
    }

    private getSeccionLabel(seccionId: number | null): string {
        if (seccionId === null || seccionId === undefined) {
            return 'Sección sin asignar';
        }

        return this.secciones$.value.find((seccion) => seccion.id === seccionId)?.nombre ?? `Sección #${seccionId}`;
    }

    private filterCiclos(aperturas: AperturaCiclo[]): Ciclo[] {
        const today = DateTime.now().startOf('day');
        const activeCicloIds = aperturas.filter((apertura) => apertura.activo).map((apertura) => apertura.cicloId);
        const activeSet = new Set(activeCicloIds);
        const currentCicloId = this.data.mode === 'edit' ? this.data.evaluacion?.cicloId ?? null : null;

        return this.ciclosCache.filter((ciclo) => {
            if (!ciclo.activo && ciclo.id !== currentCicloId) {
                return false;
            }

            if (!activeSet.has(ciclo.id) && ciclo.id !== currentCicloId) {
                return false;
            }

            const aperturaInicio = ciclo.fechaAperturaInscripcion
                ? DateTime.fromISO(ciclo.fechaAperturaInscripcion).startOf('day')
                : null;
            const aperturaFin = ciclo.fechaCierreInscripcion
                ? DateTime.fromISO(ciclo.fechaCierreInscripcion).startOf('day')
                : null;

            const isWithinRange =
                (!aperturaInicio || today >= aperturaInicio) && (!aperturaFin || today <= aperturaFin);

            return isWithinRange || ciclo.id === currentCicloId;
        });
    }

    private patchFormWithEvaluacion(evaluacion: EvaluacionProgramada): void {
        this.form.patchValue({
            nombre: evaluacion.nombre,
            tipoEvaluacionId: evaluacion.tipoEvaluacionId,
            sedeId: evaluacion.sedeId,
            cicloId: evaluacion.cicloId,
            fechaInicio: this.parseDate(evaluacion.fechaInicio),
            horaInicio: this.parseHora(evaluacion.horaInicio),
            horaFin: this.parseHora(evaluacion.horaFin),
            carreraId: evaluacion.carreraId,
            activo: evaluacion.activo,
        });
    }

    private parseDate(value: string): Date | null {
        const date = DateTime.fromISO(value);
        return date.isValid ? date.toJSDate() : null;
    }

    private parseHora(value: string): string {
        if (!value) {
            return '';
        }

        const normalized = value.length === 5 ? value : value.slice(0, 5);
        return normalized;
    }

    private buildEvaluacionPayload(): CreateEvaluacionProgramadaPayload | null {
        const nombre = this.form.controls['nombre'].value?.trim();
        const tipoEvaluacionId = this.form.controls['tipoEvaluacionId'].value;
        const sedeId = this.form.controls['sedeId'].value;
        const cicloId = this.form.controls['cicloId'].value;
        const fechaInicioDate = this.form.controls['fechaInicio'].value;
        const horaInicio = this.form.controls['horaInicio'].value;
        const horaFin = this.form.controls['horaFin'].value;
        const carreraId = this.form.controls['carreraId'].value;
        const activo = this.form.controls['activo'].value ?? true;

        if (
            !nombre ||
            tipoEvaluacionId === null ||
            tipoEvaluacionId === undefined ||
            sedeId === null ||
            sedeId === undefined ||
            fechaInicioDate === null ||
            !horaInicio ||
            !horaFin
        ) {
            return null;
        }

        const fechaInicio = this.formatDate(fechaInicioDate);
        const horaInicioNormalized = this.formatTime(horaInicio);
        const horaFinNormalized = this.formatTime(horaFin);

        return {
            nombre,
            tipoEvaluacionId,
            sedeId,
            cicloId: cicloId ?? null,
            fechaInicio,
            horaInicio: horaInicioNormalized,
            horaFin: horaFinNormalized,
            carreraId: carreraId ?? null,
            activo: !!activo,
        };
    }

    private formatDate(date: Date): string {
        return DateTime.fromJSDate(date).toISODate();
    }

    private formatTime(value: string): string {
        const normalized = value.length === 5 ? `${value}:00` : value;
        const parsed = DateTime.fromFormat(normalized, 'HH:mm:ss');
        return parsed.isValid ? parsed.toFormat('HH:mm:ss') : normalized;
    }

    private fechaDuplicadaValidator(control: { value: Date | null }): { fechaDuplicada: boolean } | null {
        if (!control.value) {
            return null;
        }

        const fecha = this.formatDate(control.value);

        if (this.data.mode === 'edit' && this.data.evaluacion?.fechaInicio === fecha) {
            return null;
        }

        return this.existingFechasSet.has(fecha) ? { fechaDuplicada: true } : null;
    }

    private horarioValidator(form: FormGroup): { horarioInvalido: boolean } | null {
        const inicio = form.controls['horaInicio'].value;
        const fin = form.controls['horaFin'].value;

        if (!inicio || !fin) {
            return null;
        }

        const inicioMinutes = this.timeToMinutes(inicio);
        const finMinutes = this.timeToMinutes(fin);

        if (inicioMinutes === null || finMinutes === null) {
            return null;
        }

        return finMinutes > inicioMinutes ? null : { horarioInvalido: true };
    }

    private timeToMinutes(value: string): number | null {
        const normalized = value.length === 5 ? value : value.slice(0, 5);
        const parsed = DateTime.fromFormat(normalized, 'HH:mm');
        return parsed.isValid ? parsed.hour * 60 + parsed.minute : null;
    }

    private syncSecciones(
        evaluacionId: number,
        selectedSeccionCicloIds: number[]
    ): Observable<EvaluacionProgramadaSeccion[]> {
        const options = this.seccionOptions$.value;
        const existing = new Map<number, EvaluacionProgramadaSeccion>(
            this.initialSeccionRecords.map((record) => [record.seccionCicloId, record])
        );

        const operations: Observable<EvaluacionProgramadaSeccion>[] = [];

        selectedSeccionCicloIds.forEach((seccionCicloId) => {
            const seccionId = options.find((option) => option.seccionCicloId === seccionCicloId)?.seccionId ?? null;
            const current = existing.get(seccionCicloId);

            if (!current) {
                const payload: CreateEvaluacionProgramadaSeccionPayload = {
                    evaluacionProgramadaId: evaluacionId,
                    seccionCicloId,
                    seccionId,
                    activo: true,
                };
                operations.push(this.evaluacionProgramadaSeccionesService.create(payload));
            } else if (!current.activo || current.seccionId !== seccionId) {
                const payload: UpdateEvaluacionProgramadaSeccionPayload = {
                    evaluacionProgramadaId: evaluacionId,
                    seccionCicloId,
                    seccionId,
                    activo: true,
                };
                operations.push(this.evaluacionProgramadaSeccionesService.update(current.id, payload));
            } else {
                operations.push(of(current));
            }
        });

        this.initialSeccionRecords.forEach((record) => {
            if (!selectedSeccionCicloIds.includes(record.seccionCicloId) && record.activo) {
                const payload: UpdateEvaluacionProgramadaSeccionPayload = {
                    evaluacionProgramadaId: evaluacionId,
                    seccionCicloId: record.seccionCicloId,
                    seccionId: record.seccionId ?? null,
                    activo: false,
                };
                operations.push(this.evaluacionProgramadaSeccionesService.update(record.id, payload));
            } else if (!selectedSeccionCicloIds.includes(record.seccionCicloId)) {
                operations.push(of(record));
            }
        });

        if (!operations.length) {
            return of([...this.initialSeccionRecords]);
        }

        return forkJoin(operations).pipe(
            map((results) => {
                const unique = new Map<number, EvaluacionProgramadaSeccion>();
                results.forEach((item) => unique.set(item.id, item));
                this.initialSeccionRecords = Array.from(unique.values());
                return this.initialSeccionRecords;
            })
        );
    }
}
