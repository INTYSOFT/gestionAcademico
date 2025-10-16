import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ConceptoTipo } from 'app/core/models/centro-estudios/concepto-tipo.model';

export interface TipoConceptoActionsCellParams extends ICellRendererParams<ConceptoTipo> {
    onEdit?: (conceptoTipo: ConceptoTipo) => void;
}

@Component({
    selector: 'app-tipo-concepto-actions-cell',
    standalone: true,
    templateUrl: './tipo-concepto-actions-cell.component.html',
    styleUrls: ['./tipo-concepto-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class TipoConceptoActionsCellComponent implements ICellRendererAngularComp {
    private params?: TipoConceptoActionsCellParams;

    agInit(params: TipoConceptoActionsCellParams): void {
        this.params = params;
    }

    refresh(params: TipoConceptoActionsCellParams): boolean {
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
