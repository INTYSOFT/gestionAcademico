import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TipoEvaluacion } from 'app/core/models/centro-estudios/tipo-evaluacion.model';

export interface TipoEvaluacionActionsCellParams extends ICellRendererParams<TipoEvaluacion> {
    onEdit?: (tipoEvaluacion: TipoEvaluacion) => void;
}

@Component({
    selector: 'app-tipo-evaluacion-actions-cell',
    standalone: true,
    templateUrl: './tipo-evaluacion-actions-cell.component.html',
    styleUrls: ['./tipo-evaluacion-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class TipoEvaluacionActionsCellComponent implements ICellRendererAngularComp {
    private params?: TipoEvaluacionActionsCellParams;

    agInit(params: TipoEvaluacionActionsCellParams): void {
        this.params = params;
    }

    refresh(params: TipoEvaluacionActionsCellParams): boolean {
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
