import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { DateTime } from 'luxon';
import { EvaluacionProgramadaDialogComponent, EvaluacionProgramadaDialogData } from './evaluacion-programada-dialog.component';
import { EvaluacionProgramadasService } from 'app/core/services/centro-estudios/evaluacion-programadas.service';
import { EvaluacionProgramadaSeccionesService } from 'app/core/services/centro-estudios/evaluacion-programada-secciones.service';
import { SedeService } from 'app/core/services/centro-estudios/sede.service';
import { CiclosService } from 'app/core/services/centro-estudios/ciclos.service';
import { TipoEvaluacionesService } from 'app/core/services/centro-estudios/tipo-evaluaciones.service';
import { CarrerasService } from 'app/core/services/centro-estudios/carreras.service';
import { SeccionesService } from 'app/core/services/centro-estudios/secciones.service';
import { AperturaCicloService } from 'app/core/services/centro-estudios/apertura-ciclo.service';
import { SeccionCicloService } from 'app/core/services/centro-estudios/seccion-ciclo.service';
import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionProgramadaSeccion } from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';

describe('EvaluacionProgramadaDialogComponent', () => {
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EvaluacionProgramadaDialogComponent>>;
    let evaluacionServiceSpy: jasmine.SpyObj<EvaluacionProgramadasService>;
    let seccionesServiceSpy: jasmine.SpyObj<EvaluacionProgramadaSeccionesService>;

    function setupTestBed(dataOverrides: Partial<EvaluacionProgramadaDialogData> = {}) {
        const data: EvaluacionProgramadaDialogData = {
            mode: 'create',
            existingProgramaciones: [],
            evaluacion: null,
            secciones: [],
            ...dataOverrides,
        };

        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        dialogRefSpy.disableClose = true;
        evaluacionServiceSpy = jasmine.createSpyObj('EvaluacionProgramadasService', ['create', 'update']);
        seccionesServiceSpy = jasmine.createSpyObj('EvaluacionProgramadaSeccionesService', ['create', 'update']);

        evaluacionServiceSpy.create.and.returnValue(
            of({
                id: 1,
                sedeId: 10,
                cicloId: 100,
                tipoEvaluacionId: 5,
                nombre: 'Evaluación',
                fechaInicio: '2024-06-10',
                horaInicio: '08:00:00',
                horaFin: '09:30:00',
                carreraId: null,
                activo: true,
                fechaRegistro: null,
                fechaActualizacion: null,
                usuaraioRegistroId: null,
                usuaraioActualizacionId: null,
            } satisfies EvaluacionProgramada)
        );

        seccionesServiceSpy.create.and.callFake((payload) =>
            of({
                id: 1,
                evaluacionProgramadaId: payload.evaluacionProgramadaId,
                seccionCicloId: payload.seccionCicloId,
                seccionId: payload.seccionId,
                activo: true,
                fechaRegistro: null,
                fechaActualizacion: null,
            } satisfies EvaluacionProgramadaSeccion)
        );

        TestBed.configureTestingModule({
            imports: [EvaluacionProgramadaDialogComponent],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: EvaluacionProgramadasService, useValue: evaluacionServiceSpy },
                { provide: EvaluacionProgramadaSeccionesService, useValue: seccionesServiceSpy },
                { provide: SedeService, useValue: createSedeServiceMock() },
                { provide: CiclosService, useValue: createCiclosServiceMock() },
                { provide: TipoEvaluacionesService, useValue: createTiposServiceMock() },
                { provide: CarrerasService, useValue: createCarrerasServiceMock() },
                { provide: SeccionesService, useValue: createSeccionesCatalogServiceMock() },
                { provide: AperturaCicloService, useValue: createAperturaCicloServiceMock() },
                { provide: SeccionCicloService, useValue: createSeccionCicloServiceMock() },
            ],
        }).compileComponents();
    }

    it('should invoke create flow when saving a new record', fakeAsync(() => {
        setupTestBed();
        const fixture = TestBed.createComponent(EvaluacionProgramadaDialogComponent);
        const component = fixture.componentInstance as EvaluacionProgramadaDialogComponent & {
            form: unknown;
        };

        fixture.detectChanges();
        tick();

        const form = (component as any).form as any;
        form.controls['nombre'].setValue('Evaluación Parcial');
        form.controls['tipoEvaluacionId'].setValue(5);
        form.controls['sedeId'].setValue(10);
        tick();

        form.controls['cicloId'].setValue(100);
        tick();

        form.controls['fechaInicio'].setValue(DateTime.fromISO('2024-06-10'));
        form.controls['horaInicio'].setValue('08:00');
        form.controls['horaFin'].setValue('09:30');
        form.controls['seccionCicloIds'].setValue([1000]);

        (component as any).submitForm();
        tick();

        expect(evaluacionServiceSpy.create).toHaveBeenCalledTimes(1);
        expect(seccionesServiceSpy.create).toHaveBeenCalledTimes(1);
        expect(dialogRefSpy.close).toHaveBeenCalledTimes(1);
    }));

    it('should flag fechaInicio as duplicated when same fecha and ciclo exist', fakeAsync(() => {
        setupTestBed({
            existingProgramaciones: [
                {
                    fechaInicio: '2024-06-10',
                    cicloId: 100,
                },
            ],
        });

        const fixture = TestBed.createComponent(EvaluacionProgramadaDialogComponent);
        const component = fixture.componentInstance as EvaluacionProgramadaDialogComponent & {
            form: unknown;
        };

        fixture.detectChanges();
        tick();

        const form = (component as any).form as any;
        form.controls['sedeId'].setValue(10);
        tick();

        form.controls['cicloId'].setValue(100);
        tick();

        form.controls['fechaInicio'].setValue(DateTime.fromISO('2024-06-10'));
        tick();

        expect(form.controls['fechaInicio'].hasError('fechaDuplicada')).toBeTrue();
    }));
});

function createSedeServiceMock(): Pick<SedeService, 'getSedes'> {
    return {
        getSedes: () => of([{ id: 10, nombre: 'Central', activo: true }]),
    };
}

function createCiclosServiceMock(): Pick<CiclosService, 'listAll'> {
    return {
        listAll: () =>
            of([
                {
                    id: 100,
                    nombre: '2024-I',
                    activo: true,
                    fechaAperturaInscripcion: '2024-01-01',
                    fechaCierreInscripcion: '2024-12-31',
                },
            ]),
    };
}

function createTiposServiceMock(): Pick<TipoEvaluacionesService, 'listAll'> {
    return {
        listAll: () => of([{ id: 5, nombre: 'Parcial', activo: true }]),
    };
}

function createCarrerasServiceMock(): Pick<CarrerasService, 'list'> {
    return {
        list: () => of([]),
    };
}

function createSeccionesCatalogServiceMock(): Pick<SeccionesService, 'list'> {
    return {
        list: () => of([{ id: 200, nombre: 'A', activo: true }]),
    };
}

function createAperturaCicloServiceMock(): Pick<AperturaCicloService, 'listBySede'> {
    return {
        listBySede: () => of([{ id: 1, cicloId: 100, activo: true }]),
    };
}

function createSeccionCicloServiceMock(): Pick<SeccionCicloService, 'listBySedeAndCiclo'> {
    return {
        listBySedeAndCiclo: () =>
            of([
                {
                    id: 1000,
                    cicloId: 100,
                    sedeId: 10,
                    seccionId: 200,
                    activo: true,
                },
            ]),
    };
}
