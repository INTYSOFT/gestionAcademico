import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import type {
    EvaluacionProgramacionRow,
    EvaluacionProgramacionSeccionRow,
} from '../evaluacion-programar.component';

@Component({
    selector: 'app-evaluacion-programar-secciones-cell',
    standalone: true,
    templateUrl: './evaluacion-programar-secciones-cell.component.html',
    styleUrls: ['./evaluacion-programar-secciones-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, MatIconModule, MatTooltipModule],
})
export class EvaluacionProgramarSeccionesCellComponent implements ICellRendererAngularComp {
    protected secciones: EvaluacionProgramacionSeccionRow[] = [];

    agInit(params: ICellRendererParams<EvaluacionProgramacionRow>): void {
        this.secciones = params.data?.secciones ?? [];
    }

    refresh(params: ICellRendererParams<EvaluacionProgramacionRow>): boolean {
        this.secciones = params.data?.secciones ?? [];
        return true;
    }
}
