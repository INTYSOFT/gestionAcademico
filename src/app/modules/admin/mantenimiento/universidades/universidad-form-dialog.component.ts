import { AsyncPipe, NgIf } from '@angular/common';
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize, tap } from 'rxjs';
import {
    CreateUniversidadPayload,
    Universidad,
} from 'app/core/models/centro-estudios/universidad.model';
import { UniversidadService } from 'app/core/services/centro-estudios/universidad.service';

export interface UniversidadDialogResult {
    universidad?: Universidad;
    reload?: boolean;
}

@Component({
    selector: 'app-universidad-form-dialog',
    standalone: true,
    templateUrl: './universidad-form-dialog.component.html',
    styleUrl: './universidad-form-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSlideToggleModule,
        MatSnackBarModule,
    ],
})
export class UniversidadFormDialogComponent {
    form: FormGroup;
    selectedUniversidad: Universidad | null = null;
    isSaving$ = new BehaviorSubject<boolean>(false);

    constructor(
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private universidadService: UniversidadService,
        private dialogRef: MatDialogRef<UniversidadFormDialogComponent, UniversidadDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: Universidad | null
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ciudad: ['', [Validators.maxLength(150)]],
            activo: [true],
        });

        if (data) {
            this.selectUniversidad(data);
        }
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateUniversidadPayload = {
            nombre: this.form.value.nombre,
            ciudad: this.form.value.ciudad,
            activo: this.form.value.activo,
        };

        this.isSaving$.next(true);

        const isEditing = !!this.selectedUniversidad;
        const request$ = isEditing
            ? this.universidadService.updateUniversidad(this.selectedUniversidad!.id, payload)
            : this.universidadService.createUniversidad(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((universidad) => {
                    if (universidad) {
                        this.dialogRef.close({ universidad });
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                    }

                    this.snackBar.open(
                        isEditing
                            ? 'Universidad actualizada correctamente.'
                            : 'Universidad registrada correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                }),
                finalize(() => {
                    this.isSaving$.next(false);

                    if (shouldReloadAfterUpdate) {
                        this.dialogRef.close({ reload: true });
                    }
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar la universidad.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    resetForm(): void {
        this.selectedUniversidad = null;
        this.form.reset({
            nombre: '',
            ciudad: '',
            activo: true,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    selectUniversidad(universidad: Universidad): void {
        this.selectedUniversidad = universidad;
        this.form.patchValue({
            nombre: universidad.nombre,
            ciudad: universidad.ciudad ?? '',
            activo: universidad.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
