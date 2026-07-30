import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-invitacion',
  templateUrl: './invitacion.component.html',
  styleUrls: ['./invitacion.component.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, RouterLink],
})
export class InvitacionComponent implements OnInit {
  slug = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
  }
}
