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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
    BehaviorSubject,
    Subject,
    combineLatest,
    debounceTime,
    finalize,
    map,
    takeUntil,
} from 'rxjs';
import {
    Apoderado,
    CreateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';
import { Parentesco } from 'app/core/models/centro-estudios/parentesco.model';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import { ParentescosService } from 'app/core/services/centro-estudios/parentescos.service';
import { FormControl } from '@angular/forms';

export interface ApoderadoFormDialogData {
    alumnoId: number;
}

export interface ApoderadoFormDialogResult {
    apoderado: Apoderado;
    parentescoId: number;
}

@Component({
    selector: 'app-apoderado-form-dialog',
    standalone: true,
    templateUrl: './apoderado-form-dialog.component.html',
    styleUrls: ['./apoderado-form-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatListModule,
        MatButtonModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatSelectModule,
    ],
})
export class ApoderadoFormDialogComponent implements OnInit, OnDestroy {
    protected readonly searchControl = new FormControl('', {
        nonNullable: true,
    });
    protected readonly apoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly filteredApoderados$ = new BehaviorSubject<Apoderado[]>([]);
    protected readonly parentescos$ = new BehaviorSubject<Parentesco[]>([]);
    protected readonly selectedApoderado$ = new BehaviorSubject<Apoderado | null>(null);
    protected readonly selectedParentesco = new FormControl<number | null>(null, [
        Validators.required,
    ]);

    protected readonly showCreateSection$ = combineLatest([
        this.isLoading$,
        this.filteredApoderados$,
    ]).pipe(map(([isLoading, apoderados]) => !isLoading && apoderados.length === 0));

    protected readonly parentescoStep$ = this.showCreateSection$.pipe(
        map((showCreateSection) => (showCreateSection ? 3 : 2))
    );

    protected readonly createForm: FormGroup;

    protected readonly isLoading$ = new BehaviorSubject<boolean>(true);
    protected readonly isCreating$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: ApoderadoFormDialogData,
        private readonly dialogRef: MatDialogRef<
            ApoderadoFormDialogComponent,
            ApoderadoFormDialogResult
        >,
        private readonly fb: FormBuilder,
        private readonly apoderadosService: ApoderadosService,
        private readonly parentescosService: ParentescosService,
        private readonly snackBar: MatSnackBar
    ) {
        this.createForm = this.fb.group({
            apellidos: ['', [Validators.required, Validators.maxLength(150)]],
            nombres: ['', [Validators.required, Validators.maxLength(150)]],
            documento: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.maxLength(15),
                    Validators.pattern(/^\d+$/),
                ],
            ],
            celular: [null, [Validators.pattern(/^[0-9]{9,15}$/)]],
            correo: [null, [Validators.email]],
        });
    }

    ngOnInit(): void {
        this.loadApoderados();
        this.loadParentescos();

        this.applyFilter(this.searchControl.value);

        this.searchControl.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((term) => this.applyFilter(term));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected selectApoderado(apoderado: Apoderado): void {
        this.selectedApoderado$.next(apoderado);
        this.selectedParentesco.reset();
    }

    protected save(): void {
        const apoderado = this.selectedApoderado$.value;
        const parentescoId = this.selectedParentesco.value;

        if (!apoderado || this.selectedParentesco.invalid || !parentescoId) {
            this.selectedParentesco.markAsTouched();
            this.snackBar.open('Seleccione un apoderado y parentesco.', 'Cerrar', {
                duration: 4000,
            });
            return;
        }

        this.dialogRef.close({ apoderado, parentescoId });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected createApoderado(): void {
        if (this.createForm.invalid) {
            this.createForm.markAllAsTouched();
            return;
        }

        const payload: CreateApoderadoPayload = {
            apellidos: this.createForm.value.apellidos!,
            nombres: this.createForm.value.nombres!,
            documento: this.createForm.value.documento!,
            celular: this.createForm.value.celular ?? null,
            correo: this.createForm.value.correo ?? null,
            activo: true,
        };

        this.isCreating$.next(true);
        this.apoderadosService
            .create(payload)
            .pipe(
                finalize(() => this.isCreating$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((created) => {
                const current = [created, ...this.apoderados$.value];
                this.apoderados$.next(current);
                this.applyFilter(this.searchControl.value);
                this.selectApoderado(created);
                this.snackBar.open('Apoderado registrado correctamente.', 'Cerrar', {
                    duration: 4000,
                });
            });
    }

    protected isSelected(apoderado: Apoderado): boolean {
        return this.selectedApoderado$.value?.id === apoderado.id;
    }

    protected trackByApoderadoId(index: number, apoderado: Apoderado): number {
        return apoderado.id;
    }

    protected trackByParentescoId(index: number, parentesco: Parentesco): number {
        return parentesco.id;
    }

    private loadApoderados(): void {
        this.isLoading$.next(true);
        this.apoderadosService
            .list()
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((apoderados) => {
                this.apoderados$.next(apoderados);
                this.applyFilter(this.searchControl.value);
            });
    }

    private loadParentescos(): void {
        this.parentescosService
            .list()
            .pipe(takeUntil(this.destroy$))
            .subscribe((parentescos) => {
                this.parentescos$.next(
                    parentescos.filter((parentesco) => parentesco.activo)
                );
            });
    }

    private applyFilter(term: string): void {
        const normalized = term.trim().toLowerCase();
        const apoderados = this.apoderados$.value;

        if (!normalized) {
            this.filteredApoderados$.next([...apoderados]);
            return;
        }

        const filtered = apoderados.filter((apoderado) => {
            const searchable = [
                apoderado.documento,
                apoderado.apellidos,
                apoderado.nombres,
                apoderado.correo,
            ]
                .filter((value): value is string => !!value)
                .map((value) => value.toLowerCase())
                .join(' ');

            return searchable.includes(normalized);
        });

        this.filteredApoderados$.next(filtered);
    }
}
