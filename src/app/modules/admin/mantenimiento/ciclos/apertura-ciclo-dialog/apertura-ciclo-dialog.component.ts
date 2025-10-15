import { AsyncPipe, NgFor, NgIf } from '@angular/common';
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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { Sede } from 'app/core/models/centro-estudios/sede.model';
import { AperturaCiclo } from 'app/core/models/centro-estudios/apertura-ciclo.model';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';

export interface AperturaCicloDialogData {
    ciclo: Ciclo;
}

export interface AperturaCicloDialogResult {
    updated: boolean;
}

interface AperturaCicloRow {
    form: FormGroup;
    sedeNombre: string;
    initial: {
        id: number | null;
        activo: boolean;
        observacion: string | null;
    };
}

@Component({
    selector: 'app-apertura-ciclo-dialog',
    standalone: true,
    templateUrl: './apertura-ciclo-dialog.component.html',
    styleUrls: ['./apertura-ciclo-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        ReactiveFormsModule,
        MatDialogModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressBarModule,
        MatSnackBarModule,
    ],
})
export class AperturaCicloDialogComponent implements OnInit, OnDestroy {
    protected readonly isLoading$ = new BehaviorSubject<boolean>(true);
    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected rows: AperturaCicloRow[] = [];

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: AperturaCicloDialogData,
        private readonly dialogRef: MatDialogRef<
            AperturaCicloDialogComponent,
            AperturaCicloDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly sedeService: SedeService,
        private readonly aperturaCicloService: AperturaCicloService,
        private readonly snackBar: MatSnackBar
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected save(): void {
        if (this.isLoading$.value || this.isSaving$.value) {
            return;
        }

        const operations: Observable<AperturaCiclo>[] = this.rows
            .map(({ form, initial }) => {
                const raw = form.getRawValue() as {
                    id: number | null;
                    sedeId: number;
                    activo: boolean;
                    observacion: string | null;
                };
                const observacion = this.normalizeObservacion(raw.observacion);
                const hasChanges =
                    initial.activo !== raw.activo ||
                    this.normalizeObservacion(initial.observacion) !== observacion;

                if (raw.id) {
                    if (!hasChanges) {
                        return null;
                    }

                    return this.aperturaCicloService.update(raw.id, {
                        sedeId: raw.sedeId,
                        cicloId: this.data.ciclo.id,
                        observacion,
                        activo: raw.activo,
                    });
                }

                if (!raw.activo) {
                    return null;
                }

                return this.aperturaCicloService.create({
                    sedeId: raw.sedeId,
                    cicloId: this.data.ciclo.id,
                    observacion,
                    activo: raw.activo,
                });
            })
            .filter((operation): operation is Observable<AperturaCiclo> => operation !== null);

        if (operations.length === 0) {
            this.dialogRef.close({ updated: false });
            return;
        }

        this.isSaving$.next(true);

        forkJoin(operations)
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: () => {
                    this.dialogRef.close({ updated: true });
                },
                error: () => {
                    this.snackBar.open(
                        'Ocurrió un error al guardar la apertura del ciclo. Por favor, inténtalo nuevamente.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                },
            });
    }

    protected isRowActive(row: AperturaCicloRow): boolean {
        return row.form.get('activo')?.value ?? false;
    }

    private loadData(): void {
        this.isLoading$.next(true);

        forkJoin({
            sedes: this.sedeService.getSedes().pipe(
                catchError((error) => {
                    console.error('Error al cargar las sedes', error);
                    this.snackBar.open(
                        'Ocurrió un error al cargar las sedes. Por favor, inténtalo nuevamente.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                    return of<Sede[]>([]);
                })
            ),
            aperturas: this.aperturaCicloService.listByCiclo(this.data.ciclo.id).pipe(
                catchError((error) => {
                    console.error('Error al cargar la apertura del ciclo', error);
                    this.snackBar.open(
                        'Ocurrió un error al cargar la apertura del ciclo. Por favor, inténtalo nuevamente.',
                        'Cerrar',
                        {
                            duration: 5000,
                        }
                    );
                    return of<AperturaCiclo[]>([]);
                })
            ),
        })
            .pipe(finalize(() => this.isLoading$.next(false)), takeUntil(this.destroy$))
            .subscribe(({ sedes, aperturas }) => {
                this.rows = sedes.map((sede) => this.buildRow(sede, aperturas));
            });
    }

    private buildRow(sede: Sede, aperturas: AperturaCiclo[]): AperturaCicloRow {
        const apertura = aperturas.find((item) => item.sedeId === sede.id) ?? null;
        const activo = apertura?.activo ?? false;
        const observacion = apertura?.observacion ?? null;

        const form = this.fb.group({
            id: [apertura?.id ?? null],
            sedeId: [sede.id],
            activo: [activo],
            observacion: [
                { value: observacion ?? '', disabled: !activo },
                [Validators.maxLength(500)],
            ],
        });

        form
            .get('activo')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((checked: boolean) => {
                const control = form.get('observacion');
                if (!control) {
                    return;
                }

                if (checked) {
                    control.enable({ emitEvent: false });
                } else {
                    control.disable({ emitEvent: false });
                }
            });

        return {
            form,
            sedeNombre: sede.nombre,
            initial: {
                id: apertura?.id ?? null,
                activo,
                observacion,
            },
        };
    }

    private normalizeObservacion(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}
