import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'app.theme.mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly modeSignal = signal<ThemeMode>(this.readInitialMode());

  readonly mode = this.modeSignal.asReadonly();

  constructor() {
    effect(() => {
      const mode = this.modeSignal();
      this.applyMode(mode);
    });
  }

  toggle(): void {
    this.setMode(this.modeSignal() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    this.store(mode);
  }

  private readInitialMode(): ThemeMode {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const stored = window.localStorage?.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private applyMode(mode: ThemeMode): void {
    const classList = this.document.documentElement.classList;
    classList.toggle('dark', mode === 'dark');
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  private store(mode: ThemeMode): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage?.setItem(STORAGE_KEY, mode);
  }
}
