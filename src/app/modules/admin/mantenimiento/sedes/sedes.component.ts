import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
//<<<<<<< codex/add-search-functionality-to-sedescomponent
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
//=======
//>>>>>>> main
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
import { Sede } from 'app/core/models/centro-estudios/sede.model';
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
        NgIf,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDialogModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTooltipModule,
    ],
})
export class SedesComponent implements OnInit {
    displayedColumns = ['nombre', 'ubigeoCode', 'direccion', 'activo', 'fechaRegistro', 'actions'];
    dataSource = new MatTableDataSource<Sede>([]);
    isLoading$ = new BehaviorSubject<boolean>(false);
    searchControl = new FormControl<string>('', { nonNullable: true });

    constructor(
        private snackBar: MatSnackBar,
        private sedeService: SedeService,
        private dialog: MatDialog
    ) {}

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
}
