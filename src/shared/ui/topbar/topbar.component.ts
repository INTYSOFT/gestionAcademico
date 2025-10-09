import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppLocale } from '@core/i18n/i18n.config';
import { I18nService } from '@core/services/i18n.service';
import { ThemeService } from '@core/services/theme.service';
import { User } from '@core/models/user';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  template: `
    <mat-toolbar color="primary" class="sticky top-0 z-10 shadow-md">
      <button mat-icon-button (click)="toggle.emit()" aria-label="Toggle menu" i18n-aria-label>
        <mat-icon>menu</mat-icon>
      </button>
      <span class="ml-4 text-lg font-semibold" i18n="@@topbar.title">Panel administrativo</span>
      <span class="flex-1"></span>
      <button
        mat-icon-button
        type="button"
        (click)="toggleTheme()"
        [matTooltip]="themeTooltip()"
        [attr.aria-label]="themeTooltip()"
        data-testid="theme-toggle"
      >
        <mat-icon>{{ themeIcon() }}</mat-icon>
      </button>
      <button
        mat-button
        type="button"
        [matMenuTriggerFor]="languageMenu"
        class="ml-2"
        data-testid="language-toggle"
        aria-haspopup="true"
        [attr.aria-label]="languageLabel()"
      >
        <mat-icon class="mr-2">language</mat-icon>
        <span>{{ languageLabel() }}</span>
      </button>
      <mat-menu #languageMenu="matMenu">
        <button
          mat-menu-item
          type="button"
          *ngFor="let locale of locales"
          (click)="changeLanguage(locale.code)"
          [disabled]="locale.code === currentLocale()"
        >
          {{ locale.label }}
        </button>
      </mat-menu>
      <ng-container *ngIf="user() as currentUser">
        <button mat-button [matMenuTriggerFor]="userMenu" type="button" data-testid="user-menu-trigger">
          <img
            *ngIf="currentUser.avatarUrl; else fallbackAvatar"
            [src]="currentUser.avatarUrl"
            alt="avatar"
            class="mr-2 h-8 w-8 rounded-full object-cover"
          />
          <ng-template #fallbackAvatar>
            <mat-icon class="mr-2">account_circle</mat-icon>
          </ng-template>
          <span class="font-medium">{{ currentUser.name }}</span>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item type="button" i18n="@@topbar.profile">
            <mat-icon>person</mat-icon>
            <span>Perfil</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item type="button" (click)="logout.emit()" i18n="@@topbar.logout">
            <mat-icon>logout</mat-icon>
            <span>Cerrar sesión</span>
          </button>
        </mat-menu>
      </ng-container>
    </mat-toolbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  private readonly themeService = inject(ThemeService);
  private readonly i18nService = inject(I18nService);

  readonly user = input<User | null>(null);

  readonly themeIcon = computed(() => (this.themeService.mode() === 'dark' ? 'dark_mode' : 'light_mode'));
  readonly themeTooltip = computed(() =>
    this.themeService.mode() === 'dark'
      ? $localize`:@@topbar.theme.light:Cambiar a modo claro`
      : $localize`:@@topbar.theme.dark:Cambiar a modo oscuro`
  );
  readonly locales = this.i18nService.locales;
  readonly currentLocale = this.i18nService.locale;

  @Output() toggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  toggleTheme(): void {
    this.themeService.toggle();
  }

  languageLabel(): string {
    const option = this.locales.find((locale) => locale.code === this.currentLocale());
    return option ? option.label : 'Español';
  }

  changeLanguage(locale: AppLocale): void {
    if (locale === this.currentLocale()) {
      return;
    }
    this.i18nService.setLocale(locale);
  }
}
