import { AsyncPipe, NgIf } from '@angular/common';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    CreateEspecialidadPayload,
    Especialidad,
} from 'app/core/models/centro-estudios/especialidad.model';
import { EspecialidadesService } from 'app/core/services/centro-estudios/especialidades.service';

export interface EspecialidadFormDialogData {
    especialidad: Especialidad | null;
}

export type EspecialidadFormDialogResult =
    | { action: 'created'; especialidad: Especialidad }
    | { action: 'updated'; especialidad: Especialidad };

@Component({
    selector: 'app-especialidad-form-dialog',
    standalone: true,
    templateUrl: './especialidad-form-dialog.component.html',
    styleUrls: ['./especialidad-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgIf,
        AsyncPipe,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        MatProgressBarModule,
    ],
})
export class EspecialidadFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: EspecialidadFormDialogData,
        private readonly dialogRef: MatDialogRef<
            EspecialidadFormDialogComponent,
            EspecialidadFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly especialidadesService: EspecialidadesService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            descripcion: ['', [Validators.maxLength(255)]],
            activo: [true],
        });

        if (data.especialidad) {
            this.patchForm(data.especialidad);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const especialidad = this.data.especialidad ?? null;
        this.isSaving$.next(true);

        const request$ = especialidad
            ? this.especialidadesService.updateEspecialidad(especialidad.id, payload)
            : this.especialidadesService.createEspecialidad(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = especialidad ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Especialidad registrada correctamente.'
                            : 'Especialidad actualizada correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, especialidad: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar la especialidad.',
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

    private patchForm(especialidad: Especialidad): void {
        this.form.patchValue({
            nombre: especialidad.nombre,
            descripcion: especialidad.descripcion ?? '',
            activo: especialidad.activo,
        });
    }

    private buildPayload(): CreateEspecialidadPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const descripcionRaw = raw.descripcion;
        const descripcion =
            descripcionRaw === null || descripcionRaw === undefined
                ? null
                : String(descripcionRaw).trim();

        const payload: CreateEspecialidadPayload = {
            nombre,
            descripcion: descripcion && descripcion.length > 0 ? descripcion : null,
            activo: !!raw.activo,
        };

        return payload;
    }
}
