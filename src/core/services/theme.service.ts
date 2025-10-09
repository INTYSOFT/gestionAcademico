import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'gestion-academico:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly modeSignal = signal<ThemeMode>('light');

  readonly mode = computed(() => this.modeSignal());
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  initialize(): void {
    const stored = this.getStorage()?.getItem(STORAGE_KEY) as ThemeMode | null;
    const prefersDark = this.matchMedia('(prefers-color-scheme: dark)');
    const nextMode: ThemeMode = stored ?? (prefersDark ? 'dark' : 'light');
    this.applyMode(nextMode, false);
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.applyMode(mode, true);
  }

  private applyMode(mode: ThemeMode, persist: boolean): void {
    this.modeSignal.set(mode);
    this.document.documentElement.classList.toggle('dark', mode === 'dark');
    this.document.documentElement.dataset.theme = mode;

    if (persist) {
      this.getStorage()?.setItem(STORAGE_KEY, mode);
    }
  }

  private getStorage(): Storage | null {
    return this.document.defaultView?.localStorage ?? null;
  }

  private matchMedia(query: string): boolean {
    const media = this.document.defaultView?.matchMedia?.(query);
    return media?.matches ?? false;
  }
}
