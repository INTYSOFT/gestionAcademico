import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { EvaluacionTipoPregunta } from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';

export interface CompetenciasPreguntasActionsCellParams
    extends ICellRendererParams<EvaluacionTipoPregunta> {
    onEdit?: (evaluacionTipoPregunta: EvaluacionTipoPregunta) => void;
}

@Component({
    selector: 'app-competencias-preguntas-actions-cell',
    standalone: true,
    templateUrl: './competencias-preguntas-actions-cell.component.html',
    styleUrls: ['./competencias-preguntas-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CompetenciasPreguntasActionsCellComponent implements ICellRendererAngularComp {
    private params?: CompetenciasPreguntasActionsCellParams;

    agInit(params: CompetenciasPreguntasActionsCellParams): void {
        this.params = params;
    }

    refresh(params: CompetenciasPreguntasActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected edit(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onEdit?.(this.params.data);
    }
}
