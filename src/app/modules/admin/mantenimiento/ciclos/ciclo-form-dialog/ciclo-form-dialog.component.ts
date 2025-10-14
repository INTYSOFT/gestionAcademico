import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, Observable, Subject, finalize, takeUntil } from 'rxjs';
import {
    Ciclo,
    CreateCicloPayload,
    UpdateCicloPayload,
} from 'app/core/models/centro-estudios/ciclo.model';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';

export interface CicloFormDialogData {
    ciclo?: Ciclo;
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
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        MatSnackBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressBarModule,
    ],
    providers: [DatePipe],
})
export class CicloFormDialogComponent implements OnInit, OnDestroy {
    private readonly validateDates = (
        control: AbstractControl
    ): ValidationErrors | null => {
        const group = control as FormGroup;
        const fechaInicio = group.get('fechaInicio')?.value;
        const fechaFin = group.get('fechaFin')?.value;
        const fechaApertura = group.get('fechaAperturaInscripcion')?.value;
        const fechaCierre = group.get('fechaCierreInscripcion')?.value;

        const errors: ValidationErrors = {};

        if (fechaInicio && fechaFin) {
            const inicioDate =
                fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio);
            const finDate = fechaFin instanceof Date ? fechaFin : new Date(fechaFin);

            if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
                errors['invalidDate'] = true;
            } else if (finDate < inicioDate) {
                errors['endBeforeStart'] = true;
            }
        }

        if (fechaApertura && fechaCierre) {
            const aperturaDate =
                fechaApertura instanceof Date ? fechaApertura : new Date(fechaApertura);
            const cierreDate =
                fechaCierre instanceof Date ? fechaCierre : new Date(fechaCierre);

            if (Number.isNaN(aperturaDate.getTime()) || Number.isNaN(cierreDate.getTime())) {
                errors['invalidInscriptionDate'] = true;
            } else if (cierreDate < aperturaDate) {
                errors['inscriptionEndBeforeStart'] = true;
            }
        }

        return Object.keys(errors).length > 0 ? errors : null;
    };

    protected readonly form: FormGroup = this.fb.group(
        {
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            fechaInicio: [null, [Validators.required]],
            fechaAperturaInscripcion: [null, [Validators.required]],
            fechaCierreInscripcion: [null, [Validators.required]],
            fechaFin: [null, [Validators.required]],
            capacidadTotal: [null, [Validators.min(0)]],
            activo: [true],
        },
        { validators: this.validateDates }
    );

    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: CicloFormDialogData,
        private readonly dialogRef: MatDialogRef<CicloFormDialogComponent, CicloFormDialogResult>,
        private readonly fb: FormBuilder,
        private readonly ciclosService: CiclosService,
        private readonly snackBar: MatSnackBar,
        private readonly datePipe: DatePipe
    ) {}

    ngOnInit(): void {
        if (this.data.ciclo) {
            this.patchForm(this.data.ciclo);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const ciclo = this.data.ciclo;

        this.isSaving$.next(true);

        const request$: Observable<Ciclo> = ciclo
            ? this.ciclosService.updateCiclo(ciclo.id, payload as UpdateCicloPayload)
            : this.ciclosService.createCiclo(payload as CreateCicloPayload);

        request$
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (response) => {
                    const result: CicloFormDialogResult = ciclo
                        ? { action: 'updated', ciclo: response }
                        : { action: 'created', ciclo: response };

                    this.dialogRef.close(result);
                },
                error: () => {
                    this.snackBar.open(
                        'Ocurrió un error al guardar el ciclo. Por favor, inténtalo nuevamente.',
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

    protected getDateError(): string | null {
        const errors = this.form.errors;
        if (!errors) {
            return null;
        }

        if (errors['invalidDate']) {
            return 'Las fechas seleccionadas no son válidas.';
        }

        if (errors['endBeforeStart']) {
            return 'La fecha fin debe ser posterior o igual a la fecha de inicio.';
        }

        if (errors['invalidInscriptionDate']) {
            return 'Las fechas de inscripción seleccionadas no son válidas.';
        }

        if (errors['inscriptionEndBeforeStart']) {
            return 'La fecha de cierre de inscripción debe ser posterior o igual a la fecha de apertura.';
        }

        return null;
    }

    private patchForm(ciclo: Ciclo): void {
        const fechaInicio = ciclo.fechaInicio ? new Date(ciclo.fechaInicio) : null;
        const fechaApertura = ciclo.fechaAperturaInscripcion
            ? new Date(ciclo.fechaAperturaInscripcion)
            : null;
        const fechaCierre = ciclo.fechaCierreInscripcion
            ? new Date(ciclo.fechaCierreInscripcion)
            : null;
        const fechaFin = ciclo.fechaFin ? new Date(ciclo.fechaFin) : null;

        this.form.patchValue({
            nombre: ciclo.nombre,
            fechaInicio,
            fechaAperturaInscripcion: fechaApertura,
            fechaCierreInscripcion: fechaCierre,
            fechaFin,
            capacidadTotal: ciclo.capacidadTotal ?? null,
            activo: ciclo.activo,
        });
    }

    private buildPayload(): CreateCicloPayload | UpdateCicloPayload {
        const raw = this.form.value as {
            nombre: string;
            fechaInicio: Date | string;
            fechaAperturaInscripcion: Date | string;
            fechaCierreInscripcion: Date | string;
            fechaFin: Date | string;
            capacidadTotal: number | null;
            activo: boolean;
        };

        const formatDate = (value: Date | string): string =>
            this.datePipe.transform(value, 'yyyy-MM-dd') ?? '';

        const capacidadTotal =
            raw.capacidadTotal === null || raw.capacidadTotal === undefined
                ? null
                : Number(raw.capacidadTotal);

        return {
            nombre: raw.nombre.trim(),
            fechaInicio: formatDate(raw.fechaInicio),
            fechaAperturaInscripcion: formatDate(raw.fechaAperturaInscripcion),
            fechaCierreInscripcion: formatDate(raw.fechaCierreInscripcion),
            fechaFin: formatDate(raw.fechaFin),
            capacidadTotal,
            activo: raw.activo,
        };
    }
}
