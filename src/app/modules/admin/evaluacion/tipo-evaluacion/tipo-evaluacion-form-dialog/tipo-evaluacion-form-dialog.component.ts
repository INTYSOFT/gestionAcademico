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
    CreateTipoEvaluacionPayload,
    TipoEvaluacion,
} from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';

export interface TipoEvaluacionFormDialogData {
    tipoEvaluacion: TipoEvaluacion | null;
}

export type TipoEvaluacionFormDialogResult =
    | { action: 'created'; tipoEvaluacion: TipoEvaluacion }
    | { action: 'updated'; tipoEvaluacion: TipoEvaluacion };

@Component({
    selector: 'app-tipo-evaluacion-form-dialog',
    standalone: true,
    templateUrl: './tipo-evaluacion-form-dialog.component.html',
    styleUrls: ['./tipo-evaluacion-form-dialog.component.scss'],
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
export class TipoEvaluacionFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: TipoEvaluacionFormDialogData,
        private readonly dialogRef: MatDialogRef<
            TipoEvaluacionFormDialogComponent,
            TipoEvaluacionFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly tipoEvaluacionesService: TipoEvaluacionesService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            descripcion: ['', [Validators.maxLength(300)]],
            activo: [true],
        });

        if (data.tipoEvaluacion) {
            this.patchForm(data.tipoEvaluacion);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const tipoEvaluacion = this.data.tipoEvaluacion ?? null;
        this.isSaving$.next(true);

        const request$ = tipoEvaluacion
            ? this.tipoEvaluacionesService.updateTipoEvaluacion(tipoEvaluacion.id, payload)
            : this.tipoEvaluacionesService.createTipoEvaluacion(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = tipoEvaluacion ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Tipo de evaluación registrado correctamente.'
                            : 'Tipo de evaluación actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, tipoEvaluacion: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el tipo de evaluación.',
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

    private patchForm(tipoEvaluacion: TipoEvaluacion): void {
        this.form.patchValue({
            nombre: tipoEvaluacion.nombre,
            descripcion: tipoEvaluacion.descripcion ?? '',
            activo: tipoEvaluacion.activo,
        });
    }

    private buildPayload(): CreateTipoEvaluacionPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const descripcion = String(raw.descripcion ?? '').trim();

        return {
            nombre,
            descripcion: descripcion ? descripcion : null,
            activo: !!raw.activo,
        };
    }
}
