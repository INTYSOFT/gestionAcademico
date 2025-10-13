import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { Docente, CreateDocentePayload } from 'app/core/models/centro-estudios/docente.model';
import { Especialidad } from 'app/core/models/centro-estudios/especialidad.model';
import { DocentesService } from 'app/core/services/centro-estudios/docentes.service';

export interface DocenteFormDialogData {
    docente: Docente | null;
    especialidades: Especialidad[];
}

export type DocenteFormDialogResult =
    | { action: 'created'; docente: Docente }
    | { action: 'updated'; docente: Docente };

@Component({
    selector: 'app-docente-form-dialog',
    standalone: true,
    templateUrl: './docente-form-dialog.component.html',
    styleUrls: ['./docente-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatProgressBarModule,
    ],
})
export class DocenteFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: DocenteFormDialogData,
        private readonly dialogRef: MatDialogRef<
            DocenteFormDialogComponent,
            DocenteFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly docentesService: DocentesService
    ) {
        this.form = this.fb.group({
            dni: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.maxLength(12),
                    Validators.pattern(/^\d+$/),
                ],
            ],
            apellidos: ['', [Validators.required, Validators.maxLength(150)]],
            nombres: ['', [Validators.required, Validators.maxLength(150)]],
            celular: [null, [Validators.pattern(/^[0-9]{9,15}$/)]],
            correo: [null, [Validators.email, Validators.maxLength(150)]],
            especialidadId: [null],
            activo: [true],
        });

        if (data.docente) {
            this.patchForm(data.docente);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const docente = this.data.docente ?? null;
        this.isSaving$.next(true);

        const request$ = docente
            ? this.docentesService.updateDocente(docente.id, payload)
            : this.docentesService.createDocente(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = docente ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Docente registrado correctamente.'
                            : 'Docente actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, docente: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el docente.',
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

    protected trackByEspecialidad(index: number, item: Especialidad): number {
        return item.id;
    }

    private patchForm(docente: Docente): void {
        this.form.patchValue({
            dni: docente.dni,
            apellidos: docente.apellidos ?? '',
            nombres: docente.nombres ?? '',
            celular: docente.celular ?? null,
            correo: docente.correo ?? null,
            especialidadId: docente.especialidadId ?? null,
            activo: docente.activo,
        });
    }

    private buildPayload(): CreateDocentePayload {
        const raw = this.form.value;
        const dni = String(raw.dni ?? '').trim();
        const apellidos = String(raw.apellidos ?? '').trim();
        const nombres = String(raw.nombres ?? '').trim();

        const celularRaw = raw.celular;
        const celular =
            celularRaw === null || celularRaw === undefined
                ? null
                : String(celularRaw).trim();

        const correoRaw = raw.correo;
        const correo =
            correoRaw === null || correoRaw === undefined
                ? null
                : String(correoRaw).trim();

        const especialidadIdRaw = raw.especialidadId;
        const especialidadId =
            especialidadIdRaw === null || especialidadIdRaw === undefined || especialidadIdRaw === ''
                ? null
                : Number(especialidadIdRaw);

        const payload: CreateDocentePayload = {
            dni,
            apellidos: apellidos.length > 0 ? apellidos : null,
            nombres: nombres.length > 0 ? nombres : null,
            celular: celular && celular.length > 0 ? celular : null,
            correo: correo && correo.length > 0 ? correo : null,
            especialidadId: Number.isFinite(especialidadId ?? NaN)
                ? (especialidadId as number)
                : null,
            activo: !!raw.activo,
        };

        return payload;
    }
}
