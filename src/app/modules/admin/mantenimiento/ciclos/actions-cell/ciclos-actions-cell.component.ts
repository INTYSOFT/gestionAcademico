import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Ciclo } from 'app/core/models/centro-estudios/ciclo.model';
import { ThemePalette } from '@angular/material/core';

export interface CiclosActionsCellParams extends ICellRendererParams<Ciclo> {
    onEdit?: (ciclo: Ciclo) => void;
    onOpenApertura?: (ciclo: Ciclo) => void;
    getAperturaStatus?: (cicloId: number) => boolean | null | undefined;
}

@Component({
    selector: 'app-ciclos-actions-cell',
    standalone: true,
    templateUrl: './ciclos-actions-cell.component.html',
    styleUrls: ['./ciclos-actions-cell.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
})
export class CiclosActionsCellComponent implements ICellRendererAngularComp {
    private params?: CiclosActionsCellParams;
    protected aperturaColor: ThemePalette = 'accent';

    constructor(private readonly cdr: ChangeDetectorRef) {}

    agInit(params: CiclosActionsCellParams): void {
        this.params = params;
        this.updateAperturaAppearance();
    }

    refresh(params: CiclosActionsCellParams): boolean {
        this.params = params;
        this.updateAperturaAppearance();
        return true;
    }

    protected edit(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onEdit?.(this.params.data);
    }

    protected openApertura(): void {
        if (!this.params?.data) {
            return;
        }

        this.params.onOpenApertura?.(this.params.data);
    }

    private updateAperturaAppearance(): void {
        if (!this.params?.data) {
            this.aperturaColor = 'accent';
            this.cdr.markForCheck();
            return;
        }

        const status = this.params.getAperturaStatus?.(this.params.data.id);

        if (status === undefined || status === null) {
            this.aperturaColor = 'accent';
        } else if (status) {
            this.aperturaColor = 'primary';
        } else {
            this.aperturaColor = 'warn';
        }

        this.cdr.markForCheck();
    }
}
