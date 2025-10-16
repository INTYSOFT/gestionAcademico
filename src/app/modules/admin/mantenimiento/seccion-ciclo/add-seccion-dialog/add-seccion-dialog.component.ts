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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';
import {
    CreateSeccionCicloPayload,
    SeccionCiclo,
} from 'app/core/models/centro-estudios/seccion-ciclo.model';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';

export interface AddSeccionDialogData {
    cicloId: number;
    sedeId: number;
    niveles: Nivel[];
    secciones: Seccion[];
    existingSeccionCiclos: SeccionCiclo[];
}

export type AddSeccionDialogResult = { action: 'created'; seccionCiclo: SeccionCiclo };

@Component({
    selector: 'app-add-seccion-dialog',
    standalone: true,
    templateUrl: './add-seccion-dialog.component.html',
    styleUrls: ['./add-seccion-dialog.component.scss'],
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
        MatSnackBarModule,
    ],
})
export class AddSeccionDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;
    protected readonly availableSecciones: Seccion[];
    protected readonly niveles: Nivel[];

    private readonly existingSeccionIds = new Set(
        this.data.existingSeccionCiclos
            .filter((item) => item.sedeId === this.data.sedeId)
            .map((item) => item.seccionId)
    );

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: AddSeccionDialogData,
        private readonly dialogRef: MatDialogRef<AddSeccionDialogComponent, AddSeccionDialogResult>,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly seccionCicloService: SeccionCicloService
    ) {
        this.availableSecciones = this.computeAvailableSecciones();
        this.niveles = [...data.niveles];

        this.form = this.fb.group({
            seccionId: [this.availableSecciones[0]?.id ?? null, [Validators.required]],
            nivelId: [this.niveles[0]?.id ?? null, [Validators.required]],
            capacidad: [0, [Validators.required, Validators.min(0)]],
            precio: [0, [Validators.required, Validators.min(0)]],
        });
    }

    protected save(): void {
        if (!this.availableSecciones.length) {
            this.snackBar.open('No hay secciones disponibles para registrar.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const seccionId = Number(this.form.get('seccionId')?.value);
        const nivelId = Number(this.form.get('nivelId')?.value);
        const capacidadControlValue = this.form.get('capacidad')?.value;
        const capacidad =
            typeof capacidadControlValue === 'number'
                ? capacidadControlValue
                : Number(capacidadControlValue ?? 0);
        const precioControlValue = this.form.get('precio')?.value;
        const precio =
            typeof precioControlValue === 'number'
                ? precioControlValue
                : Number(precioControlValue ?? 0);

        if (this.existingSeccionIds.has(seccionId)) {
            this.snackBar.open(
                'La sección seleccionada ya se encuentra registrada en este ciclo.',
                'Cerrar',
                {
                    duration: 5000,
                }
            );
            return;
        }

        const payload: CreateSeccionCicloPayload = {
            cicloId: this.data.cicloId,
            seccionId,
            nivelId,
            sedeId: this.data.sedeId,
            capacidad: Number.isNaN(capacidad) ? 0 : capacidad,
            precio: Number.isNaN(precio) ? 0 : precio,
            activo: true,
        };

        this.isSaving$.next(true);
        this.seccionCicloService
            .create(payload)
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (seccionCiclo) => {
                    this.snackBar.open('Sección registrada correctamente.', 'Cerrar', {
                        duration: 4000,
                    });
                    this.dialogRef.close({ action: 'created', seccionCiclo });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al registrar la sección.',
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

    private computeAvailableSecciones(): Seccion[] {
        return this.data.secciones
            .filter((seccion) => !this.existingSeccionIds.has(seccion.id))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
}
