import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Seccion } from 'app/core/models/centro-estudios/seccion.model';

export interface SeccionesActionsCellParams extends ICellRendererParams<Seccion> {
    onEdit?: (seccion: Seccion) => void;
}

@Component({
    selector: 'app-secciones-actions-cell',
    standalone: true,
    templateUrl: './secciones-actions-cell.component.html',
    styleUrls: ['./secciones-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class SeccionesActionsCellComponent implements ICellRendererAngularComp {
    private params?: SeccionesActionsCellParams;

    agInit(params: SeccionesActionsCellParams): void {
        this.params = params;
    }

    refresh(params: SeccionesActionsCellParams): boolean {
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
