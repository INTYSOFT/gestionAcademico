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
    Colegio,
    CreateColegioPayload,
} from 'app/core/models/centro-estudios/colegio.model';
import { ColegiosService } from 'app/core/services/centro-estudios/colegios.service';

export interface ColegioDialogResult {
    colegio?: Colegio;
    reload?: boolean;
}

@Component({
    selector: 'app-colegio-form-dialog',
    standalone: true,
    templateUrl: './colegio-form-dialog.component.html',
    styleUrl: './colegio-form-dialog.component.scss',
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
export class ColegioFormDialogComponent {
    form: FormGroup;
    selectedColegio: Colegio | null = null;
    isSaving$ = new BehaviorSubject<boolean>(false);

    constructor(
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private colegiosService: ColegiosService,
        private dialogRef: MatDialogRef<ColegioFormDialogComponent, ColegioDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: Colegio | null
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ubigeoCode: [
                '',
                [
                    Validators.maxLength(6),
                    Validators.pattern(/^(\d{6})?$/),
                ],
            ],
            esPrivado: [false],
            activo: [true],
        });

        if (data) {
            this.selectColegio(data);
        }
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateColegioPayload = {
            nombre: this.form.value.nombre,
            ubigeoCode: this.form.value.ubigeoCode ? this.form.value.ubigeoCode : null,
            esPrivado: this.form.value.esPrivado,
            activo: this.form.value.activo,
        };

        this.isSaving$.next(true);

        const isEditing = !!this.selectedColegio;
        const request$ = isEditing
            ? this.colegiosService.updateColegio(this.selectedColegio!.id, payload)
            : this.colegiosService.createColegio(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((colegio) => {
                    if (colegio) {
                        this.dialogRef.close({ colegio });
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                    }

                    this.snackBar.open(
                        isEditing
                            ? 'Colegio actualizado correctamente.'
                            : 'Colegio registrado correctamente.',
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
                        error.message ?? 'Ocurrió un error al guardar el colegio.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    resetForm(): void {
        this.selectedColegio = null;
        this.form.reset({
            nombre: '',
            ubigeoCode: '',
            esPrivado: false,
            activo: true,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    selectColegio(colegio: Colegio): void {
        this.selectedColegio = colegio;
        this.form.patchValue({
            nombre: colegio.nombre,
            ubigeoCode: colegio.ubigeoCode ?? '',
            esPrivado: colegio.esPrivado ?? false,
            activo: colegio.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
