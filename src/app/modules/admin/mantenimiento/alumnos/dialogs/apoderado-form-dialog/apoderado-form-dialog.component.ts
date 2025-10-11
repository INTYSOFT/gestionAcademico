import { ChangeDetectionStrategy, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Apoderado, CreateApoderadoPayload } from 'app/core/models/centro-estudios/apoderado.model';
import { ApoderadoService } from 'app/core/services/centro-estudios/apoderado.service';
import { finalize } from 'rxjs';

export interface ApoderadoFormDialogData {
    apoderado?: Apoderado;
}

export type ApoderadoFormDialogResult = { apoderado: Apoderado } | undefined;

@Component({
    selector: 'app-apoderado-form-dialog',
    standalone: true,
    templateUrl: './apoderado-form-dialog.component.html',
    styleUrl: './apoderado-form-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSnackBarModule,
    ],
})
export class ApoderadoFormDialogComponent implements OnInit {
    protected form: FormGroup;
    protected isSaving = false;
    protected readonly apoderado?: Apoderado;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: ApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<ApoderadoFormDialogComponent, ApoderadoFormDialogResult>,
        private readonly fb: FormBuilder,
        private readonly apoderadoService: ApoderadoService,
        private readonly snackBar: MatSnackBar
    ) {
        this.apoderado = data?.apoderado;
        this.form = this.fb.group({
            dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
            apellidoPaterno: ['', [Validators.required, Validators.maxLength(100)]],
            apellidoMaterno: ['', [Validators.required, Validators.maxLength(100)]],
            nombres: ['', [Validators.required, Validators.maxLength(150)]],
            celular: ['', [Validators.pattern(/^[0-9]{9}$/)]],
            correoElectronico: ['', [Validators.email, Validators.maxLength(150)]],
            direccion: ['', [Validators.maxLength(255)]],
        });
    }

    ngOnInit(): void {
        if (this.apoderado) {
            this.form.patchValue({
                dni: this.apoderado.dni,
                apellidoPaterno: this.apoderado.apellidoPaterno,
                apellidoMaterno: this.apoderado.apellidoMaterno,
                nombres: this.apoderado.nombres,
                celular: this.apoderado.celular,
                correoElectronico: this.apoderado.correoElectronico,
                direccion: this.apoderado.direccion,
            });
        }
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateApoderadoPayload = {
            dni: this.form.value.dni,
            apellidoPaterno: this.form.value.apellidoPaterno,
            apellidoMaterno: this.form.value.apellidoMaterno,
            nombres: this.form.value.nombres,
            celular: this.form.value.celular || null,
            correoElectronico: this.form.value.correoElectronico || null,
            direccion: this.form.value.direccion || null,
        };

        this.isSaving = true;

        const request$ = this.apoderado?.id
            ? this.apoderadoService.updateApoderado(this.apoderado.id, payload)
            : this.apoderadoService.createApoderado(payload);

        request$
            .pipe(finalize(() => (this.isSaving = false)))
            .subscribe({
                next: (apoderado) => {
                    if (this.apoderado?.id) {
                        this.snackBar.open('Apoderado actualizado correctamente.', 'Cerrar', {
                            duration: 4000,
                        });
                    } else {
                        this.snackBar.open('Apoderado registrado correctamente.', 'Cerrar', {
                            duration: 4000,
                        });
                    }
                    this.dialogRef.close({ apoderado });
                },
                error: (error) =>
                    this.snackBar.open(error.message ?? 'Ocurrió un error al guardar el apoderado.', 'Cerrar', {
                        duration: 5000,
                    }),
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }
}
