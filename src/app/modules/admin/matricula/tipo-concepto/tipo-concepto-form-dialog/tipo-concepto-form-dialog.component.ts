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
    ConceptoTipo,
    CreateConceptoTipoPayload,
} from 'app/core/models/centro-estudios/concepto-tipo.model';
import { ConceptoTiposService } from 'app/core/services/centro-estudios/concepto-tipos.service';

export interface TipoConceptoFormDialogData {
    conceptoTipo: ConceptoTipo | null;
}

export type TipoConceptoFormDialogResult =
    | { action: 'created'; conceptoTipo: ConceptoTipo }
    | { action: 'updated'; conceptoTipo: ConceptoTipo };

@Component({
    selector: 'app-tipo-concepto-form-dialog',
    standalone: true,
    templateUrl: './tipo-concepto-form-dialog.component.html',
    styleUrls: ['./tipo-concepto-form-dialog.component.scss'],
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
export class TipoConceptoFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: TipoConceptoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            TipoConceptoFormDialogComponent,
            TipoConceptoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly conceptoTiposService: ConceptoTiposService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            descripcion: ['', [Validators.maxLength(300)]],
            activo: [true],
        });

        if (data.conceptoTipo) {
            this.patchForm(data.conceptoTipo);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const conceptoTipo = this.data.conceptoTipo ?? null;
        this.isSaving$.next(true);

        const request$ = conceptoTipo
            ? this.conceptoTiposService.updateConceptoTipo(conceptoTipo.id, payload)
            : this.conceptoTiposService.createConceptoTipo(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = conceptoTipo ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Tipo de concepto registrado correctamente.'
                            : 'Tipo de concepto actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, conceptoTipo: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el tipo de concepto.',
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

    private patchForm(conceptoTipo: ConceptoTipo): void {
        this.form.patchValue({
            nombre: conceptoTipo.nombre,
            descripcion: conceptoTipo.descripcion ?? '',
            activo: conceptoTipo.activo,
        });
    }

    private buildPayload(): CreateConceptoTipoPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const descripcion = String(raw.descripcion ?? '').trim();

        const payload: CreateConceptoTipoPayload = {
            nombre,
            descripcion: descripcion ? descripcion : null,
            activo: !!raw.activo,
        };

        return payload;
    }
}
