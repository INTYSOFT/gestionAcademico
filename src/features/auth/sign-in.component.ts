import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { OidcAuthService } from '../../core/auth/oidc-auth.service';

@Component({
  standalone: true,
  selector: 'app-sign-in',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 dark:bg-base-900">
      <mat-card appearance="outlined" class="w-full max-w-md space-y-6 p-8 text-center">
        <mat-icon class="mx-auto text-5xl text-primary-500">lock</mat-icon>
        <h1 class="text-2xl font-semibold">{{ signInTitle }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ signInDescription }} <strong>{{ provider }}</strong>.
        </p>
        <button
          mat-raised-button
          color="primary"
          type="button"
          (click)="login()"
          [attr.aria-label]="signInButton"
        >
          <mat-icon class="mr-2">login</mat-icon>
          <span>{{ signInButton }}</span>
        </button>
        <p class="text-xs text-muted-foreground">
          {{ signInFooter }}
        </p>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  private readonly oidcAuthService = inject(OidcAuthService);
  protected readonly provider = environment.oidc.provider;

  readonly signInTitle = $localize`:auth.title@@authTitle:Admin Portal`;
  readonly signInDescription = $localize`:auth.description@@authDescription:Autentícate con`; 
  readonly signInButton = $localize`:auth.button@@authButton:Iniciar sesión`;
  readonly signInFooter = $localize`:auth.footer@@authFooter:Se utilizará OAuth2/OIDC (Authorization Code + PKCE) con refresh tokens rotatorios cuando el proveedor lo permita.`;

  login(): void {
    this.oidcAuthService.login();
  }
}
