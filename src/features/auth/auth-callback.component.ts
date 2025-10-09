import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { OidcAuthService, MockAuthPayload } from '../../core/auth/oidc-auth.service';
import { environment } from '../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-auth-callback',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 dark:bg-base-900">
      <mat-progress-spinner diameter="64" mode="indeterminate"></mat-progress-spinner>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(OidcAuthService);

  ngOnInit(): void {
    if (!environment.production && environment.mockAuth) {
      this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
        const payload = params.get('test_user');
        if (!payload) {
          return;
        }

        try {
          const decoded = JSON.parse(decodeURIComponent(payload)) as MockAuthPayload;
          this.authService.mockCompleteLogin(decoded);
        } catch (error) {
          console.error('Invalid mock login payload', error);
        }
      });
    }
  }
}
