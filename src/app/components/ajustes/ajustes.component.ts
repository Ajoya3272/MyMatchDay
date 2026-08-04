import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-ajustes',
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class AjustesComponent implements OnInit {
  theme: ThemeMode = 'light';
  private readonly themeStorageKey = 'theme';

  ngOnInit(): void {
    const savedTheme = localStorage.getItem(
      this.themeStorageKey,
    ) as ThemeMode | null;

    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.theme = savedTheme;
    } else {
      this.theme = 'light';
    }

    this.applyTheme(this.theme);
  }

  setTheme(theme: ThemeMode): void {
    this.theme = theme;
    this.applyTheme(theme);
    localStorage.setItem(this.themeStorageKey, theme);
  }

  isActive(theme: ThemeMode): boolean {
    return this.theme === theme;
  }

  private applyTheme(theme: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
