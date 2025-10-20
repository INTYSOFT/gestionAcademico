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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize, tap } from 'rxjs';
import { CreateSedePayload, Sede } from 'app/core/models/centro-estudios/sede.model';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';

export interface SedeDialogResult {
    sede?: Sede;
    reload?: boolean;
}

@Component({
    selector: 'app-sede-form-dialog',
    standalone: true,
    templateUrl: './sede-form-dialog.component.html',
    styleUrl: './sede-form-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSnackBarModule
],
})
export class SedeFormDialogComponent {
    form: FormGroup;
    selectedSede: Sede | null = null;
    isSaving$ = new BehaviorSubject<boolean>(false);

    constructor(
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private sedeService: SedeService,
        private dialogRef: MatDialogRef<SedeFormDialogComponent, SedeDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: Sede | null
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ubigeoCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
            direccion: ['', [Validators.maxLength(255)]],
            activo: [true],
        });

        if (data) {
            this.selectSede(data);
        }
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateSedePayload = {
            nombre: this.form.value.nombre,
            ubigeoCode: this.form.value.ubigeoCode,
            direccion: this.form.value.direccion,
            activo: this.form.value.activo,
        };

        this.isSaving$.next(true);

        const isEditing = !!this.selectedSede;
        const request$ = isEditing
            ? this.sedeService.updateSede(this.selectedSede!.id, payload)
            : this.sedeService.createSede(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((sede) => {
                    if (sede) {
                        this.dialogRef.close({ sede });
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                    }

                    this.snackBar.open(
                        isEditing ? 'Sede actualizada correctamente.' : 'Sede registrada correctamente.',
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
                    this.snackBar.open(error.message ?? 'Ocurrió un error al guardar la sede.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    resetForm(): void {
        this.selectedSede = null;
        this.form.reset({
            nombre: '',
            ubigeoCode: '',
            direccion: '',
            activo: true,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    selectSede(sede: Sede): void {
        this.selectedSede = sede;
        this.form.patchValue({
            nombre: sede.nombre,
            ubigeoCode: sede.ubigeoCode,
            direccion: sede.direccion ?? '',
            activo: sede.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
