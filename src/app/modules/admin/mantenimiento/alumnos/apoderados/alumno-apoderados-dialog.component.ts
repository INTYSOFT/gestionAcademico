import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';
import { AlumnoApoderado } from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { Parentesco } from 'app/core/models/centro-estudios/parentesco.model';
import { AlumnoApoderadoService } from 'app/core/services/centro-estudios/alumno-apoderado.service';
import { ApoderadosService } from 'app/core/services/centro-estudios/apoderados.service';
import { ParentescosService } from 'app/core/services/centro-estudios/parentescos.service';
import { blurActiveElement } from 'app/core/utils/focus.util';
import {
    BehaviorSubject,
    Subject,
    catchError,
    finalize,
    forkJoin,
    map,
    of,
    switchMap,
    takeUntil,
} from 'rxjs';
import { ApoderadoFormDialogComponent, ApoderadoFormDialogResult } from './apoderado-form-dialog.component';

@Component({
    selector: 'app-alumno-apoderados-dialog',
    standalone: true,
    templateUrl: './alumno-apoderados-dialog.component.html',
    styleUrls: ['./alumno-apoderados-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgIf,
        NgFor,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatTableModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
})
export class AlumnoApoderadosDialogComponent implements OnInit, OnDestroy {
    protected readonly displayedColumns = [
        'documento',
        'apellidos',
        'nombres',
        'parentesco',
        'celular',
        'correo',
        'acciones',
    ];

    protected readonly relaciones$ = new BehaviorSubject<AlumnoApoderado[]>([]);
    protected readonly parentescos$ = new BehaviorSubject<Parentesco[]>([]);
    protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
    protected readonly updatingIds = new Set<number>();

    private readonly destroy$ = new Subject<void>();

    constructor(
        @Inject(MAT_DIALOG_DATA) protected readonly data: Alumno,
        private readonly dialogRef: MatDialogRef<AlumnoApoderadosDialogComponent>,
        private readonly dialog: MatDialog,
        private readonly snackBar: MatSnackBar,
        private readonly alumnoApoderadoService: AlumnoApoderadoService,
        private readonly parentescosService: ParentescosService,
        private readonly apoderadosService: ApoderadosService
    ) {}

    ngOnInit(): void {
        this.loadParentescos();
        this.loadRelaciones();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected addApoderado(): void {
        blurActiveElement();

        this.dialog
            .open(ApoderadoFormDialogComponent, {
                width: '760px',
                data: { alumnoId: this.data.id },
                disableClose: true,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: ApoderadoFormDialogResult) => {
                if (!result) {
                    return;
                }

                this.linkApoderado(result);
            });
    }

    protected updateParentesco(relacion: AlumnoApoderado, parentescoId: number): void {
        if (!relacion.id || relacion.parentescoId === parentescoId) {
            return;
        }

        this.updatingIds.add(relacion.id);

        this.alumnoApoderadoService
            .updateLink(relacion.id, parentescoId)
            .pipe(
                finalize(() => {
                    this.updatingIds.delete(relacion.id!);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe((updated) => {
                const current = this.relaciones$.value.map((item) =>
                    item.id === updated.id ? updated : item
                );
                this.relaciones$.next(current);
                this.snackBar.open('Vínculo actualizado correctamente.', 'Cerrar', {
                    duration: 4000,
                });
            });
    }

    protected unlink(relacion: AlumnoApoderado): void {
        if (!relacion.id) {
            return;
        }

        const confirmed = window.confirm('¿Desea desvincular al apoderado seleccionado?');
        if (!confirmed) {
            return;
        }

        this.updatingIds.add(relacion.id);

        this.alumnoApoderadoService
            .unlink(relacion.id)
            .pipe(
                finalize(() => this.updatingIds.delete(relacion.id!)),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                const remaining = this.relaciones$.value.filter(
                    (item) => item.id !== relacion.id
                );
                this.relaciones$.next(remaining);
                this.snackBar.open('Apoderado desvinculado correctamente.', 'Cerrar', {
                    duration: 4000,
                });
            });
    }

    protected trackByRelacionId(index: number, item: AlumnoApoderado): number {
        return item.id;
    }

    protected trackByParentescoId(index: number, item: Parentesco): number {
        return item.id;
    }

    protected isUpdating(relacion: AlumnoApoderado): boolean {
        return relacion.id != null && this.updatingIds.has(relacion.id);
    }

    protected close(): void {
        this.dialogRef.close();
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

    private loadRelaciones(): void {
        this.isLoading$.next(true);
        this.relaciones$.next([]);

        this.alumnoApoderadoService
            .listByAlumno(this.data.id)
            .pipe(
                switchMap((relaciones) => {
                    if (!relaciones.length) {
                        return of(relaciones);
                    }

                    const requests = relaciones.map((relacion) =>
                        this.apoderadosService.get(relacion.apoderadoId).pipe(
                            map((apoderado) => ({
                                ...relacion,
                                apoderado,
                            }))
                        )
                    );

                    return forkJoin(requests);
                }),
                catchError(() => {
                    this.snackBar.open(
                        'No se pudieron cargar los apoderados del alumno.',
                        'Cerrar',
                        {
                            duration: 4000,
                        }
                    );

                    return of<AlumnoApoderado[]>([]);
                }),
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((relaciones) => {
                this.relaciones$.next(relaciones);
            });
    }

    private linkApoderado(result: ApoderadoFormDialogResult): void {
        this.isLoading$.next(true);
        this.alumnoApoderadoService
            .link(this.data.id, result.apoderado.id, result.parentescoId)
            .pipe(
                finalize(() => this.isLoading$.next(false)),
                takeUntil(this.destroy$)
            )
            .subscribe((relacion) => {
                const relationWithApoderado: AlumnoApoderado = {
                    ...relacion,
                    apoderado: result.apoderado,
                };
                const current = [relationWithApoderado, ...this.relaciones$.value];
                this.relaciones$.next(current);
                this.snackBar.open('Apoderado vinculado correctamente.', 'Cerrar', {
                    duration: 4000,
                });
            });
    }
}