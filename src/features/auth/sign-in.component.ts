import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { OidcAuthService } from '@core/auth/oidc-auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule],
  template: `
    <div class="space-y-6 text-center">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold" i18n="@@signin.title">Bienvenido</h1>
        <p class="text-sm text-slate-500 dark:text-slate-300" i18n="@@signin.subtitle">
          Inicia sesión con tu proveedor {{ providerName() }} para continuar.
        </p>
      </div>
      <button mat-flat-button color="primary" class="w-full" type="button" (click)="login()">
        <mat-icon class="mr-2">login</mat-icon>
        <span i18n="@@signin.action">Iniciar sesión</span>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  private readonly oidcAuthService = inject(OidcAuthService);

  readonly providerName = computed(() => environment.oidc.providerName);

  login(): void {
    this.oidcAuthService.login();
  }
}
