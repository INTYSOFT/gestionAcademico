import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    BehaviorSubject,
    Observable,
    Subject,
    finalize,
    map,
    switchMap,
    takeUntil,
} from 'rxjs';
import {
    Alumno,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import { ColegiosService } from 'app/core/services/centro-estudios/colegios.service';
import { AlumnosService } from 'app/core/services/centro-estudios/alumnos.service';
import { Colegio } from 'app/core/models/centro-estudios/colegio.model';

export interface AlumnoFormDialogData {
    alumno?: Alumno;
}

export type AlumnoFormDialogResult =
    | { action: 'created'; alumno: Alumno }
    | { action: 'updated'; alumno: Alumno };

@Component({
    selector: 'app-alumno-form-dialog',
    standalone: true,
    templateUrl: './alumno-form-dialog.component.html',
    styleUrls: ['./alumno-form-dialog.component.scss'],
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
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatSnackBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
    ],
    providers: [DatePipe],
})
export class AlumnoFormDialogComponent implements OnInit, OnDestroy {
    private readonly validatePastDate = (
        control: AbstractControl
    ): ValidationErrors | null => {
        const value = control.value;
        if (!value) {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date > today) {
            return { futureDate: true };
        }

        return null;
    };

    protected readonly form: FormGroup = this.fb.group({
        dni: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(12), Validators.pattern(/^\d+$/)]],
        apellidos: ['', [Validators.required, Validators.maxLength(150)]],
        nombres: ['', [Validators.required, Validators.maxLength(150)]],
        fechaNacimiento: [null, [this.validatePastDate]],
        celular: [null, [Validators.pattern(/^[0-9]{9,15}$/)]],
        correo: [null, [Validators.email]],
        colegioId: [null, [Validators.required]],
        direccion: [null, [Validators.maxLength(250)]],
        observacion: [null, [Validators.maxLength(500)]],
        activo: [true],
    });

    protected readonly isSaving$ = new BehaviorSubject<boolean>(false);
    protected colegios$!: Observable<Colegio[]>;

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: AlumnoFormDialogData,
        private readonly dialogRef: MatDialogRef<AlumnoFormDialogComponent, AlumnoFormDialogResult>,
        private readonly fb: FormBuilder,
        private readonly alumnosService: AlumnosService,
        private readonly colegiosService: ColegiosService,
        private readonly datePipe: DatePipe
    ) {}

    ngOnInit(): void {
        this.colegios$ = this.colegiosService
            .list()
            .pipe(map((colegios) => colegios.filter((colegio) => colegio.activo)));            

        if (this.data.alumno) {
            this.patchForm(this.data.alumno);
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
        const alumno = this.data.alumno;
        this.isSaving$.next(true);

        const request$ = alumno
            ? this.alumnosService
                  .updatePartial(alumno.id, payload as UpdateAlumnoPayload)
                  .pipe(switchMap(() => this.alumnosService.get(alumno.id)))
            : this.alumnosService.create(payload as CreateAlumnoPayload);

        request$
            .pipe(
                finalize(() => this.isSaving$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((response) => {
                const result: AlumnoFormDialogResult = alumno
                    ? { action: 'updated', alumno: response }
                    : { action: 'created', alumno: response };
                this.dialogRef.close(result);
            });
    }

    protected cancel(): void {
        this.dialogRef.close();
    }

    protected trackById(index: number, item: { id: number }): number {
        return item.id;
    }

    private patchForm(alumno: Alumno): void {
        const fechaNacimiento = alumno.fechaNacimiento
            ? new Date(alumno.fechaNacimiento)
            : null;

        this.form.patchValue({
            dni: alumno.dni,
            apellidos: alumno.apellidos ?? '',
            nombres: alumno.nombres ?? '',
            fechaNacimiento,
            celular: alumno.celular ?? null,
            correo: alumno.correo ?? null,
            colegioId: alumno.colegioId ?? null,
            direccion: alumno.direccion ?? null,
            observacion: alumno.observacion ?? null,
            activo: alumno.activo,
        });
    }

    private buildPayload(): CreateAlumnoPayload | UpdateAlumnoPayload {
        const raw = this.form.value;
        const fecha = raw.fechaNacimiento
            ? this.datePipe.transform(raw.fechaNacimiento, 'yyyy-MM-dd')
            : null;

        return {
            dni: raw.dni!,
            apellidos: raw.apellidos!,
            nombres: raw.nombres!,
            fechaNacimiento: fecha,
            celular: raw.celular ?? null,
            correo: raw.correo ?? null,
            colegioId: raw.colegioId!,
            direccion: raw.direccion ?? null,
            observacion: raw.observacion ?? null,
            activo: raw.activo ?? true,
        };
    }
}
