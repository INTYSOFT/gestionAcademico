import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';

interface EvaluacionClaveRespuestaCellEditorParams
    extends ICellEditorParams {
    values?: string[];
}

@Component({
    selector: 'app-evaluacion-clave-respuesta-cell-editor',
    standalone: true,
    template: `
        <select
            #select
            class="ag-select-cell-editor"
            [ngModel]="value"
            (ngModelChange)="onValueChange($event)"
            (keydown)="onKeyDown($event)"
        >
            <option *ngFor="let option of options" [value]="option">
                {{ option }}
            </option>
        </select>
    `,
    imports: [FormsModule, NgFor],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionClaveRespuestaCellEditorComponent
    implements ICellEditorAngularComp
{
    @ViewChild('select', { static: true })
    private readonly selectElement?: ElementRef<HTMLSelectElement>;

    protected options: string[] = [];
    protected value = '';

    agInit(params: EvaluacionClaveRespuestaCellEditorParams): void {
        this.options = (params.values ?? [])
            .map((item) => this.normalizeValue(item))
            .filter((item): item is string => !!item);

        const currentValue = this.normalizeValue(params.value);
        const charPress = this.normalizeValue(params.charPress);

        if (charPress && this.options.includes(charPress)) {
            this.value = charPress;
            return;
        }

        if (currentValue && this.options.includes(currentValue)) {
            this.value = currentValue;
            return;
        }

        this.value = this.options[0] ?? '';
    }

    getValue(): string {
        return this.value;
    }

    afterGuiAttached(): void {
        queueMicrotask(() => {
            const element = this.selectElement?.nativeElement;
            if (!element) {
                return;
            }

            element.focus({ preventScroll: true });
        });
    }

    refresh(): boolean {
        return false;
    }

    onValueChange(value: string): void {
        const normalized = this.normalizeValue(value);
        if (normalized && this.options.includes(normalized)) {
            this.value = normalized;
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key.length !== 1) {
            return;
        }

        const normalized = this.normalizeValue(event.key);
        if (!normalized || !this.options.includes(normalized)) {
            return;
        }

        event.preventDefault();
        this.value = normalized;

        const element = this.selectElement?.nativeElement;
        if (element) {
            element.value = normalized;
        }
    }

    private normalizeValue(value: unknown): string {
        return (value ?? '')
            .toString()
            .trim()
            .toUpperCase();
    }
}
