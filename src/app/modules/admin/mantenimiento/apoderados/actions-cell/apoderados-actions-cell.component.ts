import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Apoderado } from 'app/core/models/centro-estudios/apoderado.model';

interface ApoderadosActionsCellParams extends ICellRendererParams<Apoderado> {
    onEdit?: (apoderado: Apoderado) => void;
}

@Component({
    selector: 'app-apoderados-actions-cell',
    standalone: true,
    templateUrl: './apoderados-actions-cell.component.html',
    styleUrls: ['./apoderados-actions-cell.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class ApoderadosActionsCellComponent implements ICellRendererAngularComp {
    private params?: ApoderadosActionsCellParams;

    agInit(params: ApoderadosActionsCellParams): void {
        this.params = params;
    }

    refresh(params: ApoderadosActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected handleEdit(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onEdit?.(this.params.data);
    }
}
