import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    ViewEncapsulation,
    signal,
} from '@angular/core';
import {
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import {
    CreateEvaluacionDetalleDefatultPayload,
    EvaluacionDetalleDefatult,
    UpdateEvaluacionDetalleDefatultPayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionDetalleDefatultsService } from 'app/core/services/centro-estudios/evaluacion-detalle-defatults.service';

export type EvaluacionDetalleDefatultFormDialogMode = 'create' | 'edit';

export interface EvaluacionDetalleDefatultFormDialogData {
    mode: EvaluacionDetalleDefatultFormDialogMode;
    detalle: EvaluacionDetalleDefatult | null;
    evaluacionTipoPreguntas: EvaluacionTipoPregunta[];
}

export interface EvaluacionDetalleDefatultFormDialogResult {
    action: 'created' | 'updated';
    detalle: EvaluacionDetalleDefatult;
}

@Component({
    selector: 'app-evaluacion-detalle-defatult-form-dialog',
    standalone: true,
    templateUrl: './evaluacion-detalle-defatult-form-dialog.component.html',
    styleUrls: ['./evaluacion-detalle-defatult-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressBarModule,
    ],
})
export class EvaluacionDetalleDefatultFormDialogComponent {
    protected readonly isSaving = signal(false);

    protected readonly form = this.fb.nonNullable.group(
        {
            evaluacionTipoPreguntaId: [0, Validators.required],
            rangoInicio: [0, [Validators.required, Validators.min(0)]],
            rangoFin: [0, [Validators.required, Validators.min(0)]],
            valorBuena: [0, [Validators.required]],
            valorMala: [0, [Validators.required]],
            valorBlanca: [0, [Validators.required]],
            observacion: [''],
            activo: [true],
        },
        { validators: [this.validateRango.bind(this)] }
    );

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialogRef: MatDialogRef<
            EvaluacionDetalleDefatultFormDialogComponent,
            EvaluacionDetalleDefatultFormDialogResult | undefined
        >,
        @Inject(MAT_DIALOG_DATA)
        protected readonly data: EvaluacionDetalleDefatultFormDialogData,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionDetalleDefatultsService: EvaluacionDetalleDefatultsService
    ) {
        this.patchForm(data.detalle);
    }

    protected save(): void {
        if (this.form.invalid || this.isSaving()) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        this.isSaving.set(true);
        this.dialogRef.disableClose = true;

        const request$ =
            this.data.mode === 'create'
                ? this.evaluacionDetalleDefatultsService.create(payload)
                : this.evaluacionDetalleDefatultsService.update(this.data.detalle!.id, payload);

        request$
            .pipe(
                finalize(() => {
                    this.isSaving.set(false);
                    this.dialogRef.disableClose = false;
                })
            )
            .subscribe({
                next: (detalle) => {
                    this.dialogRef.close({
                        action: this.data.mode === 'create' ? 'created' : 'updated',
                        detalle,
                    });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ??
                            'No fue posible guardar el detalle por defecto de la evaluación.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    protected cancel(): void {
        if (this.isSaving()) {
            return;
        }

        this.dialogRef.close();
    }

    protected hasError(controlName: keyof typeof this.form.controls, error: string): boolean {
        const control = this.form.controls[controlName];
        return control.touched && control.hasError(error);
    }

    protected get isEditMode(): boolean {
        return this.data.mode === 'edit';
    }

    private patchForm(detalle: EvaluacionDetalleDefatult | null): void {
        if (!detalle) {
            this.form.reset({
                evaluacionTipoPreguntaId: 0,
                rangoInicio: 0,
                rangoFin: 0,
                valorBuena: 0,
                valorMala: 0,
                valorBlanca: 0,
                observacion: '',
                activo: true,
            });
            return;
        }

        this.form.reset({
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

    private buildPayload(): CreateEvaluacionDetalleDefatultPayload | UpdateEvaluacionDetalleDefatultPayload {
        const raw = this.form.getRawValue();

        return {
            evaluacionTipoPreguntaId: raw.evaluacionTipoPreguntaId,
            rangoInicio: raw.rangoInicio,
            rangoFin: raw.rangoFin,
            valorBuena: raw.valorBuena,
            valorMala: raw.valorMala,
            valorBlanca: raw.valorBlanca,
            observacion: this.normalizeOptionalString(raw.observacion),
            activo: raw.activo,
        };
    }

    private normalizeOptionalString(value: string | null | undefined): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private validateRango(): ValidationErrors | null {
        const inicio = this.form.controls.rangoInicio.value;
        const fin = this.form.controls.rangoFin.value;

        if (inicio !== null && fin !== null && fin < inicio) {
            return { rangoInvalido: true };
        }

        return null;
    }
}
