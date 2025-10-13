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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import {
    Curso,
    CreateCursoPayload,
} from 'app/core/models/centro-estudios/curso.model';
import { CursosService } from 'app/core/services/centro-estudios/cursos.service';

export interface CursoFormDialogData {
    curso: Curso | null;
}

export type CursoFormDialogResult =
    | { action: 'created'; curso: Curso }
    | { action: 'updated'; curso: Curso };

@Component({
    selector: 'app-curso-form-dialog',
    standalone: true,
    templateUrl: './curso-form-dialog.component.html',
    styleUrls: ['./curso-form-dialog.component.scss'],
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
        MatSnackBarModule,
        MatSlideToggleModule,
        MatProgressBarModule,
    ],
})
export class CursoFormDialogComponent {
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected readonly form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: CursoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            CursoFormDialogComponent,
            CursoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly snackBar: MatSnackBar,
        private readonly cursosService: CursosService
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            descripcion: ['', [Validators.maxLength(255)]],
            activo: [true],
        });

        if (data.curso) {
            this.patchForm(data.curso);
        }
    }

    protected save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = this.buildPayload();
        const curso = this.data.curso ?? null;
        this.isSaving$.next(true);

        const request$ = curso
            ? this.cursosService.updateCurso(curso.id, payload)
            : this.cursosService.createCurso(payload);

        request$
            .pipe(finalize(() => this.isSaving$.next(false)))
            .subscribe({
                next: (result) => {
                    const action = curso ? 'updated' : 'created';
                    const message =
                        action === 'created'
                            ? 'Curso registrado correctamente.'
                            : 'Curso actualizado correctamente.';

                    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
                    this.dialogRef.close({ action, curso: result });
                },
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el curso.',
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

    private patchForm(curso: Curso): void {
        this.form.patchValue({
            nombre: curso.nombre,
            descripcion: curso.descripcion ?? '',
            activo: curso.activo,
        });
    }

    private buildPayload(): CreateCursoPayload {
        const raw = this.form.value;
        const nombre = String(raw.nombre ?? '').trim();
        const descripcionRaw = raw.descripcion;
        const descripcion =
            descripcionRaw === null || descripcionRaw === undefined
                ? null
                : String(descripcionRaw).trim();

        const payload: CreateCursoPayload = {
            nombre,
            descripcion: descripcion && descripcion.length > 0 ? descripcion : null,
            activo: !!raw.activo,
        };

        return payload;
    }
}
