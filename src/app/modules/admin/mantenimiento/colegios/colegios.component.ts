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
import { blurActiveElement } from 'app/core/utils/focus.util';
import {
    Colegio,
    CreateColegioPayload,
} from 'app/core/models/centro-estudios/colegio.model';
import { ColegiosService } from 'app/core/services/centro-estudios/colegios.service';
import {
    ColegioDialogResult,
    ColegioFormDialogComponent,
} from './colegio-form-dialog.component';

@Component({
    selector: 'app-colegios',
    standalone: true,
    templateUrl: './colegios.component.html',
    styleUrl: './colegios.component.scss',
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
export class ColegiosComponent implements OnInit {
    displayedColumns = ['nombre', 'ubigeoCode', 'esPrivado', 'activo', 'fechaRegistro', 'actions'];
    dataSource = new MatTableDataSource<Colegio>([]);
    isLoading$ = new BehaviorSubject<boolean>(false);
    isSaving$ = new BehaviorSubject<boolean>(false);
    searchControl = new FormControl<string>('', { nonNullable: true });
    form: FormGroup;
    selectedColegio: Colegio | null = null;

    constructor(
        private snackBar: MatSnackBar,
        private colegiosService: ColegiosService,
        private dialog: MatDialog,
        private fb: FormBuilder
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ubigeoCode: [
                '',
                [
                    Validators.maxLength(6),
                    Validators.pattern(/^(\d{6})?$/),
                ],
            ],
            esPrivado: [false],
            activo: [true],
        });
    }

    ngOnInit(): void {
        this.dataSource.filterPredicate = (data: Colegio, filter: string): boolean => {
            const normalizedFilter = filter.trim().toLowerCase();

            if (!normalizedFilter) {
                return true;
            }

            const valuesToCheck = [
                data.nombre,
                data.ubigeoCode ?? '',
                data.esPrivado ? 'privado' : 'publico',
                data.activo ? 'activo' : 'inactivo',
                data.fechaRegistro ?? '',
            ];

            return valuesToCheck.some((value) =>
                value.toString().toLowerCase().includes(normalizedFilter)
            );
        };

        this.loadColegios();
    }

    loadColegios(): void {
        this.isLoading$.next(true);
        this.colegiosService
            .getColegios()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                tap((colegios) => {
                    this.dataSource.data = colegios;
                    this.applyFilter(this.searchControl.value);
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al cargar los colegios.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    openColegioDialog(colegio?: Colegio): void {
        blurActiveElement();

        const dialogRef = this.dialog.open<
            ColegioFormDialogComponent,
            Colegio | null,
            ColegioDialogResult
        >(ColegioFormDialogComponent, {
            data: colegio ?? null,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            if (result.reload) {
                this.loadColegios();
                return;
            }

            if (result.colegio) {
                this.upsertColegio(result.colegio);
            }
        });
    }

    private upsertColegio(colegio: Colegio): void {
        const data = [...this.dataSource.data];
        const index = data.findIndex((item) => item.id === colegio.id);

        if (index > -1) {
            data[index] = colegio;
        } else {
            data.unshift(colegio);
        }

        this.dataSource.data = data;
    }

    applyFilter(value: string): void {
        this.dataSource.filter = value.trim().toLowerCase();
    }

    selectColegio(colegio: Colegio): void {
        this.selectedColegio = colegio;
        this.form.patchValue({
            nombre: colegio.nombre,
            ubigeoCode: colegio.ubigeoCode ?? '',
            esPrivado: colegio.esPrivado ?? false,
            activo: colegio.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    resetForm(): void {
        this.selectedColegio = null;
        this.form.reset({
            nombre: '',
            ubigeoCode: '',
            esPrivado: false,
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

        const payload: CreateColegioPayload = {
            nombre: this.form.value.nombre,
            ubigeoCode: this.form.value.ubigeoCode ? this.form.value.ubigeoCode : null,
            esPrivado: this.form.value.esPrivado,
            activo: this.form.value.activo,
        };

        const isEditing = !!this.selectedColegio;

        this.isSaving$.next(true);

        const request$ = isEditing
            ? this.colegiosService.updateColegio(this.selectedColegio!.id, payload)
            : this.colegiosService.createColegio(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((colegio) => {
                    if (colegio) {
                        this.upsertColegio(colegio);
                        this.applyFilter(this.searchControl.value);

                        if (isEditing) {
                            this.selectColegio(colegio);
                        } else {
                            this.resetForm();
                        }
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                        this.resetForm();
                    }

                    this.snackBar.open(
                        isEditing
                            ? 'Colegio actualizado correctamente.'
                            : 'Colegio registrado correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                }),
                finalize(() => {
                    this.isSaving$.next(false);

                    if (shouldReloadAfterUpdate) {
                        this.loadColegios();
                    }
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(
                        error.message ?? 'Ocurrió un error al guardar el colegio.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }
}
