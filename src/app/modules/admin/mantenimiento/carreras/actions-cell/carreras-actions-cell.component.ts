import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Carrera } from 'app/core/models/centro-estudios/carrera.model';

export interface CarrerasActionsCellParams extends ICellRendererParams<Carrera> {
    onEdit?: (carrera: Carrera) => void;
}

@Component({
    selector: 'app-carreras-actions-cell',
    standalone: true,
    templateUrl: './carreras-actions-cell.component.html',
    styleUrls: ['./carreras-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CarrerasActionsCellComponent implements ICellRendererAngularComp {
    private params?: CarrerasActionsCellParams;

    agInit(params: CarrerasActionsCellParams): void {
        this.params = params;
    }

    refresh(params: CarrerasActionsCellParams): boolean {
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
