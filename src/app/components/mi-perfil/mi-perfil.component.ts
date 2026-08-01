import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, switchMap, of } from 'rxjs';
import { UsuarioFirestore } from '../../services/registro-usuario.service';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class MiPerfilComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  usuario$: Observable<UsuarioFirestore | null> = of(null);
  uid: string | null = null;

  ngOnInit(): void {
    this.usuario$ = authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) {
          this.uid = null;
          return of(null);
        }

        this.uid = user.uid;
        const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
        return docData(userDocRef) as Observable<UsuarioFirestore>;
      }),
    );
  }
}
