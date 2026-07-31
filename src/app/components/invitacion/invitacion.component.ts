import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-invitacion',
  templateUrl: './invitacion.component.html',
  styleUrls: ['./invitacion.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class InvitacionComponent implements OnInit {
  slug = '';
  matchName = 'Partido del viernes';
  organizerName = 'Adrián';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goToMatchDetails(): void {
    this.router.navigate(['/detalles-partido']);
  }
}
