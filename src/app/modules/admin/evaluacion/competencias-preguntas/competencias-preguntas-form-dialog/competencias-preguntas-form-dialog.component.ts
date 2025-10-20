import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
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
    CreateEvaluacionTipoPreguntaPayload,
    EvaluacionTipoPregunta,
} from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { EvaluacionTipoPreguntasService } from 'app/core/services/centro-estudios/evaluacion-tipo-preguntas.service';

export interface CompetenciasPreguntasFormDialogData {
    evaluacionTipoPregunta: EvaluacionTipoPregunta | null;
}

export type CompetenciasPreguntasFormDialogResult =
    | { action: 'created'; evaluacionTipoPregunta: EvaluacionTipoPregunta }
    | { action: 'updated'; evaluacionTipoPregunta: EvaluacionTipoPregunta };

@Component({
    selector: 'app-competencias-preguntas-form-dialog',
    standalone: true,
    templateUrl: './competencias-preguntas-form-dialog.component.html',
    styleUrls: ['./competencias-preguntas-form-dialog.component.scss'],
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
        MatProgressBarModule,
    ],
})
export class CompetenciasPreguntasFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: CompetenciasPreguntasFormDialogData,
        private readonly dialogRef: MatDialogRef<
            CompetenciasPreguntasFormDialogComponent,
            CompetenciasPreguntasFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly evaluacionTipoPreguntasService: EvaluacionTipoPreguntasService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            codigo: ['', [Validators.required, Validators.maxLength(50)]],
            descripcion: ['', [Validators.maxLength(300)]],
            activo: [true],
        });

        if (data.evaluacionTipoPregunta) {
            this.patchForm(data.evaluacionTipoPregunta);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const current = this.data.evaluacionTipoPregunta ?? null;
        this.isSaving$.next(true);

        const request$ = current
            ? this.evaluacionTipoPreguntasService.updateEvaluacionTipoPregunta(current.id, payload)
            : this.evaluacionTipoPreguntasService.createEvaluacionTipoPregunta(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = current ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Tipo de pregunta registrado correctamente.'
                            : 'Tipo de pregunta actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, evaluacionTipoPregunta: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el tipo de pregunta.',
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

    private patchForm(evaluacionTipoPregunta: EvaluacionTipoPregunta): void {
        this.form.patchValue({
            nombre: evaluacionTipoPregunta.nombre,
            codigo: evaluacionTipoPregunta.codigo,
            descripcion: evaluacionTipoPregunta.descripcion ?? '',
            activo: evaluacionTipoPregunta.activo,
        });
    }

    private buildPayload(): CreateEvaluacionTipoPreguntaPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const codigo = String(raw.codigo ?? '').trim();
        const descripcion = String(raw.descripcion ?? '').trim();

        return {
            nombre,
            codigo,
            descripcion: descripcion ? descripcion : null,
            activo: !!raw.activo,
        };
    }
}
