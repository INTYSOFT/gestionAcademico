import { AsyncPipe, NgIf } from '@angular/common';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    Carrera,
    CreateCarreraPayload,
} from 'app/core/models/centro-estudios/carrera.model';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';

export interface CarreraFormDialogData {
    carrera: Carrera | null;
}

export type CarreraFormDialogResult =
    | { action: 'created'; carrera: Carrera }
    | { action: 'updated'; carrera: Carrera };

@Component({
    selector: 'app-carrera-form-dialog',
    standalone: true,
    templateUrl: './carrera-form-dialog.component.html',
    styleUrls: ['./carrera-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgIf,
        AsyncPipe,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatProgressBarModule,
    ],
})
export class CarreraFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: CarreraFormDialogData,
        private readonly dialogRef: MatDialogRef<
            CarreraFormDialogComponent,
            CarreraFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly carrerasService: CarrerasService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            activo: [true],
        });

        if (data.carrera) {
            this.patchForm(data.carrera);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const carrera = this.data.carrera ?? null;
        this.isSaving$.next(true);

        const request$ = carrera
            ? this.carrerasService.updateCarrera(carrera.id, payload)
            : this.carrerasService.createCarrera(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = carrera ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Carrera registrada correctamente.'
                            : 'Carrera actualizada correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, carrera: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar la carrera.',
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

    private patchForm(carrera: Carrera): void {
        this.form.patchValue({
            nombre: carrera.nombre,
            activo: carrera.activo,
        });
    }

    private buildPayload(): CreateCarreraPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();

        const payload: CreateCarreraPayload = {
            nombre,
            activo: !!raw.activo,
        };

        return payload;
    }
}
