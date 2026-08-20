import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { Partido } from '../interfaces/Partido.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private readonly notificationIdBase = 100000;

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
          id: Date.now() % 1000000000,
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
          id: Date.now() % 1000000000,
          title: '⚠️ Un jugador ha abandonado el equipo',
          body: `${nombreJugador} ha dejado "${nombrePartido}". Ya tienes hueco libre.`,
          extra: {
            tipo: 'abandono-partido',
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
}
