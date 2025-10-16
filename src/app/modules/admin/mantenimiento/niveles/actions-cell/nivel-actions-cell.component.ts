import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';

export interface NivelActionsCellParams extends ICellRendererParams<Nivel> {
    onEdit?: (nivel: Nivel) => void;
}

@Component({
    selector: 'app-nivel-actions-cell',
    standalone: true,
    templateUrl: './nivel-actions-cell.component.html',
    styleUrls: ['./nivel-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class NivelActionsCellComponent implements ICellRendererAngularComp {
    private params?: NivelActionsCellParams;

    agInit(params: NivelActionsCellParams): void {
        this.params = params;
    }

    refresh(params: NivelActionsCellParams): boolean {
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
