import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Curso } from 'app/core/models/centro-estudios/curso.model';

export interface CursosActionsCellParams extends ICellRendererParams<Curso> {
    onEdit?: (curso: Curso) => void;
}

@Component({
    selector: 'app-cursos-actions-cell',
    standalone: true,
    templateUrl: './cursos-actions-cell.component.html',
    styleUrls: ['./cursos-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CursosActionsCellComponent implements ICellRendererAngularComp {
    private params?: CursosActionsCellParams;

    agInit(params: CursosActionsCellParams): void {
        this.params = params;
    }

    refresh(params: CursosActionsCellParams): boolean {
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
