import { AsyncPipe } from '@angular/common';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

import {
    ChangeDetectionStrategy,
    Component,
    inject,
    Input,
    OnChanges,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FuseLoadingService } from '@fuse/services/loading';

@Component({
    selector: 'fuse-loading-bar',
    templateUrl: './loading-bar.component.html',
    styleUrls: ['./loading-bar.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'fuseLoadingBar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatProgressBarModule, AsyncPipe],
})
export class FuseLoadingBarComponent implements OnChanges {
    private readonly _fuseLoadingService = inject(FuseLoadingService);

    protected readonly mode$ = this._fuseLoadingService.mode$;
    protected readonly progress$ = this._fuseLoadingService.progress$;
    protected readonly show$ = this._fuseLoadingService.show$;

    @Input() autoMode: boolean = true;

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void {
        // Auto mode
        if ('autoMode' in changes) {
            // Set the auto mode in the service
            this._fuseLoadingService.setAutoMode(
                coerceBooleanProperty(changes.autoMode.currentValue)
            );
        }
    }

}
