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
    AlumnoPersonalDataPayload,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import {
    AlumnoApoderado,
    AlumnoApoderadoUpsertPayload,
} from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { AlumnoService } from 'app/core/services/centro-estudios/alumno.service';

interface AlumnoFormDialogData {
    alumno?: Alumno;
}

interface ApoderadoFormValue {
    id: number | null;
    apoderadoId: number | null;
    documento: string;
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
    readonly data: AlumnoFormDialogData;

    get apoderados(): FormArray<FormGroup> {
        return this.form.get('apoderados') as FormArray<FormGroup>;
    }

    constructor(
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly alumnoService: AlumnoService,
        private readonly dialogRef: MatDialogRef<AlumnoFormDialogComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) data: AlumnoFormDialogData | null
    ) {
        this.data = data ?? {};
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
                next: () => {
                    this.snackBar.open(
                        this.data.alumno
                            ? 'Alumno actualizado correctamente.'
                            : 'Alumno registrado correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                    this.dialogRef.close(true);
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
            documento: [apoderado?.apoderado?.documento ?? '', [Validators.required, Validators.maxLength(15)]],
            apellidos: [apoderado?.apoderado?.apellidos ?? '', [Validators.maxLength(150)]],
            nombres: [apoderado?.apoderado?.nombres ?? '', [Validators.maxLength(150)]],
            celular: [apoderado?.apoderado?.celular ?? '', [Validators.maxLength(15)]],
            correo: [apoderado?.apoderado?.correo ?? '', [Validators.email, Validators.maxLength(150)]],
            activo: [apoderado?.activo ?? true],
        });
    }

    private buildPayload(): CreateAlumnoPayload | UpdateAlumnoPayload {
        const formValue = this.form.getRawValue();

        const fechaNacimiento = this.toDateOnlyString(formValue.fechaNacimiento);
        const carreraActualId = formValue.carreraActualId ? Number(formValue.carreraActualId) : null;

        const alumnoPayload: AlumnoPersonalDataPayload = {
            dni: formValue.dni,
            apellidos: formValue.apellidos ?? null,
            nombres: formValue.nombres ?? null,
            fechaNacimiento,
            celular: formValue.celular ?? null,
            correo: formValue.correo ?? null,
            ubigeoCode: formValue.ubigeoCode ?? null,
            colegioOrigen: formValue.colegioOrigen ?? null,
            carreraActualId,
            fotoUrl: formValue.fotoUrl ?? null,
            activo: formValue.activo,
        };

        const apoderados = this.buildApoderadosPayload();

        return {
            ...alumnoPayload,
            fechaNacimiento,
            carreraActualId,
            apoderados,
            alumno: alumnoPayload,
        };
    }

    private buildApoderadosPayload(): AlumnoApoderadoUpsertPayload[] {
        return this.apoderados.controls
            .map((group) => group.getRawValue() as ApoderadoFormValue)
            .filter((value) => value.documento?.trim())
            .map((value) => {
                const documento = value.documento.trim();

                return {
                    id: value.id ?? undefined,
                    apoderadoId: value.apoderadoId ?? undefined,
                    activo: value.activo,
                    apoderado: {
                        id: value.apoderadoId ?? undefined,
                        documento,
                        apellidos: this.toNullableString(value.apellidos),
                        nombres: this.toNullableString(value.nombres),
                        celular: this.toNullableString(value.celular),
                        correo: this.toNullableString(value.correo),
                        activo: value.activo,
                    },
                };
            });
    }

    private toNullableString(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        const trimmedValue = value.trim();

        return trimmedValue ? trimmedValue : null;
    }

    private toDateOnlyString(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (value instanceof Date) {
            return this.formatDateOnly(value);
        }

        if (typeof value === 'string') {
            const trimmedValue = value.trim();

            if (!trimmedValue) {
                return null;
            }

            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
                return trimmedValue;
            }

            const parsedDate = new Date(trimmedValue);

            if (!Number.isNaN(parsedDate.getTime())) {
                return this.formatDateOnly(parsedDate);
            }

            return trimmedValue;
        }

        if (typeof value === 'number') {
            const parsedDate = new Date(value);

            if (!Number.isNaN(parsedDate.getTime())) {
                return this.formatDateOnly(parsedDate);
            }

            return null;
        }

        if (typeof value === 'object' && value) {
            const maybeDateObject = value as {
                toDate?: () => Date;
                seconds?: number;
                nanoseconds?: number;
                year?: number;
                month?: number;
                day?: number;
            };

            if (typeof maybeDateObject.toDate === 'function') {
                const parsedDate = maybeDateObject.toDate();

                if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
                    return this.formatDateOnly(parsedDate);
                }
            }

            if (
                typeof maybeDateObject.year === 'number' &&
                typeof maybeDateObject.month === 'number' &&
                typeof maybeDateObject.day === 'number'
            ) {
                const parsedDate = new Date(
                    maybeDateObject.year,
                    // Month is zero-based in JavaScript Date
                    maybeDateObject.month - 1,
                    maybeDateObject.day
                );

                if (!Number.isNaN(parsedDate.getTime())) {
                    return this.formatDateOnly(parsedDate);
                }
            }

            if (typeof maybeDateObject.seconds === 'number') {
                const milliseconds = maybeDateObject.seconds * 1000 + (maybeDateObject.nanoseconds ?? 0) / 1_000_000;
                const parsedDate = new Date(milliseconds);

                if (!Number.isNaN(parsedDate.getTime())) {
                    return this.formatDateOnly(parsedDate);
                }
            }
        }

        return null;
    }

    private formatDateOnly(value: Date): string {
        const year = value.getFullYear();
        const month = `${value.getMonth() + 1}`.padStart(2, '0');
        const day = `${value.getDate()}`.padStart(2, '0');

        return `${year}-${month}-${day}`;
    }
}
