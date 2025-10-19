import { AsyncPipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    ViewEncapsulation,
    inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { EvaluacionDetalle } from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaSeccionesService } from 'app/core/services/centro-estudios/evaluacion-programada-secciones.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { EvaluacionDetallesService } from 'app/core/services/centro-estudios/evaluacion-detalles.service';
import { TipoEvaluacionFormDialogComponent } from '../tipo-evaluacion/tipo-evaluacion-form-dialog/tipo-evaluacion-form-dialog.component';
import type { TipoEvaluacionFormDialogResult } from '../tipo-evaluacion/tipo-evaluacion-form-dialog/tipo-evaluacion-form-dialog.component';
import { EvaluacionDetalleFormDialogComponent } from './evaluacion-detalle-form-dialog/evaluacion-detalle-form-dialog.component';
import type { EvaluacionDetalleFormDialogResult } from './evaluacion-detalle-form-dialog/evaluacion-detalle-form-dialog.component';

interface EvaluacionSeccionTabView {
    key: string;
    label: string;
    seccionId: number | null;
    evaluacionSeccion: EvaluacionProgramadaSeccion | null;
    detalles: EvaluacionDetalle[];
}

@Component({
    selector: 'app-evaluacion-puntuacion',
    standalone: true,
    templateUrl: './evaluacion-puntuacion.component.html',
    styleUrls: ['./evaluacion-puntuacion.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        DecimalPipe,
        NgClass,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatDividerModule,
    ],
})
export class EvaluacionPuntuacionComponent implements OnInit {
    protected readonly dateControl = this.fb.control<Date | null>(new Date(), {
        validators: [Validators.required],
    });

    protected readonly trackByEvaluacion = (_: number, evaluacion: EvaluacionProgramada) =>
        evaluacion.id;
    protected readonly trackByTab = (_: number, tab: EvaluacionSeccionTabView) => tab.key;
    protected readonly trackByDetalle = (_: number, detalle: EvaluacionDetalle) => detalle.id;

    private readonly evaluacionesSubject = new BehaviorSubject<EvaluacionProgramada[]>([]);
    private readonly selectedEvaluacionSubject = new BehaviorSubject<
        EvaluacionProgramada | null
    >(null);
    private readonly seccionesEvaluacionSubject = new BehaviorSubject<
        EvaluacionProgramadaSeccion[]
    >([]);
    private readonly evaluacionDetallesSubject = new BehaviorSubject<EvaluacionDetalle[]>([]);
    private readonly seccionTabsSubject = new BehaviorSubject<EvaluacionSeccionTabView[]>([]);
    private readonly tipoEvaluacionSubject = new BehaviorSubject<TipoEvaluacion | null>(null);

    private readonly isLoadingEvaluacionesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingSeccionesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingDetallesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingTipoEvaluacionSubject = new BehaviorSubject<boolean>(false);

    private readonly seccionesCatalogSubject = new BehaviorSubject<Seccion[]>([]);

    protected readonly evaluaciones$ = this.evaluacionesSubject.asObservable();
    protected readonly selectedEvaluacion$ = this.selectedEvaluacionSubject.asObservable();
    protected readonly seccionTabs$ = this.seccionTabsSubject.asObservable();
    protected readonly tipoEvaluacion$ = this.tipoEvaluacionSubject.asObservable();

    protected readonly isLoadingEvaluaciones$ = this.isLoadingEvaluacionesSubject.asObservable();
    protected readonly isLoadingSecciones$ = this.isLoadingSeccionesSubject.asObservable();
    protected readonly isLoadingDetalles$ = this.isLoadingDetallesSubject.asObservable();
    protected readonly isLoadingTipoEvaluacion$ = this.isLoadingTipoEvaluacionSubject.asObservable();

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private readonly fb: FormBuilder,
        private readonly evaluacionProgramadasService: EvaluacionProgramadasService,
        private readonly evaluacionProgramadaSeccionesService: EvaluacionProgramadaSeccionesService,
        private readonly evaluacionDetallesService: EvaluacionDetallesService,
        private readonly seccionesService: SeccionesService,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService,
        private readonly snackBar: MatSnackBar,
        private readonly dialog: MatDialog
    ) {
        this.dateControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => {
                if (value) {
                    this.loadEvaluaciones(value);
                } else {
                    this.clearEvaluaciones();
                }
            });

        combineLatest([
            this.seccionesEvaluacionSubject,
            this.evaluacionDetallesSubject,
            this.seccionesCatalogSubject,
        ])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([secciones, detalles, catalog]) => {
                const tabs = this.buildSeccionTabs(secciones, detalles, catalog);
                this.seccionTabsSubject.next(tabs);
            });
    }

    ngOnInit(): void {
        this.loadSeccionesCatalog();

        const initialDate = this.dateControl.value ?? new Date();
        this.dateControl.setValue(initialDate, { emitEvent: false });
        this.loadEvaluaciones(initialDate);
    }

    protected goToPreviousDay(): void {
        this.shiftSelectedDateBy(-1);
    }

    protected goToNextDay(): void {
        this.shiftSelectedDateBy(1);
    }

    protected goToToday(): void {
        this.dateControl.setValue(new Date());
    }

    protected selectEvaluacion(evaluacion: EvaluacionProgramada): void {
        this.setSelectedEvaluacion(evaluacion);
    }

    protected isSelectedEvaluacion(
        evaluacion: EvaluacionProgramada,
        selected: EvaluacionProgramada | null
    ): boolean {
        return selected?.id === evaluacion.id;
    }

    protected buildHorarioLabel(evaluacion: EvaluacionProgramada): string {
        const inicio = this.formatTime(evaluacion.horaInicio);
        const fin = this.formatTime(evaluacion.horaFin);

        if (inicio && fin) {
            return `${inicio} - ${fin}`;
        }

        if (inicio) {
            return inicio;
        }

        if (fin) {
            return fin;
        }

        return 'Horario sin definir';
    }

    protected formatFecha(fecha: string | null | undefined): string {
        if (!fecha) {
            return 'Sin fecha';
        }

        const parsed = DateTime.fromISO(fecha);
        if (!parsed.isValid) {
            return fecha;
        }

        return parsed.toFormat('dd/MM/yyyy');
    }

    protected openTipoEvaluacionDialog(tipoEvaluacion: TipoEvaluacion | null): void {
        const dialogRef = this.dialog.open<TipoEvaluacionFormDialogComponent, { tipoEvaluacion: TipoEvaluacion | null }, TipoEvaluacionFormDialogResult>(
            TipoEvaluacionFormDialogComponent,
            {
                width: '520px',
                data: {
                    tipoEvaluacion,
                },
            }
        );

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'updated') {
                this.tipoEvaluacionSubject.next(result.tipoEvaluacion);
            }
        });
    }

    protected openDetalleDialogForCreate(tab: EvaluacionSeccionTabView): void {
        const evaluacion = this.selectedEvaluacionSubject.value;
        if (!evaluacion) {
            return;
        }

        const dialogRef = this.dialog.open<
            EvaluacionDetalleFormDialogComponent,
            {
                mode: 'create';
                evaluacionProgramadaId: number;
                seccionId: number | null;
                detalle: null;
            },
            EvaluacionDetalleFormDialogResult
        >(EvaluacionDetalleFormDialogComponent, {
            width: '520px',
            data: {
                mode: 'create',
                evaluacionProgramadaId: evaluacion.id,
                seccionId: tab.seccionId,
                detalle: null,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'created') {
                this.reloadDetalles();
            }
        });
    }

    protected openDetalleDialogForEdit(detalle: EvaluacionDetalle): void {
        const evaluacion = this.selectedEvaluacionSubject.value;
        if (!evaluacion) {
            return;
        }

        const dialogRef = this.dialog.open<
            EvaluacionDetalleFormDialogComponent,
            {
                mode: 'edit';
                evaluacionProgramadaId: number;
                seccionId: number | null;
                detalle: EvaluacionDetalle;
            },
            EvaluacionDetalleFormDialogResult
        >(EvaluacionDetalleFormDialogComponent, {
            width: '520px',
            data: {
                mode: 'edit',
                evaluacionProgramadaId: evaluacion.id,
                seccionId: detalle.seccionId,
                detalle,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'updated') {
                this.reloadDetalles();
            }
        });
    }

    private shiftSelectedDateBy(days: number): void {
        const current = this.dateControl.value ?? new Date();
        const updated = DateTime.fromJSDate(current).plus({ days });
        if (!updated.isValid) {
            return;
        }

        this.dateControl.setValue(updated.toJSDate());
    }

    private loadSeccionesCatalog(): void {
        this.seccionesService.list().subscribe({
            next: (secciones) => {
                this.seccionesCatalogSubject.next(secciones);
            },
            error: (error) => {
                this.showError(
                    error.message ?? 'No fue posible cargar las secciones disponibles.'
                );
            },
        });
    }

    private loadEvaluaciones(date: Date): void {
        const formattedDate = this.formatDateForApi(date);
        if (!formattedDate) {
            this.clearEvaluaciones();
            return;
        }

        this.isLoadingEvaluacionesSubject.next(true);
        this.evaluacionProgramadasService
            .listByFechaInicio(formattedDate)
            .pipe(finalize(() => this.isLoadingEvaluacionesSubject.next(false)))
            .subscribe({
                next: (evaluaciones) => {
                    this.evaluacionesSubject.next(evaluaciones);
                    const current = this.selectedEvaluacionSubject.value;
                    const nextEvaluacion =
                        evaluaciones.find((item) => item.id === current?.id) ??
                        evaluaciones.at(0) ??
                        null;
                    this.setSelectedEvaluacion(nextEvaluacion);
                },
                error: (error) => {
                    this.showError(
                        error.message ?? 'No fue posible obtener las evaluaciones programadas.'
                    );
                    this.evaluacionesSubject.next([]);
                    this.setSelectedEvaluacion(null);
                },
            });
    }

    private clearEvaluaciones(): void {
        this.evaluacionesSubject.next([]);
        this.setSelectedEvaluacion(null);
    }

    private setSelectedEvaluacion(evaluacion: EvaluacionProgramada | null): void {
        this.selectedEvaluacionSubject.next(evaluacion);

        if (evaluacion) {
            this.loadSecciones(evaluacion.id);
            this.loadDetalles(evaluacion.id);
            this.loadTipoEvaluacion(evaluacion.tipoEvaluacionId);
        } else {
            this.seccionesEvaluacionSubject.next([]);
            this.evaluacionDetallesSubject.next([]);
            this.tipoEvaluacionSubject.next(null);
        }
    }

    private loadSecciones(evaluacionProgramadaId: number): void {
        this.isLoadingSeccionesSubject.next(true);
        this.evaluacionProgramadaSeccionesService
            .listByEvaluacionProgramada(evaluacionProgramadaId)
            .pipe(finalize(() => this.isLoadingSeccionesSubject.next(false)))
            .subscribe({
                next: (secciones) => {
                    this.seccionesEvaluacionSubject.next(secciones);
                },
                error: (error) => {
                    this.showError(
                        error.message ?? 'No fue posible cargar las secciones de la evaluación.'
                    );
                    this.seccionesEvaluacionSubject.next([]);
                },
            });
    }

    private loadDetalles(evaluacionProgramadaId: number): void {
        this.isLoadingDetallesSubject.next(true);
        this.evaluacionDetallesService
            .listByEvaluacionProgramada(evaluacionProgramadaId)
            .pipe(finalize(() => this.isLoadingDetallesSubject.next(false)))
            .subscribe({
                next: (detalles) => {
                    this.evaluacionDetallesSubject.next(detalles);
                },
                error: (error) => {
                    this.showError(
                        error.message ?? 'No fue posible obtener los detalles de la evaluación.'
                    );
                    this.evaluacionDetallesSubject.next([]);
                },
            });
    }

    private reloadDetalles(): void {
        const evaluacion = this.selectedEvaluacionSubject.value;
        if (!evaluacion) {
            return;
        }

        this.loadDetalles(evaluacion.id);
    }

    private loadTipoEvaluacion(tipoEvaluacionId: number): void {
        this.isLoadingTipoEvaluacionSubject.next(true);
        this.tipoEvaluacionesService
            .getTipoEvaluacion(tipoEvaluacionId)
            .pipe(finalize(() => this.isLoadingTipoEvaluacionSubject.next(false)))
            .subscribe({
                next: (tipoEvaluacion) => {
                    this.tipoEvaluacionSubject.next(tipoEvaluacion);
                },
                error: (error) => {
                    this.showError(
                        error.message ?? 'No fue posible obtener el tipo de evaluación asociado.'
                    );
                    this.tipoEvaluacionSubject.next(null);
                },
            });
    }

    private buildSeccionTabs(
        secciones: EvaluacionProgramadaSeccion[],
        detalles: EvaluacionDetalle[],
        catalog: Seccion[]
    ): EvaluacionSeccionTabView[] {
        const seccionNombreMap = new Map<number, string>();
        catalog.forEach((seccion) => {
            seccionNombreMap.set(seccion.id, seccion.nombre);
        });

        const tabs = secciones.map<EvaluacionSeccionTabView>((seccion) => {
            const seccionId = seccion.seccionId ?? null;
            const label =
                seccionId !== null
                    ? seccionNombreMap.get(seccionId) ?? `Sección ${seccionId}`
                    : 'Sin sección asignada';

            const detallesAsociados = detalles.filter(
                (detalle) => detalle.seccionId === seccionId
            );

            return {
                key: `seccion-${seccion.id}`,
                label,
                seccionId,
                evaluacionSeccion: seccion,
                detalles: detallesAsociados,
            };
        });

        const tieneTabGeneral = tabs.some((tab) => tab.seccionId === null);
        const detallesGenerales = detalles.filter((detalle) => detalle.seccionId === null);

        if (!tieneTabGeneral && detallesGenerales.length > 0) {
            tabs.push({
                key: 'seccion-general',
                label: 'General',
                seccionId: null,
                evaluacionSeccion: null,
                detalles: detallesGenerales,
            });
        }

        if (tabs.length === 0 && detallesGenerales.length === 0 && detalles.length > 0) {
            tabs.push({
                key: 'seccion-todos',
                label: 'Detalles',
                seccionId: null,
                evaluacionSeccion: null,
                detalles,
            });
        }

        return tabs;
    }

    private formatDateForApi(date: Date): string | null {
        const normalized = DateTime.fromJSDate(date).startOf('day');
        if (!normalized.isValid) {
            return null;
        }

        return normalized.toISODate();
    }

    private formatTime(value: string | null | undefined): string | null {
        if (!value) {
            return null;
        }

        const withSeconds = DateTime.fromFormat(value, 'HH:mm:ss');
        if (withSeconds.isValid) {
            return withSeconds.toFormat('HH:mm');
        }

        const withMinutes = DateTime.fromFormat(value, 'HH:mm');
        if (withMinutes.isValid) {
            return withMinutes.toFormat('HH:mm');
        }

        const iso = DateTime.fromISO(value);
        if (iso.isValid) {
            return iso.toFormat('HH:mm');
        }

        return value;
    }

    private showError(message: string): void {
        this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
        });
    }
}
