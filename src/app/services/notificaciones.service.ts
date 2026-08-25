import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { Auth } from '@angular/fire/auth';
import {
  arrayRemove,
  arrayUnion,
  doc,
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';

import { Partido } from '../interfaces/Partido.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private readonly notificationIdBase = 100000;
  private readonly cancellationNotificationIdBase = 900000000;
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private tokenPushActual: string | null = null;
  private listenersPushInicializados = false;

  async inicializarPermisos(): Promise<boolean> {
    if (!this.esPlataformaNativa()) {
      return false;
    }

    const permisos = await LocalNotifications.checkPermissions();

    if (permisos.display === 'granted') {
      return true;
    }

    const solicitados = await LocalNotifications.requestPermissions();

    return solicitados.display === 'granted';
  }

  async inicializarPush(): Promise<void> {
    if (!this.esPlataformaNativa()) {
      console.info('[NOTIFICACIONES] Push omitido en navegador');
      return;
    }

    this.registrarListenersPush();

    const permisos = await PushNotifications.checkPermissions();
    let estado = permisos.receive;

    if (estado === 'prompt' || estado === 'prompt-with-rationale') {
      const solicitados = await PushNotifications.requestPermissions();
      estado = solicitados.receive;
    }

    if (estado !== 'granted') {
      console.warn('[NOTIFICACIONES] Permiso de push no concedido');
      return;
    }

    await PushNotifications.register();
  }

  private registrarListenersPush(): void {
    if (this.listenersPushInicializados) {
      return;
    }

    this.listenersPushInicializados = true;

    PushNotifications.addListener('registration', (token: Token) => {
      this.tokenPushActual = token.value;
      void this.guardarTokenPush(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NOTIFICACIONES] Error registrando push:', error);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        void this.mostrarNotificacionLocalDesdePush(notification);
      },
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (accion: ActionPerformed) => {
        console.log('[NOTIFICACIONES] Push abierto por el usuario:', accion);
      },
    );
  }

  private async mostrarNotificacionLocalDesdePush(
    notification: PushNotificationSchema,
  ): Promise<void> {
    const tienePermiso = await this.inicializarPermisos();

    if (!tienePermiso) {
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.obtenerIdAleatorio(),
          title: notification.title ?? 'JoinMatch',
          body: notification.body ?? '',
          extra: notification.data,
        },
      ],
    });
  }

  private async guardarTokenPush(token: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;

    if (!uid) {
      console.warn(
        '[NOTIFICACIONES] No hay usuario logueado para guardar el token',
      );
      return;
    }

    try {
      const usuarioRef = doc(this.firestore, 'usuarios', uid);

      await updateDoc(usuarioRef, {
        fcmTokens: arrayUnion(token),
      });

      console.log('[NOTIFICACIONES] Token push guardado');
    } catch (error) {
      console.error(
        '[NOTIFICACIONES] No se pudo guardar el token push:',
        error,
      );
    }
  }

  async eliminarTokenPushActual(): Promise<void> {
    const uid = this.auth.currentUser?.uid;

    if (!uid || !this.tokenPushActual) {
      return;
    }

    try {
      const usuarioRef = doc(this.firestore, 'usuarios', uid);

      await updateDoc(usuarioRef, {
        fcmTokens: arrayRemove(this.tokenPushActual),
      });
    } catch (error) {
      console.error(
        '[NOTIFICACIONES] No se pudo eliminar el token push:',
        error,
      );
    }
  }

  async programarAvisoPartido(partido: Partido): Promise<void> {
    if (!this.esPlataformaNativa()) {
      console.info('[NOTIFICACIONES] Recordatorio omitido en navegador');
      return;
    }

    if (!partido.partidoId || !partido.fecha) {
      return;
    }

    const tienePermiso = await this.inicializarPermisos();

    if (!tienePermiso) {
      console.warn('[NOTIFICACIONES] Permiso no concedido');
      return;
    }

    const inicio = partido.fecha.toDate?.();

    if (!inicio) {
      console.warn('[NOTIFICACIONES] La fecha del partido no es válida');
      return;
    }

    const fechaAviso = new Date(inicio.getTime() - 24 * 60 * 60 * 1000);

    if (fechaAviso.getTime() <= Date.now()) {
      return;
    }

    const notificationId = this.obtenerIdNotificacion(partido.partidoId);

    await this.cancelarAvisoPartido(partido.partidoId);

    const hora = inicio.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const ubicacion = partido.ubicacion?.trim() || 'Ubicación por confirmar';

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: '⚽ Partido mañana',
          body: `${partido.nombre} · ${ubicacion} · ${hora}`,
          schedule: {
            at: fechaAviso,
            allowWhileIdle: false,
          },
          extra: {
            tipo: 'recordatorio-partido',
            partidoId: partido.partidoId,
          },
        },
      ],
    });

    console.log('[NOTIFICACIONES] Recordatorio programado:', {
      partidoId: partido.partidoId,
      fechaAviso,
    });
  }

  async notificarPartidoCreado(nombrePartido: string): Promise<void> {
    if (!this.esPlataformaNativa()) {
      console.info('[NOTIFICACIONES] Notificación omitida en navegador');
      return;
    }

    const tienePermiso = await this.inicializarPermisos();

    if (!tienePermiso) {
      console.warn('[NOTIFICACIONES] Permiso no concedido');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.obtenerIdAleatorio(),
          title: '⚽ ¡Partido creado con éxito!',
          body: `“${nombrePartido}” ya está listo. Invita ahora al resto de jugadores.`,
          extra: {
            tipo: 'partido-creado',
          },
        },
      ],
    });
  }

  async notificarAbandonoEquipo(
    nombreJugador: string,
    nombrePartido: string,
  ): Promise<void> {
    if (!this.esPlataformaNativa()) {
      console.info('[NOTIFICACIONES] Aviso de abandono omitido en navegador');
      return;
    }

    const tienePermiso = await this.inicializarPermisos();

    if (!tienePermiso) {
      console.warn('[NOTIFICACIONES] Permiso no concedido');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.obtenerIdAleatorio(),
          title: '⚠️ Un jugador ha abandonado el equipo',
          body: `${nombreJugador} ha dejado "${nombrePartido}". Ya tienes hueco libre.`,
          extra: {
            tipo: 'abandono-partido',
          },
        },
      ],
    });
  }

  async notificarPartidoCanceladoOrganizador(partido: Partido): Promise<void> {
    if (!this.esPlataformaNativa()) {
      console.info(
        '[NOTIFICACIONES] Aviso de cancelación omitido en navegador',
      );
      return;
    }

    if (!partido.partidoId) {
      return;
    }

    const tienePermiso = await this.inicializarPermisos();

    if (!tienePermiso) {
      console.warn('[NOTIFICACIONES] Permiso no concedido');
      return;
    }

    await this.cancelarAvisoPartido(partido.partidoId);

    const fechaTexto = this.obtenerFechaPartido(partido);
    const pista = this.obtenerPista(partido);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.obtenerIdCancelacion(partido.partidoId),
          title: '⚽ Partido cancelado',
          body: `Has cancelado "${partido.nombre}". ${pista} · ${fechaTexto}`,
          extra: {
            tipo: 'partido-cancelado-organizador',
            partidoId: partido.partidoId,
          },
        },
      ],
    });
  }

  async cancelarAvisoPartido(partidoId: string): Promise<void> {
    if (!this.esPlataformaNativa() || !partidoId) {
      return;
    }

    const notificationId = this.obtenerIdNotificacion(partidoId);

    try {
      await LocalNotifications.cancel({
        notifications: [
          {
            id: notificationId,
          },
        ],
      });
    } catch (error) {
      console.warn('[NOTIFICACIONES] No se pudo cancelar el aviso:', error);
    }
  }

  private obtenerFechaPartido(partido: Partido): string {
    const fecha = partido.fecha?.toDate?.();

    if (!fecha) {
      return 'Fecha por confirmar';
    }

    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private obtenerPista(partido: Partido): string {
    const partidoConPista = partido as Partido & {
      pistaNombre?: string;
    };

    return (
      partidoConPista.pistaNombre?.trim() ||
      partido.ubicacion?.trim() ||
      'Pista por confirmar'
    );
  }

  private esPlataformaNativa(): boolean {
    return Capacitor.isNativePlatform();
  }

  private obtenerIdNotificacion(partidoId: string): number {
    let hash = 0;

    for (let i = 0; i < partidoId.length; i++) {
      hash = (hash << 5) - hash + partidoId.charCodeAt(i);
      hash |= 0;
    }

    return this.notificationIdBase + Math.abs(hash % 800000);
  }

  private obtenerIdCancelacion(partidoId: string): number {
    let hash = 0;

    for (let i = 0; i < partidoId.length; i++) {
      hash = (hash << 5) - hash + partidoId.charCodeAt(i);
      hash |= 0;
    }

    return this.cancellationNotificationIdBase + Math.abs(hash % 90000000);
  }

  private obtenerIdAleatorio(): number {
    return Math.floor(Date.now() % 800000000);
  }
}
