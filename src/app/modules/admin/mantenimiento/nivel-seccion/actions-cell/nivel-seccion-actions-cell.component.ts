import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Nivel } from 'app/core/models/centro-estudios/nivel.model';

export interface NivelSeccionActionsCellParams extends ICellRendererParams<Nivel> {
    onEdit?: (nivel: Nivel) => void;
}

@Component({
    selector: 'app-nivel-seccion-actions-cell',
    standalone: true,
    templateUrl: './nivel-seccion-actions-cell.component.html',
    styleUrls: ['./nivel-seccion-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class NivelSeccionActionsCellComponent implements ICellRendererAngularComp {
    private params?: NivelSeccionActionsCellParams;

    agInit(params: NivelSeccionActionsCellParams): void {
        this.params = params;
    }

    refresh(params: NivelSeccionActionsCellParams): boolean {
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
