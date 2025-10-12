import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject, finalize, tap } from 'rxjs';
import {
    CreateUniversidadPayload,
    Universidad,
} from 'app/core/models/centro-estudios/universidad.model';
import { UniversidadService } from 'app/core/services/centro-estudios/universidad.service';
import {
    UniversidadDialogResult,
    UniversidadFormDialogComponent,
} from './universidad-form-dialog.component';

@Component({
    selector: 'app-universidades',
    standalone: true,
    templateUrl: './universidades.component.html',
    styleUrl: './universidades.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        DatePipe,
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDialogModule,
        MatProgressBarModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatTableModule,
        MatTooltipModule,
    ],
})
export class UniversidadesComponent implements OnInit {
    displayedColumns = ['nombre', 'ciudad', 'activo', 'fechaRegistro', 'actions'];
    dataSource = new MatTableDataSource<Universidad>([]);
    isLoading$ = new BehaviorSubject<boolean>(false);
    isSaving$ = new BehaviorSubject<boolean>(false);
    searchControl = new FormControl<string>('', { nonNullable: true });
    form: FormGroup;
    selectedUniversidad: Universidad | null = null;

    constructor(
        private snackBar: MatSnackBar,
        private universidadService: UniversidadService,
        private dialog: MatDialog,
        private fb: FormBuilder
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ciudad: ['', [Validators.maxLength(150)]],
            activo: [true],
        });
    }

    ngOnInit(): void {
        this.dataSource.filterPredicate = (data: Universidad, filter: string): boolean => {
            const normalizedFilter = filter.trim().toLowerCase();

            if (!normalizedFilter) {
                return true;
            }

            const valuesToCheck = [
                data.nombre,
                data.ciudad ?? '',
                data.activo ? 'activo' : 'inactivo',
                data.fechaRegistro ?? '',
            ];

            return valuesToCheck.some((value) =>
                value.toString().toLowerCase().includes(normalizedFilter)
            );
        };

        this.loadUniversidades();
    }

    loadUniversidades(): void {
        this.isLoading$.next(true);
        this.universidadService
            .getUniversidades()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                tap((universidades) => {
                    this.dataSource.data = universidades;
                    this.applyFilter(this.searchControl.value);
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar las universidades.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    openUniversidadDialog(universidad?: Universidad): void {
        const dialogRef = this.dialog.open<
            UniversidadFormDialogComponent,
            Universidad | null,
            UniversidadDialogResult
        >(UniversidadFormDialogComponent, {
            data: universidad ?? null,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            if (result.reload) {
                this.loadUniversidades();
                return;
            }

            if (result.universidad) {
                this.upsertUniversidad(result.universidad);
            }
        });
    }

    private upsertUniversidad(universidad: Universidad): void {
        const data = [...this.dataSource.data];
        const index = data.findIndex((item) => item.id === universidad.id);

        if (index > -1) {
            data[index] = universidad;
        } else {
            data.unshift(universidad);
        }

        this.dataSource.data = data;
    }

    applyFilter(value: string): void {
        this.dataSource.filter = value.trim().toLowerCase();
    }

    selectUniversidad(universidad: Universidad): void {
        this.selectedUniversidad = universidad;
        this.form.patchValue({
            nombre: universidad.nombre,
            ciudad: universidad.ciudad ?? '',
            activo: universidad.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    resetForm(): void {
        this.selectedUniversidad = null;
        this.form.reset({
            nombre: '',
            ciudad: '',
            activo: true,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateUniversidadPayload = {
            nombre: this.form.value.nombre,
            ciudad: this.form.value.ciudad,
            activo: this.form.value.activo,
        };

        const isEditing = !!this.selectedUniversidad;

        this.isSaving$.next(true);

        const request$ = isEditing
            ? this.universidadService.updateUniversidad(this.selectedUniversidad!.id, payload)
            : this.universidadService.createUniversidad(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((universidad) => {
                    if (universidad) {
                        this.upsertUniversidad(universidad);
                        this.applyFilter(this.searchControl.value);

                        if (isEditing) {
                            this.selectUniversidad(universidad);
                        } else {
                            this.resetForm();
                        }
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                        this.resetForm();
                    }

                    this.snackBar.open(
                        isEditing
                            ? 'Universidad actualizada correctamente.'
                            : 'Universidad registrada correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                }),
                finalize(() => {
                    this.isSaving$.next(false);

                    if (shouldReloadAfterUpdate) {
                        this.loadUniversidades();
                    }
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar la universidad.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }
}
