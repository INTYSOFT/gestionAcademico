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
import {
    Concepto,
    CreateConceptoPayload,
} from 'app/core/models/centro-estudios/concepto.model';
import { ConceptoTipo } from 'app/core/models/centro-estudios/concepto-tipo.model';
import { ConceptosService } from 'app/core/services/centro-estudios/conceptos.service';

export interface ConceptoFormDialogData {
    concepto: Concepto | null;
    conceptoTipos: ConceptoTipo[];
}

export type ConceptoFormDialogResult =
    | { action: 'created'; concepto: Concepto }
    | { action: 'updated'; concepto: Concepto };

@Component({
    selector: 'app-concepto-form-dialog',
    standalone: true,
    templateUrl: './concepto-form-dialog.component.html',
    styleUrls: ['./concepto-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgIf,
        NgFor,
        AsyncPipe,
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
export class ConceptoFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;
    protected readonly conceptoTipos: ConceptoTipo[];
    protected readonly trackByConceptoTipo = (_: number, item: ConceptoTipo): number => item.id;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: ConceptoFormDialogData,
        private readonly dialogRef: MatDialogRef<ConceptoFormDialogComponent, ConceptoFormDialogResult>,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly conceptosService: ConceptosService
    ) {
        this.conceptoTipos = [...data.conceptoTipos].sort((a, b) => a.nombre.localeCompare(b.nombre));

        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            precio: [
                '',
                [
                    Validators.required,
                    Validators.pattern(/^(\d{1,10})(\.\d{1,2})?$/),
                    Validators.min(0),
                    Validators.max(9999999999.99),
                ],
            ],
            impuesto: [
                '',
                [
                    Validators.pattern(/^(\d{1,3})(\.\d{1,2})?$/),
                    Validators.min(0),
                    Validators.max(100),
                ],
            ],
            activo: [true],
            conceptoTipoId: [null],
        });

        if (data.concepto) {
            this.patchForm(data.concepto);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        let payload: CreateConceptoPayload;

        try {
            payload = this.buildPayload();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Verifique los datos ingresados antes de continuar.';

            this.snackBar.open(message, 'Cerrar', { duration: 4000 });
            return;
        }

        const concepto = this.data.concepto ?? null;
        this.isSaving$.next(true);

        const request$ = concepto
            ? this.conceptosService.updateConcepto(concepto.id, payload)
            : this.conceptosService.createConcepto(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = concepto ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Concepto registrado correctamente.'
                            : 'Concepto actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, concepto: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el concepto.',
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

    private patchForm(concepto: Concepto): void {
        this.form.patchValue({
            nombre: concepto.nombre,
            precio: concepto.precio.toFixed(2),
            impuesto:
                concepto.impuesto !== null && concepto.impuesto !== undefined
                    ? concepto.impuesto.toFixed(2)
                    : '',
            activo: concepto.activo,
            conceptoTipoId: concepto.conceptoTipoId ?? null,
        });
    }

    private buildPayload(): CreateConceptoPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const precio = this.parseDecimal(raw.precio);
        const impuesto = this.parseDecimal(raw.impuesto);

        if (!nombre) {
            throw new Error('Ingrese un nombre válido.');
        }

        if (precio === null) {
            throw new Error('Ingrese un precio válido.');
        }

        const conceptoTipoId =
            raw.conceptoTipoId === null || raw.conceptoTipoId === undefined || raw.conceptoTipoId === ''
                ? null
                : Number(raw.conceptoTipoId);

        const payload: CreateConceptoPayload = {
            nombre,
            precio,
            activo: !!raw.activo,
            conceptoTipoId: Number.isNaN(conceptoTipoId ?? NaN) ? null : conceptoTipoId,
        };

        if (impuesto !== null) {
            payload.impuesto = impuesto;
        } else {
            payload.impuesto = null;
        }

        return payload;
    }

    private parseDecimal(value: unknown): number | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const normalized = String(value).replace(',', '.').trim();

        if (!normalized) {
            return null;
        }

        const parsed = Number(normalized);

        if (!Number.isFinite(parsed)) {
            return null;
        }

        return Math.round(parsed * 100) / 100;
    }
}
