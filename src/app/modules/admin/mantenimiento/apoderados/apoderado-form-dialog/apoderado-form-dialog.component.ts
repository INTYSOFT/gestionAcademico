import { AsyncPipe, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    Apoderado,
    CreateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import { BehaviorSubject, Subject, finalize, takeUntil } from 'rxjs';

export interface ApoderadoFormDialogData {
    apoderado?: Apoderado;
}

export interface ApoderadoFormDialogResult {
    apoderado: Apoderado;
    action: 'created' | 'updated';
}

@Component({
    selector: 'app-apoderado-form-dialog',
    standalone: true,
    templateUrl: './apoderado-form-dialog.component.html',
    styleUrls: ['./apoderado-form-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        AsyncPipe,
        NgIf,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
    ],
})
export class ApoderadoFormDialogComponent implements OnInit, OnDestroy {
    protected readonly form: FormGroup;
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: ApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            ApoderadoFormDialogComponent,
            ApoderadoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly apoderadosService: ApoderadosService,
        private readonly snackBar: MatSnackBar
    ) {
        this.form = this.fb.group({
            apellidos: [
                '',
                [Validators.required, Validators.maxLength(150)],
            ],
            nombres: [
                '',
                [Validators.required, Validators.maxLength(150)],
            ],
            documento: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.maxLength(15),
                    Validators.pattern(/^\d+$/),
                ],
            ],
            celular: [
                '',
                [Validators.pattern(/^\d{9,15}$/)],
            ],
            correo: [
                '',
                [Validators.email, Validators.maxLength(150)],
            ],
            activo: [true],
        });
    }

    ngOnInit(): void {
        if (this.data.apoderado) {
            this.form.patchValue({
                apellidos: this.data.apoderado.apellidos ?? '',
                nombres: this.data.apoderado.nombres ?? '',
                documento: this.data.apoderado.documento ?? '',
                celular: this.data.apoderado.celular ?? '',
                correo: this.data.apoderado.correo ?? '',
                activo: this.data.apoderado.activo,
            });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected getControl(controlName: string) {
        return this.form.get(controlName)!;
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const {
            apellidos,
            nombres,
            documento,
            celular,
            correo,
            activo,
        } = this.form.getRawValue();

        const payload: CreateApoderadoPayload = {
            apellidos: apellidos.trim(),
            nombres: nombres.trim(),
            documento: documento.trim(),
            celular: celular ? celular.trim() : null,
            correo: correo ? correo.trim() : null,
            activo,
        };

        const apoderado = this.data.apoderado;
        const request$ = apoderado
            ? this.apoderadosService.update(apoderado.id, payload)
            : this.apoderadosService.create(payload);

        const action: 'created' | 'updated' = apoderado ? 'updated' : 'created';

        this.isSaving$.next(true);

        request$
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (result) => {
                    const updatedApoderado = apoderado
                        ? { ...apoderado, ...payload, ...(result ?? {}) }
                        : result ?? null;

                    if (!updatedApoderado) {
                        this.snackBar.open(
                            'No se pudo obtener la información del apoderado.',
                            'Cerrar',
                            { duration: 5000 }
                        );
                        return;
                    }

                    this.dialogRef.close({
                        apoderado: updatedApoderado,
                        action,
                    });
                },
                error: (error: Error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el apoderado.',
                        'Cerrar',
                        { duration: 5000 }
                    );
                },
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected get title(): string {
        return this.data.apoderado ? 'Editar apoderado' : 'Nuevo apoderado';
    }
}
