import { AsyncPipe } from '@angular/common';
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
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, Observable, finalize, switchMap, takeUntil } from 'rxjs';
import {
    Apoderado,
    CreateApoderadoPayload,
    UpdateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import { Subject } from 'rxjs';

export interface ApoderadoFormDialogData {
    apoderado?: Apoderado;
}

export type ApoderadoFormDialogResult =
    | { action: 'created'; apoderado: Apoderado }
    | { action: 'updated'; apoderado: Apoderado };

@Component({
    selector: 'app-apoderado-form-dialog',
    standalone: true,
    templateUrl: './apoderado-form-dialog.component.html',
    styleUrls: ['./apoderado-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule
],
})
export class ApoderadoFormDialogComponent implements OnInit, OnDestroy {
    protected readonly form: FormGroup = this.fb.group({
        documento: [
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
        correo: [null, [Validators.email]],
        activo: [true],
    });

    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: ApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            ApoderadoFormDialogComponent,
            ApoderadoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly apoderadosService: ApoderadosService
    ) {}

    ngOnInit(): void {
        if (this.data.apoderado) {
            this.patchForm(this.data.apoderado);
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

        const basePayload = this.buildPayload();
        const apoderado = this.data.apoderado;
        this.isSaving$.next(true);

        let request$: Observable<Apoderado>;

        if (apoderado) {
            const updatePayload: UpdateApoderadoPayload = {
                ...basePayload,
                id: apoderado.id,
            };

            request$ = this.apoderadosService
                .update(apoderado.id, updatePayload)
                .pipe(switchMap(() => this.apoderadosService.get(apoderado.id)));
        } else {
            request$ = this.apoderadosService.create(basePayload);
        }

        request$
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((response) => {
                const result: ApoderadoFormDialogResult = apoderado
                    ? { action: 'updated', apoderado: response }
                    : { action: 'created', apoderado: response };
                this.dialogRef.close(result);
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    private patchForm(apoderado: Apoderado): void {
        this.form.patchValue({
            documento: apoderado.documento ?? '',
            apellidos: apoderado.apellidos ?? '',
            nombres: apoderado.nombres ?? '',
            celular: apoderado.celular ?? null,
            correo: apoderado.correo ?? null,
            activo: apoderado.activo,
        });
    }

    private buildPayload(): CreateApoderadoPayload {
        const raw = this.form.value;

        return {
            documento: raw.documento!,
            apellidos: raw.apellidos!,
            nombres: raw.nombres!,
            celular: raw.celular ?? null,
            correo: raw.correo ?? null,
            activo: raw.activo ?? true,
        };
    }
}
