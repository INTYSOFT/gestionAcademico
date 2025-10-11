import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface AlumnoApoderadoFormDialogData {
    parentesco?: string;
    esTitular?: boolean;
}

export interface AlumnoApoderadoFormDialogResult {
    payload: {
        parentesco: string;
        esTitular: boolean;
    };
}

@Component({
    selector: 'app-alumno-apoderado-form-dialog',
    standalone: true,
    templateUrl: './alumno-apoderado-form-dialog.component.html',
    styleUrl: './alumno-apoderado-form-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, NgIf],
})
export class AlumnoApoderadoFormDialogComponent {
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AlumnoApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            AlumnoApoderadoFormDialogComponent,
            AlumnoApoderadoFormDialogResult
        >,
        private readonly fb: FormBuilder
    ) {
        this.form = this.fb.group({
            parentesco: [data?.parentesco ?? '', [Validators.required, Validators.maxLength(100)]],
            esTitular: [data?.esTitular ?? false],
        });
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.dialogRef.close({
            payload: {
                parentesco: this.form.value.parentesco,
                esTitular: this.form.value.esTitular,
            },
        });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }
}
