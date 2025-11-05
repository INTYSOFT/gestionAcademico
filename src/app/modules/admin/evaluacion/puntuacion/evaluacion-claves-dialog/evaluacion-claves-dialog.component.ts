import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BehaviorSubject, Subscription, finalize, forkJoin, switchMap, take } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EvaluacionProgramada } from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { EvaluacionDetalle } from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import {
  CreateEvaluacionClavePayload,
  EvaluacionClave,
  UpdateEvaluacionClavePayload,
} from 'app/core/models/centro-estudios/evaluacion-clave.model';
import { EvaluacionClavesService } from 'app/core/services/centro-estudios/evaluacion-claves.service';

type InvalidRespuesta = { type: 'pregunta' | 'registro'; value: number };

enum TablaColumna {
  PreguntaOrden = 'preguntaOrden',
  Respuesta = 'respuesta',
}

export interface EvaluacionClavesDialogData {
  evaluacion: EvaluacionProgramada;
  detalle: EvaluacionDetalle;
}

export type EvaluacionClavesDialogResult = {
  action: 'saved';
  claves: EvaluacionClave[];
};

type EvaluacionClaveFormGroup = FormGroup<{
  id: FormControl<number | null>;
  evaluacionProgramadaId: FormControl<number>;
  evaluacionDetalleId: FormControl<number>;
  preguntaOrden: FormControl<number>;
  respuesta: FormControl<string>;
  ponderacion: FormControl<number | null>;
  version: FormControl<number>;
  vigente: FormControl<boolean>;
  observacion: FormControl<string | null>;
  activo: FormControl<boolean>;
  sedeId: FormControl<number | null>;
  cicloId: FormControl<number | null>;
  seccionId: FormControl<number | null>;
}>;

interface EvaluacionClaveFormValue {
  id: number | null;
  evaluacionProgramadaId: number;
  evaluacionDetalleId: number;
  preguntaOrden: number;
  respuesta: string;
  ponderacion: number | null;
  version: number;
  vigente: boolean;
  observacion: string | null;
  activo: boolean;
  sedeId: number | null;
  cicloId: number | null;
  seccionId: number | null;
}

@Component({
  selector: 'app-evaluacion-claves-dialog',
  standalone: true,
  templateUrl: './evaluacion-claves-dialog.component.html',
  styleUrls: ['./evaluacion-claves-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class EvaluacionClavesDialogComponent implements OnInit, OnDestroy {
  protected readonly detalle = this.data.detalle;
  protected readonly evaluacion = this.data.evaluacion;

  // Config opcional: si true, al presionar Enter en la última fila se crea una nueva.
  private readonly autoAddOnLastEnter = false;

  private readonly formArray = this.fb.array<EvaluacionClaveFormGroup>([]);
  protected readonly form = this.fb.group({ claves: this.formArray });

  protected readonly columnas = TablaColumna;
  protected readonly displayedColumns: TablaColumna[] = [
    TablaColumna.PreguntaOrden,
    TablaColumna.Respuesta,
  ];
  protected readonly headerMap: Record<TablaColumna, string> = {
    [TablaColumna.PreguntaOrden]: 'Pregunta',
    [TablaColumna.Respuesta]: 'Respuesta',
  };

  protected readonly isLoading$ = new BehaviorSubject<boolean>(false);
  protected readonly isSaving$ = new BehaviorSubject<boolean>(false);

  private readonly deletedIds = new Set<number>();
  private readonly initialValueMap = new Map<number, EvaluacionClaveFormValue>();
  private readonly subscriptions = new Subscription();

  protected activeRowIndex: number | null = null;

  @ViewChildren('ordenInput', { read: ElementRef })
  private readonly ordenInputs?: QueryList<ElementRef<HTMLInputElement>>;

  @ViewChildren('respuestaInput', { read: ElementRef })
  private readonly respuestaInputs?: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    @Inject(MAT_DIALOG_DATA) private readonly data: EvaluacionClavesDialogData,
    private readonly dialogRef: MatDialogRef<
      EvaluacionClavesDialogComponent,
      EvaluacionClavesDialogResult | undefined
    >,
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly evaluacionClavesService: EvaluacionClavesService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {
    this.subscriptions.add(this.isSaving$.subscribe(() => this.cdr.markForCheck()));
  }

  get clavesForm(): FormArray<EvaluacionClaveFormGroup> {
    return this.form.get('claves') as FormArray<EvaluacionClaveFormGroup>;
  }

  ngOnInit(): void {
    this.loadClaves();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ----------------------------
  // Navegación y fila activa
  // ----------------------------

  protected setActiveRow(index: number): void {
    this.activeRowIndex = index;
  }

  protected onOrdenEnter(event: KeyboardEvent, rowIndex: number): void {
    if ((event as any).repeat) { event.preventDefault(); return; }
    event.preventDefault();
    event.stopPropagation();
    this.navigateToNextRow(rowIndex, TablaColumna.PreguntaOrden);
  }

  protected onRespuestaEnter(event: KeyboardEvent, rowIndex: number): void {
    if ((event as any).repeat) { event.preventDefault(); return; }
    event.preventDefault();
    event.stopPropagation();
    this.navigateToNextRow(rowIndex, TablaColumna.Respuesta);
  }

  private navigateToNextRow(currentRowIndex: number, column: TablaColumna): void {
    const nextIndex = currentRowIndex + 1;
    if (nextIndex >= this.clavesForm.length) {
      if (this.autoAddOnLastEnter) {
        this.addClave({ focusColumn: column, activeRow: true });
      }
      return; // si no auto-Agregar, no hay siguiente
    }
    this.focusField(nextIndex, column);
  }

  private focusField(rowIndex: number, column: TablaColumna): void {
    this.activeRowIndex = rowIndex;
    this.cdr.detectChanges();
    this.zone.onStable.pipe(take(1)).subscribe(() => {
      if (column === TablaColumna.PreguntaOrden) {
        const el = this.ordenInputs?.toArray()[rowIndex]?.nativeElement;
        el?.focus();
        el?.select();
        return;
      }
      if (column === TablaColumna.Respuesta) {
        const el = this.respuestaInputs?.toArray()[rowIndex]?.nativeElement;
        el?.focus();
        el?.select();
        return;
      }
    });
  }

  // ----------------------------
  // Respuesta: validación/saneo
  // ----------------------------

  protected onRespuestaKeydown(event: KeyboardEvent): void {
    // Permitir teclas de control/edición
    const controlKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
    if (controlKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter') return;

    const k = event.key.toUpperCase();
    if (!/^[A-H]$/.test(k)) {
      event.preventDefault();
    }
  }

  protected onRespuestaInput(event: Event, rowIndex: number): void {
    const input = event.target as HTMLInputElement;
    const raw = (input.value ?? '').toUpperCase();
    // Mantener solo primera letra A–H
    const match = raw.match(/[A-H]/);
    const sanitized = match ? match[0] : '';
    if (input.value !== sanitized) {
      input.value = sanitized;
    }
    const control = this.clavesForm.at(rowIndex)?.controls.respuesta;
    if (control && control.value !== sanitized) {
      control.setValue(sanitized);
      control.markAsDirty();
      control.markAsTouched();
    }
  }

  // ----------------------------
  // CRUD en UI
  // ----------------------------

  protected addClave(options?: { focusColumn?: TablaColumna; activeRow?: boolean }): void {
    const nextOrden = this.calculateNextPreguntaOrden();
    const value = this.buildFormValue({ preguntaOrden: nextOrden });
    const group = this.createClaveGroup(value);
    this.clavesForm.push(group);

    // Enfoque opcional
    if (options?.focusColumn) {
      const ri = this.clavesForm.length - 1;
      if (options?.activeRow) this.activeRowIndex = ri;
      this.focusField(ri, options.focusColumn);
    } else {
      this.cdr.markForCheck();
    }
  }

  protected removeClaveByIndex(index: number): void {
    if (this.isSaving$.value) return;
    this.removeClave(index);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected save(): void {
    if (this.isSaving$.value) return;

    if (this.clavesForm.length === 0) {
      this.snackBar.open('Agrega al menos una clave antes de guardar.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.clavesForm.controls.forEach((control) => control.markAllAsTouched());
    this.ensureRespuestasUppercase();

    const invalidRespuestas = this.findInvalidRespuestas();
    if (invalidRespuestas.length > 0) {
      const message = this.formatInvalidRespuestasMessage(invalidRespuestas);
      this.snackBar.open(message, 'Cerrar', { duration: 6000 });
      return;
    }

    if (this.clavesForm.invalid) return;

    const duplicates = this.findDuplicatedOrdenes();
    if (duplicates.length > 0) {
      const label = duplicates.length === 1 ? 'pregunta' : 'preguntas';
      this.snackBar.open(
        `El orden de ${label} ${duplicates.join(', ')} está duplicado. Corrige antes de guardar.`,
        'Cerrar',
        { duration: 6000 }
      );
      return;
    }

    const creations: EvaluacionClaveFormValue[] = [];
    const updates: EvaluacionClaveFormValue[] = [];

    for (const control of this.clavesForm.controls) {
      const value = this.normalizeFormValue(control.getRawValue());
      if (value.id === null) {
        creations.push(value);
        continue;
      }
      const initial = this.initialValueMap.get(value.id);
      if (!initial || this.hasChanges(initial, value)) {
        updates.push(value);
      }
    }

    const deletions = Array.from(this.deletedIds);
    if (creations.length === 0 && updates.length === 0 && deletions.length === 0) {
      this.dialogRef.close();
      return;
    }

    const requests = [
      ...creations.map((v) => this.evaluacionClavesService.create(this.mapToCreatePayload(v))),
      ...updates.map((v) => this.evaluacionClavesService.update(v.id!, this.mapToUpdatePayload(v))),
      ...deletions.map((id) => this.evaluacionClavesService.delete(id)),
    ];

    this.isSaving$.next(true);

    forkJoin(requests)
      .pipe(
        switchMap(() => this.evaluacionClavesService.listByEvaluacionDetalle(this.detalle.id)),
        finalize(() => this.isSaving$.next(false))
      )
      .subscribe({
        next: (claves) => {
          this.snackBar.open('Claves guardadas correctamente.', 'Cerrar', { duration: 4000 });
          this.dialogRef.close({ action: 'saved', claves });
        },
        error: (error) => {
          this.snackBar.open(
            error.message ?? 'No fue posible guardar las claves de evaluación.',
            'Cerrar',
            { duration: 6000 }
          );
        },
      });
  }

  // ----------------------------
  // Utilidades y mapeos (sin cambios conceptuales)
  // ----------------------------

  get claves(): EvaluacionClaveFormGroup[] {
    return this.clavesForm.controls;
  }

  private removeClave(index: number): void {
    const group = this.clavesForm.at(index);
    if (!group) return;
    const id = group.controls.id.value;
    if (id !== null && id !== undefined) {
      this.deletedIds.add(id);
      this.initialValueMap.delete(id);
    }
    this.clavesForm.removeAt(index);
    this.cdr.markForCheck();
  }

  private loadClaves(): void {
    this.isLoading$.next(true);
    this.evaluacionClavesService
      .listByEvaluacionDetalle(this.detalle.id)
      .pipe(finalize(() => this.isLoading$.next(false)))
      .subscribe({
        next: (claves) => {
          if (claves.length === 0) {
            this.populateFormWithDefaults();
          } else {
            this.populateFormWithClaves(claves);
          }
        },
        error: (error) => {
          this.snackBar.open(
            error.message ?? 'No fue posible cargar las claves de evaluación.',
            'Cerrar',
            { duration: 5000 }
          );
          this.populateFormWithDefaults();
        },
      });
  }

  private populateFormWithClaves(claves: EvaluacionClave[]): void {
    this.resetFormState();
    const sorted = [...claves].sort((a, b) => a.preguntaOrden - b.preguntaOrden);
    for (const clave of sorted) {
      const value = this.mapEntityToFormValue(clave);
      this.initialValueMap.set(clave.id, value);
      this.clavesForm.push(this.createClaveGroup(value));
    }
    this.cdr.markForCheck();
  }

  private populateFormWithDefaults(): void {
    this.resetFormState();
    const defaults = this.generateDefaultClaves();
    if (defaults.length === 0) {
      this.snackBar.open('No fue posible generar claves automáticas para el rango configurado.', 'Cerrar', { duration: 5000 });
      return;
    }
    for (const value of defaults) {
      this.clavesForm.push(this.createClaveGroup(value));
    }
    this.cdr.markForCheck();
  }

  private resetFormState(): void {
    this.deletedIds.clear();
    this.initialValueMap.clear();
    this.clavesForm.clear();
    this.cdr.markForCheck();
  }

  private createClaveGroup(value: EvaluacionClaveFormValue): EvaluacionClaveFormGroup {
    return this.fb.group({
      id: [value.id],
      evaluacionProgramadaId: [value.evaluacionProgramadaId, [Validators.required]],
      evaluacionDetalleId: [value.evaluacionDetalleId, [Validators.required]],
      preguntaOrden: [value.preguntaOrden, [Validators.required, Validators.min(0)]],
      respuesta: [value.respuesta, [Validators.required, Validators.pattern(/^[A-H]$/)]],
      ponderacion: [value.ponderacion],
      version: [value.version, [Validators.required, Validators.min(1)]],
      vigente: [value.vigente],
      observacion: [value.observacion],
      activo: [value.activo],
      sedeId: [value.sedeId],
      cicloId: [value.cicloId],
      seccionId: [value.seccionId],
    }) as EvaluacionClaveFormGroup;
  }

  private buildFormValue(partial?: Partial<EvaluacionClaveFormValue>): EvaluacionClaveFormValue {
    const base: EvaluacionClaveFormValue = {
      id: null,
      evaluacionProgramadaId: this.evaluacion.id,
      evaluacionDetalleId: this.detalle.id,
      preguntaOrden: this.detalle.rangoInicio,
      respuesta: '',
      ponderacion: null,
      version: 1,
      vigente: true,
      observacion: null,
      activo: true,
      sedeId: this.evaluacion.sedeId ?? null,
      cicloId: this.evaluacion.cicloId ?? null,
      seccionId: this.detalle.seccionId ?? null,
    };
    return { ...base, ...partial };
  }

  private generateDefaultClaves(): EvaluacionClaveFormValue[] {
    const inicio = this.detalle.rangoInicio;
    const fin = this.detalle.rangoFin;

    if (
      inicio === null || inicio === undefined ||
      fin === null || fin === undefined ||
      !Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio
    ) {
      return [];
    }

    const valores: EvaluacionClaveFormValue[] = [];
    for (let orden = inicio; orden <= fin; orden++) {
      valores.push(this.buildFormValue({ preguntaOrden: orden }));
    }
    return valores;
  }

  private mapEntityToFormValue(entity: EvaluacionClave): EvaluacionClaveFormValue {
    return {
      id: entity.id,
      evaluacionProgramadaId: entity.evaluacionProgramadaId,
      evaluacionDetalleId: entity.evaluacionDetalleId,
      preguntaOrden: entity.preguntaOrden,
      respuesta: (entity.respuesta ?? '').toString().toUpperCase(),
      ponderacion: entity.ponderacion ?? null,
      version: entity.version ?? 1,
      vigente: entity.vigente,
      observacion: entity.observacion ?? null,
      activo: entity.activo,
      sedeId: entity.sedeId ?? null,
      cicloId: entity.cicloId ?? null,
      seccionId: entity.seccionId ?? null,
    };
  }

  private normalizeFormValue(value: EvaluacionClaveFormValue): EvaluacionClaveFormValue {
    const respuesta = (value.respuesta ?? '').toString().trim().toUpperCase();
    return {
      ...value,
      preguntaOrden: Number(value.preguntaOrden),
      respuesta,
      ponderacion:
        value.ponderacion === null || value.ponderacion === undefined ? null : Number(value.ponderacion),
      observacion:
        value.observacion && value.observacion.trim().length > 0 ? value.observacion.trim() : null,
    };
  }

  private hasChanges(initial: EvaluacionClaveFormValue, current: EvaluacionClaveFormValue): boolean {
    return (
      initial.preguntaOrden !== current.preguntaOrden ||
      initial.respuesta !== current.respuesta ||
      initial.ponderacion !== current.ponderacion ||
      initial.version !== current.version ||
      initial.vigente !== current.vigente ||
      initial.observacion !== current.observacion ||
      initial.activo !== current.activo ||
      initial.sedeId !== current.sedeId ||
      initial.cicloId !== current.cicloId ||
      initial.seccionId !== current.seccionId
    );
  }

  private mapToCreatePayload(value: EvaluacionClaveFormValue): CreateEvaluacionClavePayload {
    return {
      evaluacionProgramadaId: value.evaluacionProgramadaId,
      evaluacionDetalleId: value.evaluacionDetalleId,
      preguntaOrden: value.preguntaOrden,
      respuesta: value.respuesta,
      ponderacion: value.ponderacion,
      version: value.version,
      vigente: value.vigente,
      observacion: value.observacion,
      activo: value.activo,
      sedeId: value.sedeId,
      cicloId: value.cicloId,
      seccionId: value.seccionId,
    };
  }

  private mapToUpdatePayload(value: EvaluacionClaveFormValue): UpdateEvaluacionClavePayload {
    return this.mapToCreatePayload(value);
  }

  private calculateNextPreguntaOrden(): number {
    const ordenes = this.clavesForm.controls
      .map((c) => Number(c.controls.preguntaOrden.value))
      .filter((orden) => Number.isFinite(orden));

    if (ordenes.length === 0) {
      const inicio = this.detalle.rangoInicio;
      return Number.isFinite(inicio) ? Number(inicio) : 1;
    }

    return Math.max(...ordenes) + 1;
  }

  private findDuplicatedOrdenes(): number[] {
    const counts = new Map<number, number>();
    for (const control of this.clavesForm.controls) {
      const orden = Number(control.controls.preguntaOrden.value);
      if (!Number.isFinite(orden)) continue;
      counts.set(orden, (counts.get(orden) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([orden]) => orden)
      .sort((a, b) => a - b);
  }

  private ensureRespuestasUppercase(): void {
    this.clavesForm.controls.forEach((control) => {
      const respuestaControl = control.controls.respuesta;
      const normalized = (respuestaControl.value ?? '').toString().trim().toUpperCase();
      if (respuestaControl.value !== normalized) {
        respuestaControl.setValue(normalized, { emitEvent: false });
        respuestaControl.markAsDirty();
      }
      respuestaControl.markAsTouched();
      respuestaControl.updateValueAndValidity({ emitEvent: false });
    });
    this.cdr.markForCheck();
  }

  private findInvalidRespuestas(): InvalidRespuesta[] {
    const invalid: InvalidRespuesta[] = [];
    this.clavesForm.controls.forEach((control, index) => {
      const value = (control.controls.respuesta.value ?? '').toString().trim().toUpperCase();
      if (/^[A-H]$/.test(value)) return;

      const preguntaOrden = Number(control.controls.preguntaOrden.value);
      if (Number.isFinite(preguntaOrden)) {
        invalid.push({ type: 'pregunta', value: preguntaOrden });
      } else {
        invalid.push({ type: 'registro', value: index + 1 });
      }
    });
    return invalid;
  }

  private formatInvalidRespuestasMessage(invalid: InvalidRespuesta[]): string {
    const preguntas = invalid.filter(i => i.type === 'pregunta').map(i => i.value).sort((a, b) => a - b);
    const registros = invalid.filter(i => i.type === 'registro').map(i => i.value).sort((a, b) => a - b);

    const messages: string[] = [];
    if (preguntas.length > 0) {
      const label = preguntas.length === 1 ? 'La respuesta de la pregunta' : 'Las respuestas de las preguntas';
      messages.push(`${label} ${preguntas.join(', ')} deben estar entre A y H.`);
    }
    if (registros.length > 0) {
      const label = registros.length === 1 ? 'La respuesta del registro' : 'Las respuestas de los registros';
      messages.push(`${label} ${registros.join(', ')} deben estar entre A y H.`);
    }
    return messages.length === 0
      ? 'Verifica que todas las respuestas tengan un valor entre A y H.'
      : messages.join(' ');
  }
}
