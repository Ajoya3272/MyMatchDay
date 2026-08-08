import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

export interface RegistroUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  sexo: 'hombre' | 'mujer';
  fechaNacimiento: string;
  localidad: string;
  provincia: string;
}

export interface UsuarioFirestore {
  uid: string;
  email: string;
  nombre: string;
  sexo: 'hombre' | 'mujer';
  fechaNacimiento: Timestamp;
  emailVerificado: boolean;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  fotoPerfilUrl?: string;
  provincia?: string;
  localidad?: string;
}

export interface UsuarioFirestoreWrite {
  uid: string;
  email: string;
  nombre: string;
  sexo: 'hombre' | 'mujer';
  fechaNacimiento: Timestamp;
  emailVerificado: boolean;
  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
  fotoPerfilUrl?: string;
}
