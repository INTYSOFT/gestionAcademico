import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';

export interface AlumnosActionsCellParams extends ICellRendererParams {
    onViewApoderados: (alumno: Alumno) => void;
    onEdit: (alumno: Alumno) => void;
    onDelete: (alumno: Alumno) => void;
}

@Component({
    selector: 'app-alumnos-actions-cell',
    standalone: true,
    templateUrl: './alumnos-actions-cell.component.html',
    styleUrl: './alumnos-actions-cell.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class AlumnosActionsCellComponent implements ICellRendererAngularComp {
    private params!: AlumnosActionsCellParams;

    agInit(params: AlumnosActionsCellParams): void {
        this.params = params;
    }

    refresh(params: AlumnosActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    protected viewApoderados(): void {
        this.params.onViewApoderados(this.params.data as Alumno);
    }

    protected editAlumno(): void {
        this.params.onEdit(this.params.data as Alumno);
    }

    protected deleteAlumno(): void {
        this.params.onDelete(this.params.data as Alumno);
    }
}
