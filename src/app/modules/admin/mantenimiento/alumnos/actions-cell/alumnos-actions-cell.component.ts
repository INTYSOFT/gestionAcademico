import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';

interface AlumnosActionsCellParams extends ICellRendererParams<Alumno> {
    onViewApoderados?: (alumno: Alumno) => void;
    onEdit?: (alumno: Alumno) => void;
}

@Component({
    selector: 'app-alumnos-actions-cell',
    standalone: true,
    templateUrl: './alumnos-actions-cell.component.html',
    styleUrls: ['./alumnos-actions-cell.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [MatButtonModule, MatIconModule],
})
export class AlumnosActionsCellComponent implements ICellRendererAngularComp {
    private params?: AlumnosActionsCellParams;

    agInit(params: AlumnosActionsCellParams): void {
        this.params = params;
    }

    refresh(params: AlumnosActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected handleViewApoderados(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onViewApoderados?.(this.params.data);
    }

    protected handleEdit(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onEdit?.(this.params.data);
    }
}
