
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface EvaluacionDetalleImportSourceOption {
    key: string;
    label: string;
    detallesCount: number;
}

export interface EvaluacionDetalleImportDialogData {
    targetTabLabel: string;
    sources: EvaluacionDetalleImportSourceOption[];
}

export type EvaluacionDetalleImportDialogResult =
    | { action: 'import'; sourceKey: string }
    | { action: 'cancel' };

@Component({
    selector: 'app-evaluacion-detalle-import-dialog',
    standalone: true,
    templateUrl: './evaluacion-detalle-import-dialog.component.html',
    styleUrls: ['./evaluacion-detalle-import-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
],
})
export class EvaluacionDetalleImportDialogComponent {
    protected readonly form = this.fb.group({
        sourceKey: ['', Validators.required],
    });

    constructor(
        private readonly fb: FormBuilder,
        private readonly dialogRef: MatDialogRef<
            EvaluacionDetalleImportDialogComponent,
            EvaluacionDetalleImportDialogResult
        >,
        @Inject(MAT_DIALOG_DATA)
        public readonly data: EvaluacionDetalleImportDialogData
    ) {}

    protected import(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const sourceKey = this.form.controls.sourceKey.value;
        if (!sourceKey) {
            return;
        }

        this.dialogRef.close({ action: 'import', sourceKey });
    }

    protected cancel(): void {
        this.dialogRef.close({ action: 'cancel' });
    }
}
