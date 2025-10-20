import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface EvaluacionClaveActionsCellParams extends ICellRendererParams {
    onDelete?: () => void;
    disableDelete?: boolean;
}

@Component({
    selector: 'app-evaluacion-clave-actions-cell',
    standalone: true,
    template: `
        <button
            mat-icon-button
            type="button"
            color="warn"
            (click)="handleDelete()"
            [disabled]="params?.disableDelete"
            matTooltip="Eliminar"
        >
            <mat-icon>delete</mat-icon>
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class EvaluacionClaveActionsCellComponent implements ICellRendererAngularComp {
    params?: EvaluacionClaveActionsCellParams;

    agInit(params: EvaluacionClaveActionsCellParams): void {
        this.params = params;
    }

    refresh(params: EvaluacionClaveActionsCellParams): boolean {
        this.params = params;
        return true;
    }

    handleDelete(): void {
        this.params?.onDelete?.();
    }
}
