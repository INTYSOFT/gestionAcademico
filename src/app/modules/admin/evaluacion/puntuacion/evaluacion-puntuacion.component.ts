import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    OnInit,
    TrackByFunction,
    ViewChild,
    ViewEncapsulation,
    inject,
    signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCalendar, MatCalendarCellClassFunction, MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, Subscription, combineLatest, forkJoin, fromEvent, of } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import {
    EvaluacionDetalle,
    type CreateEvaluacionDetallePayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaSeccionesService } from 'app/core/services/centro-estudios/evaluacion-programada-secciones.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { EvaluacionDetallesService } from 'app/core/services/centro-estudios/evaluacion-detalles.service';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionTipoPreguntasService } from 'app/core/services/centro-estudios/evaluacion-tipo-preguntas.service';
import { EvaluacionDetalleFormDialogComponent } from './evaluacion-detalle-form-dialog/evaluacion-detalle-form-dialog.component';
import type { EvaluacionDetalleFormDialogResult } from './evaluacion-detalle-form-dialog/evaluacion-detalle-form-dialog.component';
import {
    EvaluacionDetalleImportDialogComponent,
    EvaluacionDetalleImportDialogResult,
} from './evaluacion-detalle-import-dialog/evaluacion-detalle-import-dialog.component';
import {
    EvaluacionClavesDialogComponent,
    EvaluacionClavesDialogResult,
} from './evaluacion-claves-dialog/evaluacion-claves-dialog.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { EvaluacionClavesService } from 'app/core/services/centro-estudios/evaluacion-claves.service';
import type { CreateEvaluacionClavePayload } from 'app/core/models/centro-estudios/evaluacion-clave.model';

interface EvaluacionSeccionTabView {
    key: string;
    label: string;
    seccionId: number | null;
    evaluacionSeccion: EvaluacionProgramadaSeccion | null;
    detalles: EvaluacionDetalle[];
}

interface DetalleImportContext {
    sourceDetalle: EvaluacionDetalle;
    payload: CreateEvaluacionDetallePayload;
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
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatListModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatDividerModule
    ],
})
export class EvaluacionPuntuacionComponent implements OnInit, AfterViewInit {
    protected readonly dateControl = this.fb.control<Date | null>(new Date(), {
        validators: [Validators.required],
    });

    protected readonly trackByEvaluacion: TrackByFunction<EvaluacionProgramada> = (
        _,
        evaluacion
    ) => this.buildEvaluacionTrackKey(evaluacion);
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
    private readonly evaluacionTipoPreguntasSubject = new BehaviorSubject<
        EvaluacionTipoPregunta[]
    >([]);

    private readonly isLoadingEvaluacionesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingSeccionesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingDetallesSubject = new BehaviorSubject<boolean>(false);
    private readonly isLoadingTipoEvaluacionSubject = new BehaviorSubject<boolean>(false);

    private readonly seccionesCatalogSubject = new BehaviorSubject<Seccion[]>([]);
    private readonly sedesCatalogSubject = new BehaviorSubject<Sede[]>([]);
    private readonly ciclosCatalogSubject = new BehaviorSubject<Ciclo[]>([]);

    private readonly sedeNombreMap = new Map<number, string>();
    private readonly cicloNombreMap = new Map<number, string>();
    private readonly evaluacionTipoPreguntaNombreMap = new Map<number, string>();

    @ViewChild('inlineCalendar')
    private set inlineCalendar(calendar: MatCalendar<Date> | undefined) {
        if (!calendar) {
            if (this.monitoredCalendar) {
                this.calendarStateChangesSubscription?.unsubscribe();
                this.calendarStateChangesSubscription = undefined;
            }

            this.monitoredCalendar = null;
            return;
        }

        this.registerCalendarStateChanges(calendar);
    }

    @ViewChild('evaluacionesListContainer', { static: true })
    private readonly evaluacionesListContainer?: ElementRef<HTMLDivElement>;

    @ViewChild('evaluacionesList', { read: ElementRef })
    private set evaluacionesList(ref: ElementRef<HTMLElement> | undefined) {
        if (this.evaluacionesListResizeObserver && this.evaluacionesListElement) {
            this.evaluacionesListResizeObserver.unobserve(this.evaluacionesListElement);
        }

        this.evaluacionesListElement = ref?.nativeElement ?? null;

        if (this.evaluacionesListResizeObserver && this.evaluacionesListElement) {
            this.evaluacionesListResizeObserver.observe(this.evaluacionesListElement);
        }

        queueMicrotask(() => this.updateEvaluacionesListHeight());
    }

    protected readonly evaluacionesListMaxHeight = signal<number | null>(null);
    private evaluacionesListElement: HTMLElement | null = null;
    private evaluacionesListResizeObserver?: ResizeObserver;

    protected readonly evaluaciones$ = this.evaluacionesSubject.asObservable();
    protected readonly selectedEvaluacion$ = this.selectedEvaluacionSubject.asObservable();
    protected readonly seccionTabs$ = this.seccionTabsSubject.asObservable();
    protected readonly tipoEvaluacion$ = this.tipoEvaluacionSubject.asObservable();
    protected readonly evaluacionTipoPreguntas$ =
        this.evaluacionTipoPreguntasSubject.asObservable();

    protected readonly isLoadingEvaluaciones$ = this.isLoadingEvaluacionesSubject.asObservable();
    protected readonly isLoadingSecciones$ = this.isLoadingSeccionesSubject.asObservable();
    protected readonly isLoadingDetalles$ = this.isLoadingDetallesSubject.asObservable();
    protected readonly isLoadingTipoEvaluacion$ = this.isLoadingTipoEvaluacionSubject.asObservable();

    protected readonly dateClass: MatCalendarCellClassFunction<unknown> = (date) =>
        this.calendarMarkedDateKeys.has(this.buildDateKey(date))
            ? 'evaluacion-puntuacion__calendar-has-evaluacion'
            : '';

    private calendarStateChangesSubscription?: Subscription;
    private monthEvaluacionesSubscription?: Subscription;
    private monitoredCalendar: MatCalendar<Date> | null = null;
    private pendingMonthKey: string | null = null;
    private currentCalendarMonthKey: string | null = null;
    private readonly calendarProgramacionesCache = new Map<string, EvaluacionProgramada[]>();
    private calendarMarkedDateKeys = new Set<string>();
    //private pendingCalendarActiveDate: Date | null = null;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private readonly fb: FormBuilder,
        private readonly evaluacionProgramadasService: EvaluacionProgramadasService,
        private readonly evaluacionProgramadaSeccionesService: EvaluacionProgramadaSeccionesService,
        private readonly evaluacionDetallesService: EvaluacionDetallesService,
        private readonly evaluacionClavesService: EvaluacionClavesService,
        private readonly evaluacionTipoPreguntasService: EvaluacionTipoPreguntasService,
        private readonly seccionesService: SeccionesService,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService,
        private readonly sedeService: SedeService,
        private readonly ciclosService: CiclosService,
        private readonly snackBar: MatSnackBar,
        private readonly dialog: MatDialog,
        private readonly confirmationService: FuseConfirmationService
    ) {


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

        this.destroyRef.onDestroy(() => {
            this.calendarStateChangesSubscription?.unsubscribe();
            this.monthEvaluacionesSubscription?.unsubscribe();
        });
    }

    ngOnInit(): void {
        this.loadSeccionesCatalog();
        this.loadSedesCatalog();
        this.loadCiclosCatalog();
        this.loadEvaluacionTipoPreguntas();

        const initialDate = this.normalizeDateInput(this.dateControl.value) ?? new Date();
        this.dateControl.setValue(initialDate, { emitEvent: false });        
        this.loadEvaluaciones(initialDate);
        this.loadEvaluacionesForMonth(initialDate);
    }

    ngAfterViewInit(): void {
        this.initializeEvaluacionesListSizing();
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

    protected onCalendarDateSelected(date: Date | null): void {
        const normalizedDate = this.normalizeDateInput(date);
        if (!normalizedDate) return;

        // Actualiza el control visual
        this.dateControl.setValue(normalizedDate, { emitEvent: false });

        // 🔥 Carga directa, sin esperar `stateChanges` ni `calendar.activeDate`
        this.loadEvaluaciones(normalizedDate);
        this.loadEvaluacionesForMonth(normalizedDate);
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

    private initializeEvaluacionesListSizing(): void {
        const container = this.evaluacionesListContainer?.nativeElement;

        if (!container) {
            return;
        }

        const updateHeight = () => this.updateEvaluacionesListHeight();

        queueMicrotask(updateHeight);

        if (typeof ResizeObserver === 'undefined') {
            updateHeight();

            if (typeof window !== 'undefined') {
                fromEvent(window, 'resize')
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => updateHeight());
            }

            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            updateHeight();
        });

        resizeObserver.observe(container);

        if (this.evaluacionesListElement) {
            resizeObserver.observe(this.evaluacionesListElement);
        }

        this.evaluacionesListResizeObserver = resizeObserver;
        this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    }

    private updateEvaluacionesListHeight(): void {
        const container = this.evaluacionesListContainer?.nativeElement;

        if (!container) {
            this.evaluacionesListMaxHeight.set(null);
            return;
        }

        const list = this.evaluacionesListElement;

        if (!list) {
            const containerHeight = container.clientHeight;
            this.evaluacionesListMaxHeight.set(containerHeight > 0 ? containerHeight : null);
            return;
        }

        let availableHeight = container.clientHeight;

        if (typeof window !== 'undefined') {
            const containerStyles = window.getComputedStyle(container);
            availableHeight -= this.parseCssSize(containerStyles.paddingTop);
            availableHeight -= this.parseCssSize(containerStyles.paddingBottom);

            const listStyles = window.getComputedStyle(list);
            availableHeight -= this.parseCssSize(listStyles.paddingTop);
            availableHeight -= this.parseCssSize(listStyles.paddingBottom);
            availableHeight -= this.parseCssSize(listStyles.borderTopWidth);
            availableHeight -= this.parseCssSize(listStyles.borderBottomWidth);
        }

        const nextHeight = Number.isFinite(availableHeight) && availableHeight > 0 ? availableHeight : null;
        this.evaluacionesListMaxHeight.set(nextHeight);
    }

    private parseCssSize(value: string | null | undefined): number {
        if (!value) {
            return 0;
        }

        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private normalizeDateInput(value: unknown): Date | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (this.isLuxonDateTime(value)) {
            const jsDate = value.toJSDate();
            return Number.isNaN(jsDate.getTime()) ? null : jsDate;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();

            if (!trimmed) {
                return null;
            }

            const isoParsed = DateTime.fromISO(trimmed);
            if (isoParsed.isValid) {
                const jsDate = isoParsed.toJSDate();
                return Number.isNaN(jsDate.getTime()) ? null : jsDate;
            }

            const nativeParsed = new Date(trimmed);
            return Number.isNaN(nativeParsed.getTime()) ? null : nativeParsed;
        }

        if (typeof value === 'number') {
            if (!Number.isFinite(value)) {
                return null;
            }

            const fromMillis = DateTime.fromMillis(value);
            if (fromMillis.isValid) {
                const jsDate = fromMillis.toJSDate();
                return Number.isNaN(jsDate.getTime()) ? null : jsDate;
            }

            const nativeParsed = new Date(value);
            return Number.isNaN(nativeParsed.getTime()) ? null : nativeParsed;
        }

        return null;
    }

    private shouldReplaceControlValue(original: unknown, normalized: Date): boolean {
        if (original instanceof Date) {
            return Number.isNaN(original.getTime()) || original.getTime() !== normalized.getTime();
        }

        if (this.isLuxonDateTime(original)) {
            const originalDate = original.toJSDate();
            return (
                Number.isNaN(originalDate.getTime()) ||
                originalDate.getTime() !== normalized.getTime()
            );
        }

        if (original === null || original === undefined) {
            return false;
        }

        return true;
    }

    private isLuxonDateTime(value: unknown): value is DateTime {
        return (
            value instanceof DateTime ||
            (!!value &&
                typeof value === 'object' &&
                'isValid' in value &&
                typeof (value as DateTime).toJSDate === 'function')
        );
    }

    private registerCalendarStateChanges(calendar: MatCalendar<Date>): void {
        if (this.monitoredCalendar === calendar) {
            
            return;
        }

        this.calendarStateChangesSubscription?.unsubscribe();
        this.monitoredCalendar = calendar;
        this.calendarStateChangesSubscription = calendar.stateChanges.subscribe(() =>
            this.handleCalendarStateChange(calendar)
        );

        
        this.handleCalendarStateChange(calendar);
    }

   



    private handleCalendarStateChange(calendar: MatCalendar<Date>): void {
        const activeDate = this.normalizeDateInput(calendar.activeDate);

        if (activeDate) {
            this.loadEvaluacionesForMonth(activeDate);
        }
    }

    private loadEvaluacionesForMonth(date: Date): void {
        const monthKey = this.buildMonthKey(date);

        if (!monthKey) {
            return;
        }

        const cached = this.calendarProgramacionesCache.get(monthKey);

        if (cached) {
            this.applyCalendarMarkedDates(monthKey, cached);
            return;
        }

        const { year, month } = this.extractYearMonth(date);

        this.monthEvaluacionesSubscription?.unsubscribe();
        this.pendingMonthKey = monthKey;

        this.monthEvaluacionesSubscription = this.evaluacionProgramadasService
            .listActivasByAnioMes(year, month)
            .pipe(
                finalize(() => {
                    if (this.pendingMonthKey === monthKey) {
                        this.pendingMonthKey = null;
                        this.monthEvaluacionesSubscription = undefined;
                    }
                })
            )
            .subscribe({
                next: (evaluaciones) => {
                    this.calendarProgramacionesCache.set(monthKey, evaluaciones);
                    this.applyCalendarMarkedDates(monthKey, evaluaciones);
                },
                error: (error) => {
                    this.showError(
                        error.message ??
                        'No fue posible obtener las evaluaciones programadas del mes.'
                    );
                    this.calendarProgramacionesCache.set(monthKey, []);
                    this.applyCalendarMarkedDates(monthKey, []);
                },
            });
    }

    private applyCalendarMarkedDates(
        monthKey: string,
        evaluaciones: EvaluacionProgramada[]
    ): void {
        const nextMarkedDates = new Set<string>();

        for (const evaluacion of evaluaciones) {
            const isoDate = this.normalizeEvaluacionFecha(evaluacion.fechaInicio);

            if (isoDate) {
                nextMarkedDates.add(isoDate);
            }
        }

        this.calendarMarkedDateKeys = nextMarkedDates;
        this.currentCalendarMonthKey = monthKey;
        this.refreshCalendarView();
    }

    private refreshCalendarView(): void {
        this.monitoredCalendar?.updateTodaysDate();
    }

    private clearCalendarMarkedDates(): void {
        this.calendarMarkedDateKeys = new Set<string>();
        this.currentCalendarMonthKey = null;
        this.refreshCalendarView();
    }

    private buildMonthKey(date: unknown): string | null {
        const normalizedDate = this.normalizeDateInput(date);

        if (!normalizedDate) {
            return null;
        }

        const normalized = DateTime.fromJSDate(normalizedDate).startOf('month');

        if (!normalized.isValid) {
            return null;
        }

        return normalized.toFormat('yyyy-MM');
    }

    private extractYearMonth(date: unknown): { year: number; month: number } {
        const normalizedDate = this.normalizeDateInput(date);

        if (normalizedDate) {
            const normalized = DateTime.fromJSDate(normalizedDate);

            if (normalized.isValid) {
                return { year: normalized.year, month: normalized.month };
            }

            return {
                year: normalizedDate.getFullYear(),
                month: normalizedDate.getMonth() + 1,
            };
        }

        const today = new Date();
        return { year: today.getFullYear(), month: today.getMonth() + 1 };
    }

    private buildDateKey(date: unknown): string {
        const normalizedDate = this.normalizeDateInput(date);

        if (!normalizedDate) {
            return '';
        }

        const normalized = DateTime.fromJSDate(normalizedDate).startOf('day');

        if (normalized.isValid) {
            return normalized.toISODate() ?? '';
        }

        return normalizedDate.toISOString().slice(0, 10);
    }

    private normalizeEvaluacionFecha(fecha: string | null | undefined): string | null {
        if (!fecha) {
            return null;
        }

        const normalized = DateTime.fromISO(fecha).startOf('day');

        if (normalized.isValid) {
            return normalized.toISODate();
        }

        return null;
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

    protected buildUbicacionLabel(evaluacion: EvaluacionProgramada): string {
        const sede = this.getSedeNombre(evaluacion.sedeId);
        const ciclo = this.getCicloNombre(evaluacion.cicloId);

        return `Sede: ${sede} · Ciclo: ${ciclo}`;
    }

    private buildEvaluacionTrackKey(evaluacion: EvaluacionProgramada): string {
        if (evaluacion.id !== null && evaluacion.id !== undefined) {
            return `evaluacion-${evaluacion.id}`;
        }

        const fallbackParts = [
            evaluacion.fechaInicio ?? 'sin-fecha',
            evaluacion.horaInicio ?? 'sin-hora-inicio',
            evaluacion.horaFin ?? 'sin-hora-fin',
            evaluacion.nombre ?? 'sin-nombre',
        ];

        return `evaluacion-${fallbackParts.join('|')}`;
    }

    protected getSedeLabel(evaluacion: EvaluacionProgramada): string {
        return this.getSedeNombre(evaluacion.sedeId);
    }

    protected getCicloLabel(evaluacion: EvaluacionProgramada): string {
        return this.getCicloNombre(evaluacion.cicloId);
    }

    protected getEvaluacionTipoPreguntaLabel(
        evaluacionTipoPreguntaId: number | null | undefined
    ): string {
        if (evaluacionTipoPreguntaId === null || evaluacionTipoPreguntaId === undefined) {
            return 'Sin tipo asignado';
        }

        return (
            this.evaluacionTipoPreguntaNombreMap.get(evaluacionTipoPreguntaId) ??
            `Tipo ${evaluacionTipoPreguntaId}`
        );
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
                evaluacionTipoPreguntas: EvaluacionTipoPregunta[];
            },
            EvaluacionDetalleFormDialogResult
        >(EvaluacionDetalleFormDialogComponent, {
            width: '520px',
            data: {
                mode: 'create',
                evaluacionProgramadaId: evaluacion.id,
                seccionId: tab.seccionId,
                detalle: null,
                evaluacionTipoPreguntas: this.evaluacionTipoPreguntasSubject.value,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'created') {
                this.reloadDetalles();
            }
        });
    }

    protected openDetalleImportDialog(targetTab: EvaluacionSeccionTabView): void {
        const evaluacion = this.selectedEvaluacionSubject.value;
        if (!evaluacion) {
            return;
        }

        const sourceTabs = this.seccionTabsSubject.value.filter(
            (tab) => tab.key !== targetTab.key && tab.detalles.length > 0
        );

        if (sourceTabs.length === 0) {
            this.snackBar.open(
                'No hay secciones con detalles disponibles para importar.',
                'Cerrar',
                {
                    duration: 4000,
                }
            );
            return;
        }

        const dialogRef = this.dialog.open<
            EvaluacionDetalleImportDialogComponent,
            {
                targetTabLabel: string;
                sources: { key: string; label: string; detallesCount: number }[];
            },
            EvaluacionDetalleImportDialogResult
        >(EvaluacionDetalleImportDialogComponent, {
            width: '420px',
            data: {
                targetTabLabel: targetTab.label,
                sources: sourceTabs.map((tab) => ({
                    key: tab.key,
                    label: tab.label,
                    detallesCount: tab.detalles.length,
                })),
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'import') {
                const sourceTab = sourceTabs.find((tab) => tab.key === result.sourceKey);
                if (!sourceTab) {
                    return;
                }

                this.importDetallesFromTab(targetTab, sourceTab, evaluacion);
            }
        });
    }

    protected canImportDetalles(tab: EvaluacionSeccionTabView): boolean {
        return this.seccionTabsSubject.value.some(
            (other) => other.key !== tab.key && other.detalles.length > 0
        );
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
                evaluacionTipoPreguntas: EvaluacionTipoPregunta[];
            },
            EvaluacionDetalleFormDialogResult
        >(EvaluacionDetalleFormDialogComponent, {
            width: '520px',
            data: {
                mode: 'edit',
                evaluacionProgramadaId: evaluacion.id,
                seccionId: detalle.seccionId,
                detalle,
                evaluacionTipoPreguntas: this.evaluacionTipoPreguntasSubject.value,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'updated') {
                this.reloadDetalles();
            }
        });
    }

    protected openDetalleClavesDialog(detalle: EvaluacionDetalle): void {
        const evaluacion = this.selectedEvaluacionSubject.value;
        if (!evaluacion) {
            return;
        }

        const dialogRef = this.dialog.open<
            EvaluacionClavesDialogComponent,
            { evaluacion: EvaluacionProgramada; detalle: EvaluacionDetalle },
            EvaluacionClavesDialogResult | undefined
        >(EvaluacionClavesDialogComponent, {
            width: '720px',
            data: {
                evaluacion,
                detalle,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.action === 'saved') {
                this.reloadDetalles();
            }
        });
    }

    protected confirmDeleteDetalle(detalle: EvaluacionDetalle): void {
        const rangeLabel = this.formatDetalleRangeLabel(
            detalle.rangoInicio,
            detalle.rangoFin
        );

        const dialogRef = this.confirmationService.open({
            title: 'Eliminar detalle',
            message: `¿Estás seguro de que deseas eliminar el rango <strong>${rangeLabel}</strong>? Esta acción no se puede deshacer.`,
            icon: {
                show: true,
                name: 'heroicons_outline:trash',
                color: 'warn',
            },
            actions: {
                confirm: {
                    show: true,
                    label: 'Eliminar',
                    color: 'warn',
                },
                cancel: {
                    show: true,
                    label: 'Cancelar',
                },
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'confirmed') {
                this.deleteDetalle(detalle.id);
            }
        });
    }

    private shiftSelectedDateBy(days: number): void {
        const current = this.normalizeDateInput(this.dateControl.value) ?? new Date();
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

    private loadSedesCatalog(): void {
        this.sedeService.getSedes().subscribe({
            next: (sedes) => {
                this.sedesCatalogSubject.next(sedes);
                this.refreshSedeNombreMap(sedes);
            },
            error: (error) => {
                this.sedesCatalogSubject.next([]);
                this.refreshSedeNombreMap([]);
                this.showError(error.message ?? 'No fue posible cargar las sedes disponibles.');
            },
        });
    }

    private loadCiclosCatalog(): void {
        this.ciclosService.listAll().subscribe({
            next: (ciclos) => {
                this.ciclosCatalogSubject.next(ciclos);
                this.refreshCicloNombreMap(ciclos);
            },
            error: (error) => {
                this.ciclosCatalogSubject.next([]);
                this.refreshCicloNombreMap([]);
                this.showError(
                    error.message ?? 'No fue posible cargar los ciclos disponibles.'
                );
            },
        });
    }

    private loadEvaluacionTipoPreguntas(): void {
        this.evaluacionTipoPreguntasService.listAll().subscribe({
            next: (records) => {
                this.evaluacionTipoPreguntasSubject.next(records);
                this.evaluacionTipoPreguntaNombreMap.clear();
                records.forEach((item) => {
                    this.evaluacionTipoPreguntaNombreMap.set(item.id, item.nombre);
                });
            },
            error: (error) => {
                this.showError(
                    error.message ??
                    'No fue posible obtener los tipos de pregunta de evaluación disponibles.'
                );
                this.evaluacionTipoPreguntasSubject.next([]);
                this.evaluacionTipoPreguntaNombreMap.clear();
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

    private importDetallesFromTab(
        targetTab: EvaluacionSeccionTabView,
        sourceTab: EvaluacionSeccionTabView,
        evaluacion: EvaluacionProgramada
    ): void {
        const existingRangeKeys = new Set(
            targetTab.detalles.map((detalle) =>
                this.buildDetalleRangeKey(detalle.rangoInicio, detalle.rangoFin)
            )
        );

        const contexts: DetalleImportContext[] = [];
        const duplicatedRanges: string[] = [];

        for (const detalle of sourceTab.detalles) {
            const rangeKey = this.buildDetalleRangeKey(detalle.rangoInicio, detalle.rangoFin);

            if (existingRangeKeys.has(rangeKey)) {
                duplicatedRanges.push(
                    this.formatDetalleRangeLabel(detalle.rangoInicio, detalle.rangoFin)
                );
                continue;
            }

            existingRangeKeys.add(rangeKey);
            contexts.push({
                sourceDetalle: detalle,
                payload: {
                    evaluacionProgramadaId: evaluacion.id,
                    seccionId: targetTab.seccionId,
                    evaluacionTipoPreguntaId: detalle.evaluacionTipoPreguntaId ?? null,
                    rangoInicio: detalle.rangoInicio,
                    rangoFin: detalle.rangoFin,
                    valorBuena: detalle.valorBuena,
                    valorMala: detalle.valorMala,
                    valorBlanca: detalle.valorBlanca,
                    observacion: detalle.observacion,
                    activo: detalle.activo,
                },
            });
        }

        const duplicateMessage =
            duplicatedRanges.length > 0
                ? duplicatedRanges.length === 1
                    ? `El rango ${duplicatedRanges[0]} ya existe en la sección seleccionada y no se importó.`
                    : `Los rangos ${duplicatedRanges.join(', ')} ya existen en la sección seleccionada y no se importaron.`
                : null;

        if (contexts.length === 0) {
            this.snackBar.open(
                duplicateMessage ?? 'No hay detalles para importar.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        this.isLoadingDetallesSubject.next(true);

        forkJoin(
            contexts.map(({ sourceDetalle, payload }) =>
                this.evaluacionDetallesService.create(payload).pipe(
                    switchMap((createdDetalle) =>
                        this.importClavesForDetalle({
                            sourceDetalle,
                            targetDetalle: createdDetalle,
                            evaluacion,
                        })
                    )
                )
            )
        )
            .pipe(finalize(() => this.isLoadingDetallesSubject.next(false)))
            .subscribe({
                next: () => {
                    const messageParts = [
                        contexts.length === 1
                            ? 'Detalle importado correctamente.'
                            : 'Detalles importados correctamente.',
                    ];

                    if (duplicateMessage) {
                        messageParts.push(duplicateMessage);
                    }

                    this.snackBar.open(messageParts.join(' '), 'Cerrar', {
                        duration: duplicateMessage ? 8000 : 4000,
                    });
                    this.reloadDetalles();
                },
                error: (error) => {
                    this.showError(
                        error.message ??
                        'No fue posible importar los detalles seleccionados.'
                    );
                },
            });
    }

    private importClavesForDetalle({
        sourceDetalle,
        targetDetalle,
        evaluacion,
    }: {
        sourceDetalle: EvaluacionDetalle;
        targetDetalle: EvaluacionDetalle;
        evaluacion: EvaluacionProgramada;
    }): Observable<void> {
        return this.evaluacionClavesService
            .listByEvaluacionDetalle(sourceDetalle.id)
            .pipe(
                switchMap((claves) => {
                    if (!claves || claves.length === 0) {
                        return of(void 0);
                    }

                    const payloads: CreateEvaluacionClavePayload[] = claves.map((clave) => ({
                        evaluacionProgramadaId: targetDetalle.evaluacionProgramadaId,
                        evaluacionDetalleId: targetDetalle.id,
                        preguntaOrden: clave.preguntaOrden,
                        respuesta: clave.respuesta,
                        ponderacion: clave.ponderacion,
                        version: clave.version,
                        vigente: clave.vigente,
                        observacion: clave.observacion,
                        activo: clave.activo,
                        sedeId: clave.sedeId ?? evaluacion.sedeId ?? null,
                        cicloId: clave.cicloId ?? evaluacion.cicloId ?? null,
                        seccionId: targetDetalle.seccionId ?? null,
                    }));

                    if (payloads.length === 0) {
                        return of(void 0);
                    }

                    return forkJoin(
                        payloads.map((payload) => this.evaluacionClavesService.create(payload))
                    ).pipe(map(() => void 0));
                })
            );
    }

    private buildDetalleRangeKey(rangoInicio: number, rangoFin: number): string {
        return `${rangoInicio}-${rangoFin}`;
    }

    private formatDetalleRangeLabel(rangoInicio: number, rangoFin: number): string {
        return `${rangoInicio}-${rangoFin}`;
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

        const sortedDetalles = this.sortDetalles(detalles);

        const detallesPorSeccion = new Map<number | null, EvaluacionDetalle[]>();
        for (const detalle of sortedDetalles) {
            const key = detalle.seccionId ?? null;
            const agrupados = detallesPorSeccion.get(key);

            if (agrupados) {
                agrupados.push(detalle);
            } else {
                detallesPorSeccion.set(key, [detalle]);
            }
        }

        const tabs = secciones.map<EvaluacionSeccionTabView>((seccion) => {
            const seccionId = seccion.seccionId ?? null;
            const label =
                seccionId !== null
                    ? seccionNombreMap.get(seccionId) ?? `Sección ${seccionId}`
                    : 'Sin sección asignada';

            const detallesAsociados = detallesPorSeccion.get(seccionId) ?? [];

            return {
                key: `seccion-${seccion.id}`,
                label,
                seccionId,
                evaluacionSeccion: seccion,
                detalles: detallesAsociados,
            };
        });

        const tieneTabGeneral = tabs.some((tab) => tab.seccionId === null);
        const detallesGenerales = detallesPorSeccion.get(null) ?? [];

        if (!tieneTabGeneral && detallesGenerales.length > 0) {
            tabs.push({
                key: 'seccion-general',
                label: 'General',
                seccionId: null,
                evaluacionSeccion: null,
                detalles: detallesGenerales,
            });
        }

        if (
            tabs.length === 0 &&
            detallesGenerales.length === 0 &&
            sortedDetalles.length > 0
        ) {
            tabs.push({
                key: 'seccion-todos',
                label: 'Detalles',
                seccionId: null,
                evaluacionSeccion: null,
                detalles: sortedDetalles,
            });
        }

        return tabs;
    }

    private sortDetalles(detalles: EvaluacionDetalle[]): EvaluacionDetalle[] {
        return [...detalles].sort((a, b) => {
            const rangoInicioDiff = this.compareNullableNumbers(
                a.rangoInicio,
                b.rangoInicio
            );

            if (rangoInicioDiff !== 0) {
                return rangoInicioDiff;
            }

            const rangoFinDiff = this.compareNullableNumbers(a.rangoFin, b.rangoFin);
            if (rangoFinDiff !== 0) {
                return rangoFinDiff;
            }

            if (
                a.id !== null &&
                a.id !== undefined &&
                b.id !== null &&
                b.id !== undefined
            ) {
                return a.id - b.id;
            }

            return 0;
        });
    }

    private compareNullableNumbers(
        a: number | null | undefined,
        b: number | null | undefined
    ): number {
        if (a === null || a === undefined) {
            if (b === null || b === undefined) {
                return 0;
            }

            return 1;
        }

        if (b === null || b === undefined) {
            return -1;
        }

        if (a < b) {
            return -1;
        }

        if (a > b) {
            return 1;
        }

        return 0;
    }

    private formatDateForApi(date: unknown): string | null {
        const normalizedDate = this.normalizeDateInput(date);

        if (!normalizedDate) {
            return null;
        }

        // ⚠️ ✅ IMPORTANTE: Siempre usar zona local, sin desplazamiento a UTC
        return DateTime.fromJSDate(normalizedDate)
            .setZone('local') // <<< esto garantiza que no pase a UTC
            .toFormat('yyyy-MM-dd'); // evita usar toISODate() que arrastra la Z (zona)
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

    private getSedeNombre(sedeId: number | null | undefined): string {
        if (sedeId === null || sedeId === undefined) {
            return 'Sede no disponible';
        }

        return this.sedeNombreMap.get(sedeId) ?? `Sede #${sedeId}`;
    }

    private getCicloNombre(cicloId: number | null | undefined): string {
        if (cicloId === null || cicloId === undefined) {
            return 'Sin ciclo asignado';
        }

        return this.cicloNombreMap.get(cicloId) ?? `Ciclo #${cicloId}`;
    }

    private refreshSedeNombreMap(sedes: Sede[]): void {
        this.sedeNombreMap.clear();
        sedes.forEach((sede) => {
            this.sedeNombreMap.set(sede.id, sede.nombre);
        });
    }

    private refreshCicloNombreMap(ciclos: Ciclo[]): void {
        this.cicloNombreMap.clear();
        ciclos.forEach((ciclo) => {
            this.cicloNombreMap.set(ciclo.id, ciclo.nombre);
        });
    }

    private deleteDetalle(detalleId: number): void {
        this.isLoadingDetallesSubject.next(true);

        this.evaluacionDetallesService
            .delete(detalleId)
            .pipe(finalize(() => this.isLoadingDetallesSubject.next(false)))
            .subscribe({
                next: () => {
                    this.snackBar.open('Detalle eliminado correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.reloadDetalles();
                },
                error: (error) => {
                    this.showError(
                        error.message ?? 'No fue posible eliminar el detalle de la evaluación.'
                    );
                },
            });
    }
}
