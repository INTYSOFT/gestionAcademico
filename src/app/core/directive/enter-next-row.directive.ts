import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { MatSelect } from '@angular/material/select';

export type EnterNextRowColumn = 'preguntaOrden' | 'respuesta';

export interface EnterNextRowEvent {
  rowIndex: number;
  column: EnterNextRowColumn;
}

@Directive({
  selector: '[appEnterNextRow]',
  standalone: true,
})
export class EnterNextRowDirective {
  /** Índice de la fila actual */
  @Input({ required: true }) appEnterNextRowRow!: number;

  /** Columna actual: 'preguntaOrden' | 'respuesta' */
  @Input({ required: true }) appEnterNextRowColumn!: EnterNextRowColumn;

  /** Referencia opcional a MatSelect para respetar su panel */
  @Input() appEnterNextRowMatSelect?: MatSelect;

  /** Evento emitido cuando se debe ir a la siguiente fila */
  @Output() enterNextRow = new EventEmitter<EnterNextRowEvent>();

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent): void {
    // Si el usuario mantiene la tecla presionada, evita repeticiones involuntarias
    if ((event as any).repeat) {
      event.preventDefault();
      return;
    }

    // Si es un mat-select y el panel está abierto, no interferir (Enter confirma selección)
    if (this.appEnterNextRowMatSelect?.panelOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.enterNextRow.emit({
      rowIndex: this.appEnterNextRowRow,
      column: this.appEnterNextRowColumn,
    });
  }
}
