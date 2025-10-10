import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Alumno } from 'app/core/models/centro-estudios/alumno.model';

export type AlumnoActionsCellRendererParams = ICellRendererParams<Alumno> & {
    onEdit?: (alumno: Alumno) => void;
    onViewApoderados?: (alumno: Alumno) => void;
};

@Component({
    selector: 'app-alumno-actions-cell',
    standalone: true,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
    template: `
        <div class="flex items-center justify-center gap-2">
            <button
                mat-icon-button
                type="button"
                matTooltip="Editar alumno"
                (click)="onEdit($event)"
                aria-label="Editar alumno"
            >
                <mat-icon>edit</mat-icon>
            </button>
            <button
                mat-icon-button
                type="button"
                matTooltip="Ver apoderados"
                (click)="onViewApoderados($event)"
                aria-label="Ver apoderados"
            >
                <mat-icon>groups</mat-icon>
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlumnoActionsCellComponent implements ICellRendererAngularComp {
    private params!: AlumnoActionsCellRendererParams;

    agInit(params: ICellRendererParams): void {
        this.params = params as AlumnoActionsCellRendererParams;
    }

    refresh(params: ICellRendererParams): boolean {
        this.params = params as AlumnoActionsCellRendererParams;
        return true;
    }

    onEdit(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.params?.data && this.params.onEdit) {
            this.params.onEdit(this.params.data);
        }
    }

    onViewApoderados(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.params?.data && this.params.onViewApoderados) {
            this.params.onViewApoderados(this.params.data);
        }
    }
}
