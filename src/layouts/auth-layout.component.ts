import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLayoutComponent {}
