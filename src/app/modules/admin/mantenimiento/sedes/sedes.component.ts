import { AsyncPipe, DatePipe } from '@angular/common';
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
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CreateSedePayload, Sede } from 'app/core/models/centro-estudios/sede.model';
import { blurActiveElement } from 'app/core/utils/focus.util';
import { BehaviorSubject, finalize, tap } from 'rxjs';
import {
    SedeDialogResult,
    SedeFormDialogComponent,
} from './sede-form-dialog.component';

@Component({
    selector: 'app-sedes',
    standalone: true,
    templateUrl: './sedes.component.html',
    styleUrl: './sedes.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    AsyncPipe,
    DatePipe,
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
    MatTooltipModule
],
})
export class SedesComponent implements OnInit {
    displayedColumns = ['nombre', 'ubigeoCode', 'direccion', 'activo', 'fechaRegistro', 'actions'];
    dataSource = new MatTableDataSource<Sede>([]);
    isLoading$ = new BehaviorSubject<boolean>(false);
    isSaving$ = new BehaviorSubject<boolean>(false);
    searchControl = new FormControl<string>('', { nonNullable: true });
    form: FormGroup;
    selectedSede: Sede | null = null;

    constructor(
        private snackBar: MatSnackBar,
        private sedeService: SedeService,
        private dialog: MatDialog,
        private fb: FormBuilder
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ubigeoCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
            direccion: ['', [Validators.maxLength(255)]],
            activo: [true],
        });
    }

    ngOnInit(): void {
        this.dataSource.filterPredicate = (data: Sede, filter: string): boolean => {
            const normalizedFilter = filter.trim().toLowerCase();

            if (!normalizedFilter) {
                return true;
            }

            const valuesToCheck = [
                data.nombre,
                data.ubigeoCode,
                data.direccion ?? '',
                data.activo ? 'activo' : 'inactivo',
                data.fechaRegistro ?? '',
            ];

            return valuesToCheck.some((value) =>
                value.toString().toLowerCase().includes(normalizedFilter)
            );
        };

        this.loadSedes();
    }

    loadSedes(): void {
        this.isLoading$.next(true);
        this.sedeService
            .getSedes()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                tap((sedes) => {
                    this.dataSource.data = sedes;
                    this.applyFilter(this.searchControl.value);
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al cargar las sedes.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }

    openSedeDialog(sede?: Sede): void {
        blurActiveElement();

        const dialogRef = this.dialog.open<SedeFormDialogComponent, Sede | null, SedeDialogResult>(
            SedeFormDialogComponent,
            {
                data: sede ?? null,
            }
        );

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            if (result.reload) {
                this.loadSedes();
                return;
            }

            if (result.sede) {
                this.upsertSede(result.sede);
            }
        });
    }

    private upsertSede(sede: Sede): void {
        const data = [...this.dataSource.data];
        const index = data.findIndex((item) => item.id === sede.id);

        if (index > -1) {
            data[index] = sede;
        } else {
            data.unshift(sede);
        }

        this.dataSource.data = data;
    }

    applyFilter(value: string): void {
        this.dataSource.filter = value.trim().toLowerCase();
    }

    selectSede(sede: Sede): void {
        this.selectedSede = sede;
        this.form.patchValue({
            nombre: sede.nombre,
            ubigeoCode: sede.ubigeoCode,
            direccion: sede.direccion ?? '',
            activo: sede.activo,
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    resetForm(): void {
        this.selectedSede = null;
        this.form.reset({
            nombre: '',
            ubigeoCode: '',
            direccion: '',
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

        const payload: CreateSedePayload = {
            nombre: this.form.value.nombre,
            ubigeoCode: this.form.value.ubigeoCode,
            direccion: this.form.value.direccion,
            activo: this.form.value.activo,
        };

        const isEditing = !!this.selectedSede;

        this.isSaving$.next(true);

        const request$ = isEditing
            ? this.sedeService.updateSede(this.selectedSede!.id, payload)
            : this.sedeService.createSede(payload);

        let shouldReloadAfterUpdate = false;

        request$
            .pipe(
                tap((sede) => {
                    if (sede) {
                        this.upsertSede(sede);
                        this.applyFilter(this.searchControl.value);

                        if (isEditing) {
                            this.selectSede(sede);
                        } else {
                            this.resetForm();
                        }
                    } else if (isEditing) {
                        shouldReloadAfterUpdate = true;
                        this.resetForm();
                    }

                    this.snackBar.open(
                        isEditing ? 'Sede actualizada correctamente.' : 'Sede registrada correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
                }),
                finalize(() => {
                    this.isSaving$.next(false);

                    if (shouldReloadAfterUpdate) {
                        this.loadSedes();
                    }
                })
            )
            .subscribe({
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al guardar la sede.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }
}
