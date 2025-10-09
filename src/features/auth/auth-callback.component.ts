import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { OidcAuthService } from '@core/auth/oidc-auth.service';
import { User } from '@core/models/user';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [NgIf, MatProgressSpinnerModule, MatCardModule, MatIconModule],
  template: `
    <section class="flex min-h-[60vh] items-center justify-center p-6">
      <mat-card appearance="outlined" class="w-full max-w-md text-center">
        <mat-card-header>
          <mat-card-title i18n="@@auth.callback.title">Validando acceso</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <ng-container *ngIf="!error(); else errorTemplate">
            <mat-progress-spinner mode="indeterminate" diameter="48" class="mx-auto my-6"></mat-progress-spinner>
            <p class="text-sm text-slate-500" i18n="@@auth.callback.message">
              Procesando la respuesta del proveedor de identidad.
            </p>
          </ng-container>
          <ng-template #errorTemplate>
            <mat-icon color="warn" class="mb-4 text-4xl">error</mat-icon>
            <p class="text-sm text-rose-600" i18n="@@auth.callback.error">No se pudo validar la sesión.</p>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(OidcAuthService);

  readonly error = signal(false);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const encodedUser = params.get('user');
    if (!encodedUser) {
      this.error.set(true);
      return;
    }

    try {
      const user = this.decodeUser(encodedUser);
      const accessToken = params.get('access_token');
      const redirect = params.get('redirect_uri') ?? '/dashboard';
      await this.authService.completeWithManualUser({
        user,
        accessToken,
        redirectUrl: redirect
      });
    } catch (error) {
      console.error('Error handling auth callback', error);
      this.error.set(true);
    }
  }

  private decodeUser(encoded: string): User {
    const decoded = atob(encoded);
    const parsed = JSON.parse(decoded) as Partial<User>;
    if (!parsed.id || !parsed.name || !parsed.email) {
      throw new Error('Invalid user payload');
    }
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      roles: parsed.roles ?? [],
      avatarUrl: parsed.avatarUrl ?? undefined
    };
  }
}
