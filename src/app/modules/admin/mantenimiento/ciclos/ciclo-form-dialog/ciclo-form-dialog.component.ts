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
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Ciclo, CreateCicloPayload } from 'app/core/models/centro-estudios/ciclo.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';

export interface CicloFormDialogData {
    ciclo?: Ciclo | null;
    existingCiclos: Ciclo[];
}

export type CicloFormDialogResult =
    | { action: 'created'; ciclo: Ciclo }
    | { action: 'updated'; ciclo: Ciclo };

@Component({
    selector: 'app-ciclo-form-dialog',
    standalone: true,
    templateUrl: './ciclo-form-dialog.component.html',
    styleUrls: ['./ciclo-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSnackBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSlideToggleModule,
        MatProgressBarModule,
    ],
    providers: [DatePipe],
})
export class CicloFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    private readonly dateRangeValidator: ValidatorFn = (
        group: FormGroup
    ): ValidationErrors | null => {
        const start = group.get('fechaInicio')?.value;
        const end = group.get('fechaFin')?.value;

        if (!start || !end) {
            return null;
        }

        const startDate = start instanceof Date ? start : new Date(start);
        const endDate = end instanceof Date ? end : new Date(end);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return null;
        }

        if (startDate > endDate) {
            return { invalidDateRange: true };
        }

    };

    private readonly duplicatePeriodValidator: ValidatorFn = (
        group: FormGroup
    ): ValidationErrors | null => {
        const start = group.get('fechaInicio')?.value;
        const end = group.get('fechaFin')?.value;

        const normalizedStart = this.normalizeDateValue(start);
        const normalizedEnd = this.normalizeDateValue(end);

        if (!normalizedStart || !normalizedEnd) {
            return null;
        }

        const currentId = this.data.ciclo?.id ?? null;
        const existing = this.data.existingCiclos ?? [];
        const hasDuplicate = existing.some((item) => {
            if (currentId !== null && item.id === currentId) {
                return false;
            }

            const itemStart = this.normalizeDateValue(item.fechaInicio);
            const itemEnd = this.normalizeDateValue(item.fechaFin);

            return itemStart === normalizedStart && itemEnd === normalizedEnd;
        });

        return hasDuplicate ? { duplicatePeriod: true } : null;
    };

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: CicloFormDialogData,
        private readonly dialogRef: MatDialogRef<
            CicloFormDialogComponent,
            CicloFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly ciclosService: CiclosService,
        private readonly datePipe: DatePipe
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            fechaInicio: [null, [Validators.required]],
            fechaFin: [null, [Validators.required]],
            capacidadTotal: [null, [Validators.min(0)]],
            activo: [true],
        });


        this.form.setValidators([this.dateRangeValidator]);

        this.form.setValidators([
            this.dateRangeValidator,
            this.duplicatePeriodValidator,
        ]);

        this.form.updateValueAndValidity({ emitEvent: false });

        if (data.ciclo) {
            this.patchForm(data.ciclo);
        }
    }

    protected save(): void {
        this.form.updateValueAndValidity();
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const ciclo = this.data.ciclo ?? null;
        this.isSaving$.next(true);

        const request$ = ciclo
            ? this.ciclosService.updateCiclo(ciclo.id, payload)
            : this.ciclosService.createCiclo(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = ciclo ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Ciclo registrado correctamente.'
                            : 'Ciclo actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, ciclo: result } as CicloFormDialogResult);
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el ciclo.',
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

    private patchForm(ciclo: Ciclo): void {
        const fechaInicio = this.toDateValue(ciclo.fechaInicio);
        const fechaFin = this.toDateValue(ciclo.fechaFin);

        this.form.patchValue({
            nombre: ciclo.nombre,
            fechaInicio,
            fechaFin,
            capacidadTotal: ciclo.capacidadTotal ?? null,
            activo: ciclo.activo,
        });
    }

    private buildPayload(): CreateCicloPayload {
        const raw = this.form.value;
        const fechaInicio = this.formatDateValue(raw.fechaInicio);
        const fechaFin = this.formatDateValue(raw.fechaFin);

        const capacidadTotalRaw = raw.capacidadTotal;
        const capacidadTotal =
            capacidadTotalRaw === null || capacidadTotalRaw === undefined || capacidadTotalRaw === ''
                ? null
                : Number(capacidadTotalRaw);

        const payload: CreateCicloPayload = {
            nombre: String(raw.nombre ?? '').trim(),
            fechaInicio: fechaInicio ?? '',
            fechaFin: fechaFin ?? '',
            capacidadTotal,
            activo: !!raw.activo,
        };

        return payload;
    }


    private normalizeDateValue(value: unknown): string | null {
        return this.formatDateValue(value);
    }

    private toDateValue(value: unknown): Date | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) {
                return null;
            }

            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                return null;
            }

            const hyphenParts = trimmed.split('-');
            if (hyphenParts.length === 3) {
                const [yearRaw, monthRaw, dayRaw] = hyphenParts;
                const year = Number(yearRaw);
                const month = Number(monthRaw);
                const day = Number(dayRaw);

                if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                    const date = new Date(year, month - 1, day);
                    if (!Number.isNaN(date.getTime())) {
                        return date;
                    }
                }
            }

            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            }
        }

        return null;
    }

    private formatDateValue(value: unknown): string | null {
        const date = this.toDateValue(value);

        if (!date) {
            return null;
        }

        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        return this.datePipe.transform(utcDate, 'yyyy-MM-dd', 'UTC');
    }

}
