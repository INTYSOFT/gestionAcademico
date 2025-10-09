import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { UserStore } from '@core/services/user.store';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h1 class="mb-6 text-2xl font-semibold" i18n="@@signin.title">Inicia sesión</h1>
    <form class="space-y-4" (ngSubmit)="login()">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label i18n="@@signin.email">Correo electrónico</mat-label>
        <input matInput [formControl]="email" type="email" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label i18n="@@signin.password">Contraseña</mat-label>
        <input matInput type="password" required />
      </mat-form-field>

      <button mat-flat-button color="primary" class="w-full" type="submit" i18n="@@signin.action">
        Acceder
      </button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignInComponent {
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);

  readonly email = new FormControl('admin@example.com');

  login(): void {
    this.userStore.simulateLogin();
    void this.router.navigate(['/dashboard']);
  }
}
