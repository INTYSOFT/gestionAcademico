import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-sign-in',
  imports: [MatCardModule, MatButtonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 dark:bg-base-900">
      <mat-card appearance="outlined" class="w-full max-w-md space-y-6 p-8 text-center">
        <h1 class="text-2xl font-semibold">Admin Portal</h1>
        <p class="text-sm text-muted-foreground">
          Usa el botón para simular un inicio de sesión.
        </p>
        <button mat-raised-button color="primary" (click)="mockLogin()">Iniciar sesión</button>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  private readonly router = inject(Router);

  mockLogin(): void {
    void this.router.navigate(['/dashboard']);
  }
}
