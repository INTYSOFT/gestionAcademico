import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OidcAuthService } from '../../../core/auth/oidc-auth.service';
import { LocalizationService } from '../../../core/services/localization.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgFor,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-20">
      <button
        mat-icon-button
        type="button"
        (click)="toggleSidenav.emit()"
        [attr.aria-label]="toggleMenuLabel"
      >
        <mat-icon>menu</mat-icon>
      </button>
      <span class="ml-4 text-lg font-semibold">{{ appTitle }}</span>
      <span class="flex-1"></span>

      <button
        mat-icon-button
        type="button"
        class="mr-2"
        (click)="onToggleTheme()"
        [matTooltip]="themeTooltip()"
        [attr.aria-label]="themeToggleLabel"
      >
        <mat-icon>{{ themeIcon() }}</mat-icon>
      </button>

      <button
        mat-button
        type="button"
        class="mr-2"
        [matMenuTriggerFor]="languageMenu"
        [attr.aria-label]="languageMenuLabel"
      >
        <mat-icon>translate</mat-icon>
        <span class="ml-2">{{ currentLanguageLabel() }}</span>
      </button>

      <mat-menu #languageMenu="matMenu">
        <button
          mat-menu-item
          type="button"
          *ngFor="let option of languageOptions(); trackBy: trackByLocale"
          (click)="changeLanguage(option.code)"
        >
          <mat-icon>{{ option.code === localeService.locale() ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>{{ option.label }}</span>
        </button>
      </mat-menu>

      <ng-container *ngIf="user$ | async as user">
        <button
          mat-button
          type="button"
          [matMenuTriggerFor]="userMenu"
          [attr.aria-label]="userMenuLabel"
          class="flex items-center gap-3"
        >
          <ng-container *ngIf="user.picture; else initialsAvatar">
            <img
              [src]="user.picture"
              alt="{{ user.name }}"
              class="h-9 w-9 rounded-full border border-white/40 object-cover"
            />
          </ng-container>
          <ng-template #initialsAvatar>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold uppercase">
              {{ user.name?.[0] ?? '?' }}
            </span>
          </ng-template>
          <span class="hidden text-left lg:flex lg:flex-col">
            <span class="text-sm font-medium">{{ user.name }}</span>
            <span class="text-xs opacity-80">{{ user.email }}</span>
          </span>
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu" xPosition="before">
          <button mat-menu-item type="button">
            <mat-icon>person</mat-icon>
            <span>{{ profileLabel }}</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item type="button" (click)="logout()" data-test-id="logout-button">
            <mat-icon>logout</mat-icon>
            <span>{{ logoutLabel }}</span>
          </button>
        </mat-menu>
      </ng-container>
    </mat-toolbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  @Output() readonly toggleSidenav = new EventEmitter<void>();

  private readonly authService = inject(OidcAuthService);
  protected readonly localeService = inject(LocalizationService);
  private readonly themeService = inject(ThemeService);

  readonly user$ = this.authService.user$;
  readonly languageOptions = computed(() => this.localeService.locales());
  readonly currentLanguageLabel = computed(() => {
    const current = this.localeService.locale();
    const option = this.languageOptions().find((item) => item.code === current);
    return option?.label ?? current.toUpperCase();
  });
  readonly themeIcon = computed(() => (this.themeService.isDark() ? 'dark_mode' : 'light_mode'));
  readonly themeTooltip = computed(() =>
    this.themeService.isDark() ? this.lightModeLabel : this.darkModeLabel
  );

  readonly appTitle = $localize`:topbar.title@@topbarTitle:Gestión Académica`;
  readonly toggleMenuLabel = $localize`:topbar.menu@@topbarToggleMenu:Alternar navegación`;
  readonly themeToggleLabel = $localize`:topbar.themeToggle@@topbarThemeToggle:Cambiar tema`;
  readonly languageMenuLabel = $localize`:topbar.language@@topbarLanguage:Seleccionar idioma`;
  readonly userMenuLabel = $localize`:topbar.userMenu@@topbarUserMenu:Menú de usuario`;
  readonly profileLabel = $localize`:topbar.profile@@topbarProfile:Perfil`;
  readonly logoutLabel = $localize`:topbar.logout@@topbarLogout:Cerrar sesión`;
  private readonly darkModeLabel = $localize`:topbar.darkMode@@topbarDarkMode:Modo oscuro`;
  private readonly lightModeLabel = $localize`:topbar.lightMode@@topbarLightMode:Modo claro`;

  readonly trackByLocale = (_: number, option: { code: string }) => option.code;

  onToggleTheme(): void {
    this.themeService.toggle();
  }

  changeLanguage(locale: string): void {
    this.localeService.setLocale(locale);
  }

  logout(): void {
    this.authService.logout();
  }
}
