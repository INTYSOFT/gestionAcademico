import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import type { EvaluacionProgramacionRow } from '../evaluacion-programar.component';

export interface EvaluacionProgramarActionsCellParams
    extends ICellRendererParams<EvaluacionProgramacionRow> {
    onEdit?: (row: EvaluacionProgramacionRow) => void;
}

@Component({
    selector: 'app-evaluacion-programar-actions-cell',
    standalone: true,
    templateUrl: './evaluacion-programar-actions-cell.component.html',
    styleUrls: ['./evaluacion-programar-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class EvaluacionProgramarActionsCellComponent implements ICellRendererAngularComp {
    private params?: EvaluacionProgramarActionsCellParams;

    agInit(params: EvaluacionProgramarActionsCellParams): void {
        this.params = params;
    }

    refresh(params: EvaluacionProgramarActionsCellParams): boolean {
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
