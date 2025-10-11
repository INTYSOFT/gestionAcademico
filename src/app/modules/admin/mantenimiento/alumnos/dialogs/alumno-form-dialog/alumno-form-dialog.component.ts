import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { Alumno, CreateAlumnoPayload } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { finalize } from 'rxjs';

export interface AlumnoFormDialogData {
    alumno?: Alumno;
}

export type AlumnoFormDialogResult =
    | { action: 'created'; alumno: Alumno }
    | { action: 'updated'; alumno: Alumno };

@Component({
    selector: 'app-alumno-form-dialog',
    standalone: true,
    templateUrl: './alumno-form-dialog.component.html',
    styleUrl: './alumno-form-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatIconModule,
    ],
})
export class AlumnoFormDialogComponent implements OnInit {
    protected form: FormGroup;
    protected isSaving = false;
    protected readonly alumno?: Alumno;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AlumnoFormDialogData,
        private readonly dialogRef: MatDialogRef<AlumnoFormDialogComponent, AlumnoFormDialogResult>,
        private readonly fb: FormBuilder,
        private readonly alumnosService: AlumnosService,
        private readonly snackBar: MatSnackBar,
        private readonly dateAdapter: DateAdapter<Date>
    ) {
        this.alumno = data?.alumno;
        this.form = this.fb.group({
            dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
            apellidoPaterno: ['', [Validators.required, Validators.maxLength(100)]],
            apellidoMaterno: ['', [Validators.required, Validators.maxLength(100)]],
            nombres: ['', [Validators.required, Validators.maxLength(150)]],
            fechaNacimiento: ['', [Validators.required]],
            celular: ['', [Validators.pattern(/^[0-9]{9}$/)]],
            correoElectronico: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
            direccion: ['', [Validators.maxLength(255)]],
            activo: [true],
        });
    }

    ngOnInit(): void {
        this.dateAdapter.setLocale('es');

        if (this.alumno) {
            this.form.patchValue({
                ...this.alumno,
                fechaNacimiento: this.alumno.fechaNacimiento ? new Date(this.alumno.fechaNacimiento) : '',
            });
        }
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateAlumnoPayload = {
            dni: this.form.value.dni,
            apellidoPaterno: this.form.value.apellidoPaterno,
            apellidoMaterno: this.form.value.apellidoMaterno,
            nombres: this.form.value.nombres,
            fechaNacimiento: this.formatDate(this.form.value.fechaNacimiento),
            celular: this.form.value.celular || null,
            correoElectronico: this.form.value.correoElectronico,
            direccion: this.form.value.direccion || null,
            activo: this.form.value.activo,
        };

        this.isSaving = true;

        if (this.alumno?.id) {
            this.alumnosService
                .updateAlumno(this.alumno.id, payload)
                .pipe(finalize(() => (this.isSaving = false)))
                .subscribe({
                    next: (alumno) => this.dialogRef.close({ action: 'updated', alumno }),
                    error: (error) =>
                        this.snackBar.open(error.message ?? 'Ocurrió un error al actualizar el alumno.', 'Cerrar', {
                            duration: 5000,
                        }),
                });
        } else {
            this.alumnosService
                .createAlumno(payload)
                .pipe(finalize(() => (this.isSaving = false)))
                .subscribe({
                    next: (alumno) => this.dialogRef.close({ action: 'created', alumno }),
                    error: (error) =>
                        this.snackBar.open(error.message ?? 'Ocurrió un error al registrar el alumno.', 'Cerrar', {
                            duration: 5000,
                        }),
                });
        }
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    private formatDate(value: Date | string): string {
        if (!value) {
            return '';
        }

        if (value instanceof Date) {
            const year = value.getFullYear();
            const month = `${value.getMonth() + 1}`.padStart(2, '0');
            const day = `${value.getDate()}`.padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return value;
    }
}
