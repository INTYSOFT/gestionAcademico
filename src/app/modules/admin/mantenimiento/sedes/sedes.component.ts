import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CreateSedePayload, Sede } from 'app/core/models/centro-estudios/sede.model';
import { BehaviorSubject, finalize, tap } from 'rxjs';

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
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatTableModule,
        MatTooltipModule,
    ],
})
export class SedesComponent implements OnInit {
    displayedColumns = ['nombre', 'ubigeoCode', 'direccion', 'createdAt', 'actions'];
    dataSource = new MatTableDataSource<Sede>([]);
    form: FormGroup;
    selectedSede: Sede | null = null;
    isLoading$ = new BehaviorSubject<boolean>(false);

    constructor(private fb: FormBuilder, private snackBar: MatSnackBar, private sedeService: SedeService) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.maxLength(150)]],
            ubigeoCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
            direccion: ['', [Validators.maxLength(255)]],
        });
    }

    ngOnInit(): void {
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

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: CreateSedePayload = {
            nombre: this.form.value.nombre,
            ubigeoCode: this.form.value.ubigeoCode,
            direccion: this.form.value.direccion,
        };

        this.isLoading$.next(true);

        const isEditing = !!this.selectedSede;
        const request$ = isEditing
            ? this.sedeService.updateSede(this.selectedSede!.id, payload)
            : this.sedeService.createSede(payload);

        request$
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                tap((sede) => {
                    this.upsertSede(sede);
                    this.resetForm();
                    this.snackBar.open(
                        isEditing
                            ? 'Sede actualizada correctamente.'
                            : 'Sede registrada correctamente.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );
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

    selectSede(sede: Sede): void {
        this.selectedSede = sede;
        this.form.patchValue({
            nombre: sede.nombre,
            ubigeoCode: sede.ubigeoCode,
            direccion: sede.direccion ?? '',
        });
    }

    resetForm(): void {
        this.selectedSede = null;
        this.form.reset({
            nombre: '',
            ubigeoCode: '',
            direccion: '',
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
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
}
