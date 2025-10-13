import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Especialidad } from 'app/core/models/centro-estudios/especialidad.model';

export interface EspecialidadesActionsCellParams extends ICellRendererParams<Especialidad> {
    onEdit?: (especialidad: Especialidad) => void;
}

@Component({
    selector: 'app-especialidades-actions-cell',
    standalone: true,
    templateUrl: './especialidades-actions-cell.component.html',
    styleUrls: ['./especialidades-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class EspecialidadesActionsCellComponent implements ICellRendererAngularComp {
    private params?: EspecialidadesActionsCellParams;

    agInit(params: EspecialidadesActionsCellParams): void {
        this.params = params;
    }

    refresh(params: EspecialidadesActionsCellParams): boolean {
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
