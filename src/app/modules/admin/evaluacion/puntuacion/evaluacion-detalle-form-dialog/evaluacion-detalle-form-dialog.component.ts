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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    CreateEvaluacionDetallePayload,
    EvaluacionDetalle,
    UpdateEvaluacionDetallePayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import { EvaluacionDetallesService } from 'app/core/services/centro-estudios/evaluacion-detalles.service';

export interface EvaluacionDetalleFormDialogData {
    mode: 'create' | 'edit';
    evaluacionProgramadaId: number;
    seccionId: number | null;
    detalle: EvaluacionDetalle | null;
}

export type EvaluacionDetalleFormDialogResult =
    | { action: 'created'; detalle: EvaluacionDetalle }
    | { action: 'updated'; detalle: EvaluacionDetalle };

function rangoValidator(control: AbstractControl): ValidationErrors | null {
    if (!(control instanceof FormGroup)) {
        return null;
    }

    const rangoInicio = Number(control.get('rangoInicio')?.value ?? 0);
    const rangoFin = Number(control.get('rangoFin')?.value ?? 0);

    if (Number.isNaN(rangoInicio) || Number.isNaN(rangoFin)) {
        return null;
    }

    if (rangoFin < rangoInicio) {
        return { rangoInvalido: true };
    }

    return null;
}

@Component({
    selector: 'app-evaluacion-detalle-form-dialog',
    standalone: true,
    templateUrl: './evaluacion-detalle-form-dialog.component.html',
    styleUrls: ['./evaluacion-detalle-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressBarModule
],
})
export class EvaluacionDetalleFormDialogComponent {
    protected readonly title =
        this.data.mode === 'create'
            ? 'Registrar detalle de evaluación'
            : 'Editar detalle de evaluación';

    protected readonly form: FormGroup;
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    constructor(
        @Inject(MAT_DIALOG_DATA) private readonly data: EvaluacionDetalleFormDialogData,
        private readonly dialogRef: MatDialogRef<
            EvaluacionDetalleFormDialogComponent,
            EvaluacionDetalleFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionDetallesService: EvaluacionDetallesService
    ) {
        this.form = this.fb.group(
            {
                rangoInicio: [0, [Validators.required, Validators.min(0)]],
                rangoFin: [0, [Validators.required, Validators.min(0)]],
                valorBuena: [0, [Validators.required]],
                valorMala: [0, [Validators.required]],
                valorBlanca: [0, [Validators.required]],
                observacion: ['', [Validators.maxLength(300)]],
                activo: [true],
            },
            { validators: [rangoValidator] }
        );

        if (data.detalle) {
            this.patchForm(data.detalle);
        } else if (data.seccionId === null) {
            this.form.patchValue({
                activo: true,
            });
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
            ? this.evaluacionDetallesService.update(this.data.detalle!.id, payload)
            : this.evaluacionDetallesService.create(payload);

        this.isSaving$.next(true);
        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (detalle) => {
                    const action = isEditMode ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Detalle registrado correctamente.'
                            : 'Detalle actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, detalle });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'No fue posible guardar el detalle de evaluación.',
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

    private patchForm(detalle: EvaluacionDetalle): void {
        this.form.patchValue({
            rangoInicio: detalle.rangoInicio,
            rangoFin: detalle.rangoFin,
            valorBuena: detalle.valorBuena,
            valorMala: detalle.valorMala,
            valorBlanca: detalle.valorBlanca,
            observacion: detalle.observacion ?? '',
            activo: detalle.activo,
        });
    }

    private buildPayload(): CreateEvaluacionDetallePayload | UpdateEvaluacionDetallePayload {
        const controls = this.form.controls;

        const payload: CreateEvaluacionDetallePayload = {
            evaluacionProgramadaId: this.data.evaluacionProgramadaId,
            seccionId: this.data.seccionId ?? null,
            rangoInicio: Number(controls['rangoInicio'].value),
            rangoFin: Number(controls['rangoFin'].value),
            valorBuena: Number(controls['valorBuena'].value),
            valorMala: Number(controls['valorMala'].value),
            valorBlanca: Number(controls['valorBlanca'].value),
            observacion: this.normalizeObservacion(controls['observacion'].value),
            activo: Boolean(controls['activo'].value),
        };

        return payload;
    }

    private normalizeObservacion(value: unknown): string | null {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }

        return null;
    }
}
