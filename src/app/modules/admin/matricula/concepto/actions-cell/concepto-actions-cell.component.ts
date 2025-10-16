import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Concepto } from 'app/core/models/centro-estudios/concepto.model';

export interface ConceptoActionsCellParams extends ICellRendererParams<Concepto> {
    onEdit?: (concepto: Concepto) => void;
}

@Component({
    selector: 'app-concepto-actions-cell',
    standalone: true,
    templateUrl: './concepto-actions-cell.component.html',
    styleUrls: ['./concepto-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class ConceptoActionsCellComponent implements ICellRendererAngularComp {
    private params?: ConceptoActionsCellParams;

    agInit(params: ConceptoActionsCellParams): void {
        this.params = params;
    }

    refresh(params: ConceptoActionsCellParams): boolean {
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
