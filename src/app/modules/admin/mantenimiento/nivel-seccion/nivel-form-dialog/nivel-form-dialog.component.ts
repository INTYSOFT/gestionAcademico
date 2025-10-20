import { AsyncPipe } from '@angular/common';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    CreateNivelPayload,
    Nivel,
} from 'app/core/models/centro-estudios/nivel.model';
import { NivelesService } from 'app/core/services/centro-estudios/niveles.service';

export interface NivelFormDialogData {
    nivel?: Nivel | null;
}

export type NivelFormDialogResult =
    | { action: 'created'; nivel: Nivel }
    | { action: 'updated'; nivel: Nivel };

@Component({
    selector: 'app-nivel-form-dialog',
    standalone: true,
    templateUrl: './nivel-form-dialog.component.html',
    styleUrls: ['./nivel-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatProgressBarModule
],
})
export class NivelFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: NivelFormDialogData,
        private readonly dialogRef: MatDialogRef<
            NivelFormDialogComponent,
            NivelFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly nivelesService: NivelesService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            descripcion: ['', [Validators.maxLength(300)]],
            activo: [true],
        });

        if (data.nivel) {
            this.patchForm(data.nivel);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const nivel = this.data.nivel ?? null;
        this.isSaving$.next(true);

        const request$ = nivel
            ? this.nivelesService.updateNivel(nivel.id, payload)
            : this.nivelesService.createNivel(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = nivel ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Nivel registrado correctamente.'
                            : 'Nivel actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, nivel: result } as NivelFormDialogResult);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el nivel.',
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

    private buildPayload(): CreateNivelPayload {
        const nombre = this.form.get('nombre')?.value ?? '';
        const descripcion = this.form.get('descripcion')?.value ?? '';
        const activo = this.form.get('activo')?.value ?? true;

        return {
            nombre: typeof nombre === 'string' ? nombre.trim() : nombre,
            descripcion:
                typeof descripcion === 'string'
                    ? descripcion.trim() || null
                    : descripcion,
            activo: Boolean(activo),
        };
    }

    private patchForm(nivel: Nivel): void {
        this.form.patchValue({
            nombre: nivel.nombre,
            descripcion: nivel.descripcion ?? '',
            activo: nivel.activo,
        });
    }
}
