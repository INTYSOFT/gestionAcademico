import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    ViewEncapsulation,
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    CreateEvaluacionDetalleDefatultPayload,
    EvaluacionDetalleDefatult,
} from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionDetalleDefatultsService } from 'app/core/services/centro-estudios/evaluacion-detalle-defatults.service';

export interface EvaluacionDetalleDefatultFormDialogData {
    mode: 'create' | 'edit';
    detalle: EvaluacionDetalleDefatult | null;
    evaluacionTipoPreguntas: EvaluacionTipoPregunta[];
    detalles: EvaluacionDetalleDefatult[];
}

export type EvaluacionDetalleDefatultFormDialogResult =
    | { action: 'created'; detalle: EvaluacionDetalleDefatult }
    | { action: 'updated'; detalle: EvaluacionDetalleDefatult };

function rangoValidator(control: AbstractControl): ValidationErrors | null {
    if (!(control instanceof FormGroup)) {
        return null;
    }

    const rangoInicio = Number(control.get('rangoInicio')?.value ?? 0);
    const rangoFin = Number(control.get('rangoFin')?.value ?? 0);

    if (Number.isNaN(rangoInicio) || Number.isNaN(rangoFin)) {
        return null;
    }

    return rangoFin < rangoInicio ? { rangoInvalido: true } : null;
}

function createRangoDisponibleValidator(
    detallesProvider: () => readonly EvaluacionDetalleDefatult[],
    currentDetalleProvider: () => EvaluacionDetalleDefatult | null
): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!(control instanceof FormGroup)) {
            return null;
        }

        const evaluacionTipoPreguntaId = Number(
            control.get('evaluacionTipoPreguntaId')?.value ?? 0
        );
        const rangoInicio = Number(control.get('rangoInicio')?.value ?? 0);
        const rangoFin = Number(control.get('rangoFin')?.value ?? 0);

        if (
            Number.isNaN(evaluacionTipoPreguntaId) ||
            Number.isNaN(rangoInicio) ||
            Number.isNaN(rangoFin)
        ) {
            return null;
        }

        const currentDetalle = currentDetalleProvider();

        const hasOverlap = detallesProvider().some((detalle) => {
            if (currentDetalle && detalle.id === currentDetalle.id) {
                return false;
            }

            if (detalle.evaluacionTipoPreguntaId !== evaluacionTipoPreguntaId) {
                return false;
            }

            const detalleInicio = Number(detalle.rangoInicio);
            const detalleFin = Number(detalle.rangoFin);

            return rangoInicio <= detalleFin && rangoFin >= detalleInicio;
        });

        return hasOverlap ? { rangoOcupado: true } : null;
    };
}

@Component({
    selector: 'app-evaluacion-detalle-defatult-form-dialog',
    standalone: true,
    templateUrl: './evaluacion-detalle-defatult-form-dialog.component.html',
    styleUrls: ['./evaluacion-detalle-defatult-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatProgressBarModule,
    ],
})
export class EvaluacionDetalleDefatultFormDialogComponent {
    protected readonly title =
        this.data.mode === 'create'
            ? 'Registrar valores por defecto'
            : 'Editar valores por defecto';

    protected readonly form: FormGroup;
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly evaluacionTipoPreguntas: EvaluacionTipoPregunta[];
    private readonly detallesRegistrados: EvaluacionDetalleDefatult[];

    constructor(
        @Inject(MAT_DIALOG_DATA)
        private readonly data: EvaluacionDetalleDefatultFormDialogData,
        private readonly dialogRef: MatDialogRef<
            EvaluacionDetalleDefatultFormDialogComponent,
            EvaluacionDetalleDefatultFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionDetalleDefatultsService: EvaluacionDetalleDefatultsService
    ) {
        this.evaluacionTipoPreguntas = [...this.data.evaluacionTipoPreguntas];
        this.detallesRegistrados = this.data.detalles.map((detalle) => ({
            ...detalle,
        }));

        this.form = this.fb.group(
            {
                evaluacionTipoPreguntaId: [null, [Validators.required]],
                rangoInicio: [0, [Validators.required, Validators.min(0)]],
                rangoFin: [0, [Validators.required, Validators.min(0)]],
                valorBuena: [0, [Validators.required]],
                valorMala: [0, [Validators.required]],
                valorBlanca: [0, [Validators.required]],
                observacion: ['', [Validators.maxLength(500)]],
                activo: [true],
            },
            {
                validators: [
                    rangoValidator,
                    createRangoDisponibleValidator(
                        () => this.detallesRegistrados,
                        () => this.data.detalle
                    ),
                ],
            }
        );

        if (data.detalle) {
            this.patchForm(data.detalle);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const isEditMode = this.data.mode === 'edit' && this.data.detalle;
        const request$ = isEditMode
            ? this.evaluacionDetalleDefatultsService.update(
                  this.data.detalle!.id,
                  payload
              )
            : this.evaluacionDetalleDefatultsService.create(payload);

        this.isSaving$.next(true);
        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (detalle) => {
                    const action = isEditMode ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Valores registrados correctamente.'
                            : 'Valores actualizados correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, detalle });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ??
                            'No fue posible guardar los valores por defecto de puntuación.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected hasError(controlName: string, errorCode: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.touched && control.hasError(errorCode);
    }

    protected get rangoInvalido(): boolean {
        return this.form.touched && this.form.hasError('rangoInvalido');
    }

    protected get rangoOcupado(): boolean {
        return this.form.touched && this.form.hasError('rangoOcupado');
    }

    private patchForm(detalle: EvaluacionDetalleDefatult): void {
        this.form.patchValue({
            evaluacionTipoPreguntaId: detalle.evaluacionTipoPreguntaId,
            rangoInicio: detalle.rangoInicio,
            rangoFin: detalle.rangoFin,
            valorBuena: detalle.valorBuena,
            valorMala: detalle.valorMala,
            valorBlanca: detalle.valorBlanca,
            observacion: detalle.observacion ?? '',
            activo: detalle.activo,
        });
    }

    private buildPayload(): CreateEvaluacionDetalleDefatultPayload {
        const controls = this.form.controls;

        return {
            evaluacionTipoPreguntaId: Number(controls['evaluacionTipoPreguntaId'].value),
            rangoInicio: Number(controls['rangoInicio'].value),
            rangoFin: Number(controls['rangoFin'].value),
            valorBuena: Number(controls['valorBuena'].value),
            valorMala: Number(controls['valorMala'].value),
            valorBlanca: Number(controls['valorBlanca'].value),
            observacion: controls['observacion'].value
                ? String(controls['observacion'].value)
                : null,
            activo: Boolean(controls['activo'].value),
        } satisfies CreateEvaluacionDetalleDefatultPayload;
    }
}
