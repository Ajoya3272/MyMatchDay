import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class HeaderComponent {
  isProfileOpen = false;

  constructor(private menuCtrl: MenuController) {}

  async openMainMenu(): Promise<void> {
    await this.menuCtrl.enable(true, 'main-menu');
    await this.menuCtrl.open('main-menu');
  }

  toggleProfileMenu(): void {
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeProfileMenu(): void {
    this.isProfileOpen = false;
  }
}
