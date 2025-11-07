import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { EvaluacionDetalleDefatult } from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';

export interface EvaluacionDetalleDefatultActionsCellParams
    extends ICellRendererParams<EvaluacionDetalleDefatult> {
    onEdit?: (detalle: EvaluacionDetalleDefatult) => void;
}

@Component({
    selector: 'app-evaluacion-detalle-defatult-actions-cell',
    standalone: true,
    templateUrl: './evaluacion-detalle-defatult-actions-cell.component.html',
    styleUrls: ['./evaluacion-detalle-defatult-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class EvaluacionDetalleDefatultActionsCellComponent implements ICellRendererAngularComp {
    private params?: EvaluacionDetalleDefatultActionsCellParams;

    agInit(params: EvaluacionDetalleDefatultActionsCellParams): void {
        this.params = params;
    }

    refresh(params: EvaluacionDetalleDefatultActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected edit(): void {
        const detalle = this.params?.data;
        if (!detalle) {
            return;
        }

        this.params?.onEdit?.(detalle);
    }
}
