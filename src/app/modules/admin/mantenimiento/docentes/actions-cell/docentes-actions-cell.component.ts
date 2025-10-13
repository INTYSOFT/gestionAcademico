import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Docente } from 'app/core/models/centro-estudios/docente.model';

export interface DocentesActionsCellParams extends ICellRendererParams<Docente> {
    onEdit?: (docente: Docente) => void;
}

@Component({
    selector: 'app-docentes-actions-cell',
    standalone: true,
    templateUrl: './docentes-actions-cell.component.html',
    styleUrls: ['./docentes-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class DocentesActionsCellComponent implements ICellRendererAngularComp {
    private params?: DocentesActionsCellParams;

    agInit(params: DocentesActionsCellParams): void {
        this.params = params;
    }

    refresh(params: DocentesActionsCellParams): boolean {
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
