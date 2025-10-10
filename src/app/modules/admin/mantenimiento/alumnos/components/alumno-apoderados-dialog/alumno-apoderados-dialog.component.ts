import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnoApoderado } from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { AlumnoApoderadoService } from 'app/core/services/centro-estudios/alumno-apoderado.service';

interface AlumnoApoderadosDialogData {
    alumno: Alumno;
}

@Component({
    selector: 'app-alumno-apoderados-dialog',
    standalone: true,
    imports: [
        AsyncPipe,
        DatePipe,
        NgIf,
        MatDialogModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressBarModule,
    ],
    templateUrl: './alumno-apoderados-dialog.component.html',
    styleUrl: './alumno-apoderados-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlumnoApoderadosDialogComponent implements OnInit {
    readonly displayedColumns = ['dni', 'nombres', 'celular', 'correo', 'activo', 'fechaRegistro'];
    readonly dataSource = new MatTableDataSource<AlumnoApoderado>([]);
    readonly isLoading$ = new BehaviorSubject<boolean>(false);

    constructor(
        private readonly alumnoApoderadoService: AlumnoApoderadoService,
        private readonly snackBar: MatSnackBar,
        @Inject(MAT_DIALOG_DATA) readonly data: AlumnoApoderadosDialogData
    ) {}

    ngOnInit(): void {
        this.loadApoderados();
    }

    private loadApoderados(): void {
        this.isLoading$.next(true);
        this.alumnoApoderadoService
            .getByAlumnoId(this.data.alumno.id)
            .pipe(
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                next: (apoderados) => {
                    this.dataSource.data = apoderados;
                },
                error: (error) => {
                    this.snackBar.open(error.message ?? 'Ocurrió un error al cargar los apoderados.', 'Cerrar', {
                        duration: 5000,
                    });
                },
            });
    }
}
