import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import {
    SeccionCiclo,
    UpdateSeccionCicloPayload,
} from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';

export interface EditSeccionDialogData {
    cicloId: number;
    sedeId: number;
    seccionCiclo: SeccionCiclo;
    niveles: Nivel[];
    secciones: Seccion[];
    existingSeccionCiclos: SeccionCiclo[];
}

export interface EditSeccionDialogResult {
    action: 'updated';
    seccionCiclo: SeccionCiclo;
}

@Component({
    selector: 'app-edit-seccion-dialog',
    standalone: true,
    templateUrl: './edit-seccion-dialog.component.html',
    styleUrls: ['./edit-seccion-dialog.component.scss'],
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
        MatProgressBarModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSnackBarModule,
    ],
})
export class EditSeccionDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;
    protected readonly availableSecciones: Seccion[];
    protected readonly niveles: Nivel[];

    private readonly otherSeccionIds = new Set(
        this.data.existingSeccionCiclos
            .filter(
                (item) =>
                    item.id !== this.data.seccionCiclo.id && item.sedeId === this.data.sedeId
            )
            .map((item) => item.seccionId)
    );

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: EditSeccionDialogData,
        private readonly dialogRef: MatDialogRef<EditSeccionDialogComponent, EditSeccionDialogResult>,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly seccionCicloService: SeccionCicloService
    ) {
        this.availableSecciones = this.computeAvailableSecciones();
        this.niveles = this.computeAvailableNiveles();

        const seccionId = this.availableSecciones.find(
            (seccion) => seccion.id === data.seccionCiclo.seccionId
        )?.id ?? this.availableSecciones[0]?.id ?? null;
        const nivelId = this.niveles.find((nivel) => nivel.id === data.seccionCiclo.nivelId)?.id ??
            this.niveles[0]?.id ??
            null;

        this.form = this.fb.group({
            seccionId: [seccionId, [Validators.required]],
            nivelId: [nivelId, [Validators.required]],
            capacidad: [data.seccionCiclo.capacidad ?? 0, [Validators.required, Validators.min(0)]],
            activo: [data.seccionCiclo.activo],
        });

        const seccionControl = this.form.get('seccionId');
        seccionControl?.valueChanges.subscribe(() => {
            const control = this.form.get('seccionId');
            const errors = control?.errors;

            if (control && errors?.duplicate) {
                const rest = { ...errors };
                delete rest.duplicate;
                control.setErrors(Object.keys(rest).length ? rest : null);
            }
        });
    }

    protected save(): void {
        if (!this.availableSecciones.length || !this.niveles.length) {
            this.snackBar.open(
                'No hay secciones o niveles disponibles para actualizar.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const seccionId = Number(raw.seccionId ?? 0);
        const nivelId = Number(raw.nivelId ?? 0);
        const capacidadValue = Number(raw.capacidad ?? 0);
        const capacidad = Number.isFinite(capacidadValue) ? capacidadValue : 0;

        if (this.otherSeccionIds.has(seccionId)) {
            const seccionControl = this.form.get('seccionId');
            const currentErrors = seccionControl?.errors ?? {};
            seccionControl?.setErrors({ ...currentErrors, duplicate: true });
            seccionControl?.markAsTouched();
            this.snackBar.open(
                'La sección seleccionada ya está asignada a este ciclo.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        const payload: UpdateSeccionCicloPayload = {
            cicloId: this.data.cicloId,
            seccionId,
            nivelId,
            sedeId: this.data.sedeId,
            capacidad,
            activo: !!raw.activo,
        };

        this.isSaving$.next(true);
        this.seccionCicloService
            .update(this.data.seccionCiclo.id, payload)
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (seccionCiclo) => {
                    this.snackBar.open('Sección actualizada correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.dialogRef.close({ action: 'updated', seccionCiclo });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al actualizar la sección.',
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

    protected hasAvailableSecciones(): boolean {
        return this.availableSecciones.length > 0;
    }

    protected hasAvailableNiveles(): boolean {
        return this.niveles.length > 0;
    }

    private computeAvailableSecciones(): Seccion[] {
        const currentSeccionId = this.data.seccionCiclo.seccionId;

        return this.data.secciones
            .filter((seccion) => seccion.activo || seccion.id === currentSeccionId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    private computeAvailableNiveles(): Nivel[] {
        const currentNivelId = this.data.seccionCiclo.nivelId;

        return this.data.niveles
            .filter((nivel) => nivel.activo || nivel.id === currentNivelId)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
}
