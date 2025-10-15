import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';

export interface CiclosActionsCellParams extends ICellRendererParams<Ciclo> {
    onEdit?: (ciclo: Ciclo) => void;
    onOpenApertura?: (ciclo: Ciclo) => void;
}

@Component({
    selector: 'app-ciclos-actions-cell',
    standalone: true,
    templateUrl: './ciclos-actions-cell.component.html',
    styleUrls: ['./ciclos-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CiclosActionsCellComponent implements ICellRendererAngularComp {
    private params?: CiclosActionsCellParams;

    agInit(params: CiclosActionsCellParams): void {
        this.params = params;
    }

    refresh(params: CiclosActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected edit(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onEdit?.(this.params.data);
    }

    protected openApertura(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onOpenApertura?.(this.params.data);
    }
}
