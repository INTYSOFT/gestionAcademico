import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Inject,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, Subscription, finalize, forkJoin, switchMap } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionDetalle } from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import {
    CreateEvaluacionClavePayload,
    EvaluacionClave,
    UpdateEvaluacionClavePayload,
} from 'app/core/models/centro-estudios/evaluacion-clave.model';
import { EvaluacionClavesService } from 'app/core/services/centro-estudios/evaluacion-claves.service';

type InvalidRespuesta = { type: 'pregunta' | 'registro'; value: number };

enum TablaColumna {
    PreguntaOrden = 'preguntaOrden',
    Respuesta = 'respuesta',
    Acciones = 'actions',
}

export interface EvaluacionClavesDialogData {
    evaluacion: EvaluacionProgramada;
    detalle: EvaluacionDetalle;
}

export type EvaluacionClavesDialogResult = {
    action: 'saved';
    claves: EvaluacionClave[];
};

type EvaluacionClaveFormGroup = FormGroup<{
    id: FormControl<number | null>;
    evaluacionProgramadaId: FormControl<number>;
    evaluacionDetalleId: FormControl<number>;
    preguntaOrden: FormControl<number>;
    respuesta: FormControl<string>;
    ponderacion: FormControl<number | null>;
    version: FormControl<number>;
    vigente: FormControl<boolean>;
    observacion: FormControl<string | null>;
    activo: FormControl<boolean>;
    sedeId: FormControl<number | null>;
    cicloId: FormControl<number | null>;
    seccionId: FormControl<number | null>;
}>;

interface EvaluacionClaveFormValue {
    id: number | null;
    evaluacionProgramadaId: number;
    evaluacionDetalleId: number;
    preguntaOrden: number;
    respuesta: string;
    ponderacion: number | null;
    version: number;
    vigente: boolean;
    observacion: string | null;
    activo: boolean;
    sedeId: number | null;
    cicloId: number | null;
    seccionId: number | null;
}

@Component({
    selector: 'app-evaluacion-claves-dialog',
    standalone: true,
    templateUrl: './evaluacion-claves-dialog.component.html',
    styleUrls: ['./evaluacion-claves-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatOptionModule,
    ],
})
export class EvaluacionClavesDialogComponent implements OnInit, OnDestroy {
    protected readonly detalle = this.data.detalle;
    protected readonly evaluacion = this.data.evaluacion;

    protected readonly respuestas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    private readonly formArray = this.fb.array<EvaluacionClaveFormGroup>([]);

    protected readonly form = this.fb.group({
        claves: this.formArray,
    });

    protected readonly columnas = TablaColumna;

    protected readonly displayedColumns: TablaColumna[] = [
        TablaColumna.PreguntaOrden,
        TablaColumna.Respuesta,
        TablaColumna.Acciones,
    ];

    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    private readonly deletedIds = new Set<number>();
    private readonly initialValueMap = new Map<number, EvaluacionClaveFormValue>();
    private readonly subscriptions = new Subscription();

    @ViewChildren('preguntaOrdenInput', { read: ElementRef })
    private readonly preguntaOrdenInputs?: QueryList<ElementRef<HTMLInputElement>>;

    @ViewChildren('respuestaSelect', { read: MatSelect })
    private readonly respuestaSelects?: QueryList<MatSelect>;

    constructor(
        @Inject(MAT_DIALOG_DATA) private readonly data: EvaluacionClavesDialogData,
        private readonly dialogRef: MatDialogRef<
            EvaluacionClavesDialogComponent,
            EvaluacionClavesDialogResult | undefined
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionClavesService: EvaluacionClavesService,
        private readonly cdr: ChangeDetectorRef
    ) {
        this.subscriptions.add(
            this.isSaving$.subscribe(() => {
                this.cdr.markForCheck();
            })
        );
    }

    get clavesForm(): FormArray<EvaluacionClaveFormGroup> {
        return this.form.get('claves') as FormArray<EvaluacionClaveFormGroup>;
    }

    ngOnInit(): void {
        this.loadClaves();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    protected trackByIndex(index: number): number {
        return index;
    }

    protected addClave(): void {
        const nextOrden = this.calculateNextPreguntaOrden();
        const value = this.buildFormValue({ preguntaOrden: nextOrden });
        const group = this.createClaveGroup(value);
        this.clavesForm.push(group);
        this.focusField(this.clavesForm.length - 1, TablaColumna.PreguntaOrden);
        this.cdr.markForCheck();
    }

    protected removeClave(index: number): void {
        const group = this.clavesForm.at(index);
        if (!group) {
            return;
        }

        const id = group.controls.id.value;
        if (id !== null && id !== undefined) {
            this.deletedIds.add(id);
            this.initialValueMap.delete(id);
        }

        this.clavesForm.removeAt(index);
        this.cdr.markForCheck();
    }

    protected removeClaveByIndex(index: number): void {
        if (this.isSaving$.value) {
            return;
        }

        this.removeClave(index);
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected save(): void {
        if (this.isSaving$.value) {
            return;
        }

        if (this.clavesForm.length === 0) {
            this.snackBar.open('Agrega al menos una clave antes de guardar.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.clavesForm.controls.forEach((control) => control.markAllAsTouched());
        this.ensureRespuestasUppercase();

        const invalidRespuestas = this.findInvalidRespuestas();
        if (invalidRespuestas.length > 0) {
            const message = this.formatInvalidRespuestasMessage(invalidRespuestas);
            this.snackBar.open(message, 'Cerrar', { duration: 6000 });
            return;
        }

        if (this.clavesForm.invalid) {
            return;
        }

        const duplicates = this.findDuplicatedOrdenes();
        if (duplicates.length > 0) {
            const label = duplicates.length === 1 ? 'pregunta' : 'preguntas';
            this.snackBar.open(
                `El orden de ${label} ${duplicates.join(', ')} está duplicado. Corrige antes de guardar.`,
                'Cerrar',
                { duration: 6000 }
            );
            return;
        }

        const creations: EvaluacionClaveFormValue[] = [];
        const updates: EvaluacionClaveFormValue[] = [];

        for (const control of this.clavesForm.controls) {
            const value = this.normalizeFormValue(control.getRawValue());

            if (value.id === null) {
                creations.push(value);
                continue;
            }

            const initial = this.initialValueMap.get(value.id);
            if (!initial || this.hasChanges(initial, value)) {
                updates.push(value);
            }
        }

        const deletions = Array.from(this.deletedIds);

        if (creations.length === 0 && updates.length === 0 && deletions.length === 0) {
            this.dialogRef.close();
            return;
        }

        const requests = [
            ...creations.map((value) =>
                this.evaluacionClavesService.create(this.mapToCreatePayload(value))
            ),
            ...updates.map((value) =>
                this.evaluacionClavesService.update(value.id!, this.mapToUpdatePayload(value))
            ),
            ...deletions.map((id) => this.evaluacionClavesService.delete(id)),
        ];

        this.isSaving$.next(true);

        forkJoin(requests)
            .pipe(
                switchMap(() =>
                    this.evaluacionClavesService.listByEvaluacionDetalle(this.detalle.id)
                ),
                finalize(() => this.isSaving$.next(false))
            )
            .subscribe({
                next: (claves) => {
                    this.snackBar.open('Claves guardadas correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.dialogRef.close({ action: 'saved', claves });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'No fue posible guardar las claves de evaluación.',
                        'Cerrar',
                        { duration: 6000 }
                    );
                },
            });
    }

    protected onEnterKey(event: KeyboardEvent, rowIndex: number, column: TablaColumna): void {
        event.preventDefault();
        event.stopPropagation();

        const targetIndex = rowIndex + 1;
        if (targetIndex >= this.clavesForm.length) {
            return;
        }

        this.focusField(targetIndex, column);
    }

    protected onRespuestaArrowKey(event: KeyboardEvent, rowIndex: number, direction: 1 | -1): void {
        event.preventDefault();
        event.stopPropagation();

        const control = this.clavesForm.at(rowIndex)?.controls.respuesta;
        if (!control) {
            return;
        }

        const currentValue = (control.value ?? '').toString().trim().toUpperCase();
        const currentIndex = this.respuestas.indexOf(currentValue);

        const fallbackIndex = direction === 1 ? 0 : this.respuestas.length - 1;
        const nextIndex =
            currentIndex === -1 ? fallbackIndex : this.clampIndex(currentIndex + direction);

        const nextValue = this.respuestas[nextIndex];
        if (currentValue === nextValue) {
            return;
        }

        control.setValue(nextValue);
        control.markAsDirty();
        control.markAsTouched();
        this.cdr.markForCheck();
    }

    private focusField(rowIndex: number, column: TablaColumna): void {
        queueMicrotask(() => {
            if (column === TablaColumna.PreguntaOrden) {
                const input = this.preguntaOrdenInputs?.toArray()[rowIndex]?.nativeElement;
                input?.focus();
                input?.select();
                return;
            }

            if (column === TablaColumna.Respuesta) {
                const select = this.respuestaSelects?.toArray()[rowIndex];
                select?.focus();
            }
        });
    }

    private clampIndex(index: number): number {
        if (index < 0) {
            return 0;
        }

        if (index >= this.respuestas.length) {
            return this.respuestas.length - 1;
        }

        return index;
    }

    private loadClaves(): void {
        this.isLoading$.next(true);
        this.evaluacionClavesService
            .listByEvaluacionDetalle(this.detalle.id)
            .pipe(finalize(() => this.isLoading$.next(false)))
            .subscribe({
                next: (claves) => {
                    if (claves.length === 0) {
                        this.populateFormWithDefaults();
                    } else {
                        this.populateFormWithClaves(claves);
                    }
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'No fue posible cargar las claves de evaluación.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                    this.populateFormWithDefaults();
                },
            });
    }

    private populateFormWithClaves(claves: EvaluacionClave[]): void {
        this.resetFormState();
        const sorted = [...claves].sort((a, b) => a.preguntaOrden - b.preguntaOrden);
        for (const clave of sorted) {
            const value = this.mapEntityToFormValue(clave);
            this.initialValueMap.set(clave.id, value);
            this.clavesForm.push(this.createClaveGroup(value));
        }
        this.cdr.markForCheck();
    }

    private populateFormWithDefaults(): void {
        this.resetFormState();
        const defaults = this.generateDefaultClaves();

        if (defaults.length === 0) {
            this.snackBar.open(
                'No fue posible generar claves automáticas para el rango configurado.',
                'Cerrar',
                { duration: 5000 }
            );
            return;
        }

        for (const value of defaults) {
            this.clavesForm.push(this.createClaveGroup(value));
        }
        this.cdr.markForCheck();
    }

    private resetFormState(): void {
        this.deletedIds.clear();
        this.initialValueMap.clear();
        this.clavesForm.clear();
        this.cdr.markForCheck();
    }

    private createClaveGroup(value: EvaluacionClaveFormValue): EvaluacionClaveFormGroup {
        return this.fb.group({
            id: [value.id],
            evaluacionProgramadaId: [value.evaluacionProgramadaId, [Validators.required]],
            evaluacionDetalleId: [value.evaluacionDetalleId, [Validators.required]],
            preguntaOrden: [value.preguntaOrden, [Validators.required, Validators.min(0)]],
            respuesta: [value.respuesta, [Validators.required, Validators.pattern(/^[A-H]$/i)]],
            ponderacion: [value.ponderacion],
            version: [value.version, [Validators.required, Validators.min(1)]],
            vigente: [value.vigente],
            observacion: [value.observacion],
            activo: [value.activo],
            sedeId: [value.sedeId],
            cicloId: [value.cicloId],
            seccionId: [value.seccionId],
        }) as EvaluacionClaveFormGroup;
    }

    private buildFormValue(partial?: Partial<EvaluacionClaveFormValue>): EvaluacionClaveFormValue {
        const base: EvaluacionClaveFormValue = {
            id: null,
            evaluacionProgramadaId: this.evaluacion.id,
            evaluacionDetalleId: this.detalle.id,
            preguntaOrden: this.detalle.rangoInicio,
            respuesta: '',
            ponderacion: null,
            version: 1,
            vigente: true,
            observacion: null,
            activo: true,
            sedeId: this.evaluacion.sedeId ?? null,
            cicloId: this.evaluacion.cicloId ?? null,
            seccionId: this.detalle.seccionId ?? null,
        };

        return { ...base, ...partial };
    }

    private generateDefaultClaves(): EvaluacionClaveFormValue[] {
        const inicio = this.detalle.rangoInicio;
        const fin = this.detalle.rangoFin;

        if (
            inicio === null ||
            inicio === undefined ||
            fin === null ||
            fin === undefined ||
            !Number.isFinite(inicio) ||
            !Number.isFinite(fin) ||
            fin < inicio
        ) {
            return [];
        }

        const valores: EvaluacionClaveFormValue[] = [];
        for (let orden = inicio; orden <= fin; orden++) {
            valores.push(this.buildFormValue({ preguntaOrden: orden }));
        }

        return valores;
    }

    private mapEntityToFormValue(entity: EvaluacionClave): EvaluacionClaveFormValue {
        return {
            id: entity.id,
            evaluacionProgramadaId: entity.evaluacionProgramadaId,
            evaluacionDetalleId: entity.evaluacionDetalleId,
            preguntaOrden: entity.preguntaOrden,
            respuesta: entity.respuesta.toUpperCase(),
            ponderacion: entity.ponderacion ?? null,
            version: entity.version ?? 1,
            vigente: entity.vigente,
            observacion: entity.observacion ?? null,
            activo: entity.activo,
            sedeId: entity.sedeId ?? null,
            cicloId: entity.cicloId ?? null,
            seccionId: entity.seccionId ?? null,
        };
    }

    private normalizeFormValue(value: EvaluacionClaveFormValue): EvaluacionClaveFormValue {
        const respuesta = (value.respuesta ?? '').toString().trim().toUpperCase();
        return {
            ...value,
            preguntaOrden: Number(value.preguntaOrden),
            respuesta,
            ponderacion:
                value.ponderacion === null || value.ponderacion === undefined
                    ? null
                    : Number(value.ponderacion),
            observacion:
                value.observacion && value.observacion.trim().length > 0
                    ? value.observacion.trim()
                    : null,
        };
    }

    private hasChanges(
        initial: EvaluacionClaveFormValue,
        current: EvaluacionClaveFormValue
    ): boolean {
        return (
            initial.preguntaOrden !== current.preguntaOrden ||
            initial.respuesta !== current.respuesta ||
            initial.ponderacion !== current.ponderacion ||
            initial.version !== current.version ||
            initial.vigente !== current.vigente ||
            initial.observacion !== current.observacion ||
            initial.activo !== current.activo ||
            initial.sedeId !== current.sedeId ||
            initial.cicloId !== current.cicloId ||
            initial.seccionId !== current.seccionId
        );
    }

    private mapToCreatePayload(value: EvaluacionClaveFormValue): CreateEvaluacionClavePayload {
        return {
            evaluacionProgramadaId: value.evaluacionProgramadaId,
            evaluacionDetalleId: value.evaluacionDetalleId,
            preguntaOrden: value.preguntaOrden,
            respuesta: value.respuesta,
            ponderacion: value.ponderacion,
            version: value.version,
            vigente: value.vigente,
            observacion: value.observacion,
            activo: value.activo,
            sedeId: value.sedeId,
            cicloId: value.cicloId,
            seccionId: value.seccionId,
        };
    }

    private mapToUpdatePayload(value: EvaluacionClaveFormValue): UpdateEvaluacionClavePayload {
        return this.mapToCreatePayload(value);
    }

    private calculateNextPreguntaOrden(): number {
        const ordenes = this.clavesForm.controls
            .map((control) => Number(control.controls.preguntaOrden.value))
            .filter((orden) => Number.isFinite(orden));

        if (ordenes.length === 0) {
            const inicio = this.detalle.rangoInicio;
            return Number.isFinite(inicio) ? Number(inicio) : 1;
        }

        return Math.max(...ordenes) + 1;
    }

    private findDuplicatedOrdenes(): number[] {
        const counts = new Map<number, number>();
        for (const control of this.clavesForm.controls) {
            const orden = Number(control.controls.preguntaOrden.value);
            if (!Number.isFinite(orden)) {
                continue;
            }

            counts.set(orden, (counts.get(orden) ?? 0) + 1);
        }

        return Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([orden]) => orden)
            .sort((a, b) => a - b);
    }

    private ensureRespuestasUppercase(): void {
        this.clavesForm.controls.forEach((control) => {
            const respuestaControl = control.controls.respuesta;
            const normalized = (respuestaControl.value ?? '')
                .toString()
                .trim()
                .toUpperCase();
            const current = (respuestaControl.value ?? '').toString();

            if (current !== normalized) {
                respuestaControl.setValue(normalized, { emitEvent: false });
                respuestaControl.markAsDirty();
            }

            respuestaControl.markAsTouched();
            respuestaControl.updateValueAndValidity({ emitEvent: false });
        });

        this.cdr.markForCheck();
    }

    private findInvalidRespuestas(): InvalidRespuesta[] {
        const invalid: InvalidRespuesta[] = [];

        this.clavesForm.controls.forEach((control, index) => {
            const value = (control.controls.respuesta.value ?? '')
                .toString()
                .trim()
                .toUpperCase();

            if (this.respuestas.includes(value)) {
                return;
            }

            const preguntaOrden = Number(control.controls.preguntaOrden.value);
            if (Number.isFinite(preguntaOrden)) {
                invalid.push({ type: 'pregunta', value: preguntaOrden });
                return;
            }

            invalid.push({ type: 'registro', value: index + 1 });
        });

        return invalid;
    }

    private formatInvalidRespuestasMessage(invalid: InvalidRespuesta[]): string {
        const preguntas = invalid
            .filter((item) => item.type === 'pregunta')
            .map((item) => item.value)
            .sort((a, b) => a - b);
        const registros = invalid
            .filter((item) => item.type === 'registro')
            .map((item) => item.value)
            .sort((a, b) => a - b);

        const messages: string[] = [];

        if (preguntas.length > 0) {
            const label = preguntas.length === 1 ? 'La respuesta de la pregunta' : 'Las respuestas de las preguntas';
            messages.push(`${label} ${preguntas.join(', ')} deben estar entre A y H.`);
        }

        if (registros.length > 0) {
            const label = registros.length === 1 ? 'La respuesta del registro' : 'Las respuestas de los registros';
            messages.push(`${label} ${registros.join(', ')} deben estar entre A y H.`);
        }

        if (messages.length === 0) {
            return 'Verifica que todas las respuestas tengan un valor entre A y H.';
        }

        return messages.join(' ');
    }
}
