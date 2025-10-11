import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnoApoderado } from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { Apoderado } from 'app/core/models/centro-estudios/apoderado.model';
import { AlumnoApoderadoService } from 'app/core/services/centro-estudios/alumno-apoderado.service';
import { BehaviorSubject, Subject, finalize, takeUntil, tap } from 'rxjs';
import { ApoderadoFormDialogComponent, ApoderadoFormDialogResult } from '../apoderado-form-dialog/apoderado-form-dialog.component';
import {
    AlumnoApoderadoFormDialogComponent,
    AlumnoApoderadoFormDialogData,
    AlumnoApoderadoFormDialogResult,
} from '../alumno-apoderado-form-dialog/alumno-apoderado-form-dialog.component';

export interface AlumnoApoderadosDialogData {
    alumno: Alumno;
}

@Component({
    selector: 'app-alumno-apoderados-dialog',
    standalone: true,
    templateUrl: './alumno-apoderados-dialog.component.html',
    styleUrl: './alumno-apoderados-dialog.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgFor,
        NgIf,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatTableModule,
        MatTooltipModule,
        MatProgressBarModule,
        ApoderadoFormDialogComponent,
        AlumnoApoderadoFormDialogComponent,
    ],
})
export class AlumnoApoderadosDialogComponent implements OnInit, OnDestroy {
    protected readonly displayedColumns = ['apoderado', 'dni', 'correo', 'parentesco', 'esTitular', 'acciones'];
    protected readonly relaciones$ = new BehaviorSubject<AlumnoApoderado[]>([]);
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly alumno: Alumno;

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AlumnoApoderadosDialogData,
        private readonly dialogRef: MatDialogRef<AlumnoApoderadosDialogComponent>,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly alumnoApoderadoService: AlumnoApoderadoService
    ) {
        this.alumno = data.alumno;
    }

    ngOnInit(): void {
        this.loadRelaciones();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected close(): void {
        this.dialogRef.close();
    }

    protected refresh(): void {
        this.loadRelaciones();
    }

    protected crearApoderado(): void {
        const dialogRef = this.dialog.open(ApoderadoFormDialogComponent, {
            width: '520px',
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: ApoderadoFormDialogResult) => {
                if (!result) {
                    return;
                }

                this.vincularApoderado(result.apoderado);
            });
    }

    protected editarApoderado(relacion: AlumnoApoderado): void {
        if (!relacion.apoderado) {
            return;
        }

        const dialogRef = this.dialog.open(ApoderadoFormDialogComponent, {
            width: '520px',
            data: {
                apoderado: relacion.apoderado,
            },
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: ApoderadoFormDialogResult) => {
                if (result?.apoderado) {
                    this.actualizarApoderadoEnLista(result.apoderado);
                }
            });
    }

    protected editarRelacion(relacion: AlumnoApoderado): void {
        const dialogRef = this.dialog.open(AlumnoApoderadoFormDialogComponent, {
            width: '440px',
            data: {
                parentesco: relacion.parentesco,
                esTitular: relacion.esTitular,
            } satisfies AlumnoApoderadoFormDialogData,
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: AlumnoApoderadoFormDialogResult) => {
                if (!result || !relacion.id) {
                    return;
                }

                this.isLoading$.next(true);
                this.alumnoApoderadoService
                    .updateRelacion(this.alumno.id!, relacion.id, result.payload)
                    .pipe(
                        tap((updatedRelacion) => this.reemplazarRelacion(updatedRelacion)),
                        finalize(() => this.isLoading$.next(false))
                    )
                    .subscribe({
                        next: () =>
                            this.snackBar.open('Relación actualizada correctamente.', 'Cerrar', {
                                duration: 4000,
                            }),
                        error: (error) =>
                            this.snackBar.open(error.message ?? 'No se pudo actualizar la relación.', 'Cerrar', {
                                duration: 5000,
                            }),
                    });
            });
    }

    protected desvincular(relacion: AlumnoApoderado): void {
        if (!relacion.id) {
            return;
        }

        const confirmed = window.confirm('¿Deseas desvincular al apoderado seleccionado?');
        if (!confirmed) {
            return;
        }

        this.isLoading$.next(true);
        this.alumnoApoderadoService
            .desvincular(this.alumno.id!, relacion.id)
            .pipe(
                tap(() => {
                    const restantes = this.relaciones$.value.filter((item) => item.id !== relacion.id);
                    this.relaciones$.next(restantes);
                }),
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                next: () =>
                    this.snackBar.open('Apoderado desvinculado correctamente.', 'Cerrar', {
                        duration: 4000,
                    }),
                error: (error) =>
                    this.snackBar.open(error.message ?? 'Ocurrió un error al desvincular.', 'Cerrar', {
                        duration: 5000,
                    }),
            });
    }

    private loadRelaciones(): void {
        this.isLoading$.next(true);
        this.alumnoApoderadoService
            .obtenerPorAlumno(this.alumno.id!)
            .pipe(
                tap((relaciones) => this.relaciones$.next(relaciones)),
                finalize(() => this.isLoading$.next(false))
            )
            .subscribe({
                error: (error) =>
                    this.snackBar.open(error.message ?? 'Ocurrió un error al cargar los apoderados.', 'Cerrar', {
                        duration: 5000,
                    }),
            });
    }

    private vincularApoderado(apoderado: Apoderado): void {
        const dialogRef = this.dialog.open(AlumnoApoderadoFormDialogComponent, {
            width: '440px',
        });

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: AlumnoApoderadoFormDialogResult) => {
                if (!result) {
                    return;
                }

                this.isLoading$.next(true);
                this.alumnoApoderadoService
                    .crearRelacion(this.alumno.id!, {
                        ...result.payload,
                        apoderadoId: apoderado.id!,
                    })
                    .pipe(
                        tap((relacion) => this.agregarRelacion(relacion)),
                        finalize(() => this.isLoading$.next(false))
                    )
                    .subscribe({
                        next: () =>
                            this.snackBar.open('Apoderado registrado y vinculado correctamente.', 'Cerrar', {
                                duration: 4000,
                            }),
                        error: (error) =>
                            this.snackBar.open(error.message ?? 'No se pudo vincular al apoderado.', 'Cerrar', {
                                duration: 5000,
                            }),
                    });
            });
    }

    private agregarRelacion(relacion: AlumnoApoderado): void {
        const data = [...this.relaciones$.value, relacion];
        this.relaciones$.next(data);
    }

    private reemplazarRelacion(relacion: AlumnoApoderado): void {
        const data = this.relaciones$.value.map((item) => (item.id === relacion.id ? relacion : item));
        this.relaciones$.next(data);
    }

    private actualizarApoderadoEnLista(apoderado: Apoderado): void {
        const data = this.relaciones$.value.map((relacion) =>
            relacion.apoderado?.id === apoderado.id
                ? {
                      ...relacion,
                      apoderado,
                  }
                : relacion
        );

        this.relaciones$.next(data);
    }
}
