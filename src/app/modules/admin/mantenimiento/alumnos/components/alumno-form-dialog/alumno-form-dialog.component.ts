import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    Alumno,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import { AlumnoApoderado } from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { AlumnoService } from 'app/core/services/centro-estudios/alumno.service';

interface AlumnoFormDialogData {
    alumno?: Alumno;
}

interface ApoderadoFormValue {
    id: number | null;
    apoderadoId: number | null;
    dni: string;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    activo: boolean;
}

@Component({
    selector: 'app-alumno-form-dialog',
    standalone: true,
    imports: [
        AsyncPipe,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatDividerModule,
        MatTooltipModule,
        MatProgressBarModule,
    ],
    templateUrl: './alumno-form-dialog.component.html',
    styleUrl: './alumno-form-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlumnoFormDialogComponent implements OnInit {
    readonly isSaving$ = new BehaviorSubject<boolean>(false);
    readonly form: FormGroup;

    get apoderados(): FormArray<FormGroup> {
        return this.form.get('apoderados') as FormArray<FormGroup>;
    }

    constructor(
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly alumnoService: AlumnoService,
        private readonly dialogRef: MatDialogRef<AlumnoFormDialogComponent, Alumno>,
        @Inject(MAT_DIALOG_DATA) readonly data: AlumnoFormDialogData
    ) {
        this.form = this.fb.group({
            dni: ['', [Validators.required, Validators.maxLength(12)]],
            apellidos: ['', [Validators.maxLength(150)]],
            nombres: ['', [Validators.maxLength(150)]],
            fechaNacimiento: [null],
            celular: ['', [Validators.maxLength(15)]],
            correo: ['', [Validators.email, Validators.maxLength(150)]],
            ubigeoCode: ['', [Validators.maxLength(6), Validators.minLength(6)]],
            colegioOrigen: ['', [Validators.maxLength(150)]],
            carreraActualId: [null],
            fotoUrl: ['', [Validators.maxLength(255)]],
            activo: [true],
            apoderados: this.fb.array<FormGroup>([]),
        });
    }

    ngOnInit(): void {
        if (this.data.alumno) {
            this.patchForm(this.data.alumno);
        } else {
            this.addApoderado();
        }
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();

        this.isSaving$.next(true);

        const request$ = this.data.alumno
            ? this.alumnoService.updateAlumno(this.data.alumno.id, payload as UpdateAlumnoPayload)
            : this.alumnoService.createAlumno(payload as CreateAlumnoPayload);

        request$
            .pipe(
                finalize(() => this.isSaving$.next(false))
            )
            .subscribe({
                next: (alumno) => {
                    this.snackBar.open(
                        this.data.alumno
                            ? 'Alumno actualizado correctamente.'
                            : 'Alumno registrado correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                    this.dialogRef.close(alumno);
                },
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al guardar la información.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    cancel(): void {
        this.dialogRef.close();
    }

    addApoderado(apoderado?: AlumnoApoderado): void {
        this.apoderados.push(this.createApoderadoFormGroup(apoderado));
    }

    removeApoderado(index: number): void {
        if (this.apoderados.length > 1) {
            this.apoderados.removeAt(index);
        }
    }

    trackByApoderado(index: number): number {
        return index;
    }

    private patchForm(alumno: Alumno): void {
        this.form.patchValue({
            dni: alumno.dni,
            apellidos: alumno.apellidos ?? '',
            nombres: alumno.nombres ?? '',
            fechaNacimiento: alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento) : null,
            celular: alumno.celular ?? '',
            correo: alumno.correo ?? '',
            ubigeoCode: alumno.ubigeoCode ?? '',
            colegioOrigen: alumno.colegioOrigen ?? '',
            carreraActualId: alumno.carreraActualId ?? null,
            fotoUrl: alumno.fotoUrl ?? '',
            activo: alumno.activo,
        });

        if (alumno.alumnoApoderados?.length) {
            alumno.alumnoApoderados.forEach((apoderado) => this.addApoderado(apoderado));
        } else {
            this.addApoderado();
        }
    }

    private createApoderadoFormGroup(apoderado?: AlumnoApoderado): FormGroup {
        return this.fb.group({
            id: [apoderado?.id ?? null],
            apoderadoId: [apoderado?.apoderado?.id ?? apoderado?.apoderadoId ?? null],
            dni: [apoderado?.apoderado?.dni ?? '', [Validators.required, Validators.maxLength(12)]],
            apellidos: [apoderado?.apoderado?.apellidos ?? '', [Validators.maxLength(150)]],
            nombres: [apoderado?.apoderado?.nombres ?? '', [Validators.maxLength(150)]],
            celular: [apoderado?.apoderado?.celular ?? '', [Validators.maxLength(15)]],
            correo: [apoderado?.apoderado?.correo ?? '', [Validators.email, Validators.maxLength(150)]],
            activo: [apoderado?.activo ?? true],
        });
    }

    private buildPayload(): CreateAlumnoPayload | UpdateAlumnoPayload {
        const formValue = this.form.getRawValue();

        const apoderados = (this.apoderados.value as ApoderadoFormValue[]).map((value) => ({
            id: value.id ?? undefined,
            apoderadoId: value.apoderadoId ?? undefined,
            activo: value.activo,
            apoderado: {
                id: value.apoderadoId ?? undefined,
                dni: value.dni,
                apellidos: value.apellidos ?? null,
                nombres: value.nombres ?? null,
                celular: value.celular ?? null,
                correo: value.correo ?? null,
                activo: value.activo,
            },
        }));

        return {
            dni: formValue.dni,
            apellidos: formValue.apellidos ?? null,
            nombres: formValue.nombres ?? null,
            fechaNacimiento: this.toDateOnlyString(formValue.fechaNacimiento),
            celular: formValue.celular ?? null,
            correo: formValue.correo ?? null,
            ubigeoCode: formValue.ubigeoCode ?? null,
            colegioOrigen: formValue.colegioOrigen ?? null,
            carreraActualId: formValue.carreraActualId ? Number(formValue.carreraActualId) : null,
            fotoUrl: formValue.fotoUrl ?? null,
            activo: formValue.activo,
            apoderados,
        };
    }

    private toDateOnlyString(value: Date | string | null): string | null {
        if (!value) {
            return null;
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
