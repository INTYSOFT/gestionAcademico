import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, ViewEncapsulation } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    CreateSeccionPayload,
    Seccion,
} from 'app/core/models/centro-estudios/seccion.model';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';

export interface SeccionFormDialogData {
    seccion: Seccion | null;
}

export interface SeccionFormDialogResult {
    action: 'created' | 'updated';
    seccion: Seccion;
}

@Component({
    selector: 'app-seccion-form-dialog',
    standalone: true,
    templateUrl: './seccion-form-dialog.component.html',
    styleUrls: ['./seccion-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressBarModule,
        MatSlideToggleModule,
        MatSnackBarModule,
    ],
})
export class SeccionFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: SeccionFormDialogData,
        private readonly dialogRef: MatDialogRef<
            SeccionFormDialogComponent,
            SeccionFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly seccionesService: SeccionesService
    ) {
        this.form = this.fb.group({
            nombre: [data.seccion?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
            capacidad: [data.seccion?.capacidad ?? 0, [Validators.required, Validators.min(0)]],
            activo: [data.seccion?.activo ?? true],
        });
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : '';
        const capacidadValue = Number(raw.capacidad ?? 0);
        const payload: CreateSeccionPayload = {
            nombre,
            capacidad: Number.isFinite(capacidadValue) ? capacidadValue : 0,
            activo: !!raw.activo,
        };

        if (!payload.nombre) {
            this.form.get('nombre')?.setErrors({ required: true });
            this.form.markAllAsTouched();
            return;
        }

        const isEditing = !!this.data.seccion;

        this.isSaving$.next(true);

        const request$ = isEditing
            ? this.seccionesService.update(this.data.seccion!.id, payload)
            : this.seccionesService.create(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (seccion) => {
                    this.snackBar.open(
                        isEditing
                            ? 'Sección actualizada correctamente.'
                            : 'Sección registrada correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );

                    this.dialogRef.close({
                        action: isEditing ? 'updated' : 'created',
                        seccion,
                    });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ??
                            (isEditing
                                ? 'Ocurrió un error al actualizar la sección.'
                                : 'Ocurrió un error al registrar la sección.'),
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
}
