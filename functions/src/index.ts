import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";

initializeApp();

const db = getFirestore();

const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");

interface CancelarPartidoRequest {
  partidoId?: string;
}

interface PayPalAccessTokenResponse {
  access_token: string;
}

interface PayPalRefundResponse {
  id: string;
  status: string;
}

interface PartidoFirestore {
  organizadorId?: string;
  organizador?: string;
  nombre?: string;
  fecha?: Timestamp;
  estado?: string;
  pistaNombre?: string;
  ubicacion?: string;
  jugadoresId?: unknown[];
  paypalCaptureId?: string;
}

interface TokenJugador {
  uid: string;
  token: string;
}

function paypalBaseUrl(): string {
  return "https://api-m.sandbox.paypal.com";
}

async function obtenerAccessTokenPayPal(): Promise<string> {
  const clientId = paypalClientId.value();
  const clientSecret = paypalClientSecret.value();

  if (!clientId || !clientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Faltan las credenciales de PayPal en Firebase Secrets.",
    );
  }

  const credenciales = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credenciales}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const detalle = await response.text();

    console.error("[PAYPAL] Error obteniendo access token:", detalle);

    throw new HttpsError(
      "internal",
      "No se pudo autenticar la operación con PayPal.",
    );
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;

  return data.access_token;
}

async function reembolsarCapturaPayPal(
  captureId: string,
): Promise<PayPalRefundResponse> {
  const accessToken = await obtenerAccessTokenPayPal();

  const refundUrl = `${paypalBaseUrl()}/v2/payments/captures/${captureId}/refund`;

  const response = await fetch(refundUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const detalle = await response.text();

    console.error("[PAYPAL] Error realizando reembolso:", detalle);

    throw new HttpsError(
      "internal",
      "No se pudo procesar el reembolso de PayPal.",
    );
  }

  return (await response.json()) as PayPalRefundResponse;
}

function obtenerFechaTexto(fecha: Date): string {
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerNombrePartido(partido: PartidoFirestore): string {
  const nombre = String(partido.nombre ?? "").trim();

  return nombre || "Partido sin nombre";
}

function obtenerNombrePista(partido: PartidoFirestore): string {
  const pistaNombre = String(partido.pistaNombre ?? "").trim();
  const ubicacion = String(partido.ubicacion ?? "").trim();

  return pistaNombre || ubicacion || "Pista por confirmar";
}

function obtenerNombreOrganizador(partido: PartidoFirestore): string {
  const organizador = String(partido.organizador ?? "").trim();

  return organizador || "El organizador";
}

function obtenerJugadoresAVisar(
  jugadoresId: unknown[] | undefined,
  uidOrganizador: string,
): string[] {
  if (!Array.isArray(jugadoresId)) {
    return [];
  }

  const jugadores: string[] = [];

  for (const uid of jugadoresId) {
    if (
      typeof uid === "string" &&
      uid.trim().length > 0 &&
      uid !== uidOrganizador &&
      jugadores.indexOf(uid) === -1
    ) {
      jugadores.push(uid);
    }
  }

  return jugadores;
}

async function crearAvisosCancelacion(
  partidoId: string,
  partido: PartidoFirestore,
  uidOrganizador: string,
  fecha: Date,
): Promise<void> {
  const jugadores = obtenerJugadoresAVisar(partido.jugadoresId, uidOrganizador);

  if (jugadores.length === 0) {
    return;
  }

  const nombreOrganizador = obtenerNombreOrganizador(partido);
  const nombrePartido = obtenerNombrePartido(partido);
  const nombrePista = obtenerNombrePista(partido);
  const fechaTexto = obtenerFechaTexto(fecha);

  const lote = db.batch();

  for (const jugadorUid of jugadores) {
    const avisoRef = db
      .collection("usuarios")
      .doc(jugadorUid)
      .collection("notificaciones")
      .doc();

    lote.set(avisoRef, {
      tipo: "partido-cancelado",
      partidoId,
      titulo: "⚽ Partido cancelado",
      mensaje:
        `${nombreOrganizador} ha cancelado "${nombrePartido}". ` +
        `${nombrePista} · ${fechaTexto}`,
      organizadorId: uidOrganizador,
      organizadorNombre: nombreOrganizador,
      partidoNombre: nombrePartido,
      pistaNombre: nombrePista,
      fechaPartido: partido.fecha ?? null,
      leida: false,
      fechaCreacion: FieldValue.serverTimestamp(),
    });
  }

  await lote.commit();

  console.log("[CANCELAR PARTIDO] Avisos creados:", {
    partidoId,
    jugadoresAvisados: jugadores.length,
  });
}

async function obtenerTokensJugadores(uids: string[]): Promise<TokenJugador[]> {
  if (uids.length === 0) {
    return [];
  }

  const refs = uids.map((uid) => db.collection("usuarios").doc(uid));
  const snapshots = await db.getAll(...refs);

  const tokens: TokenJugador[] = [];

  for (const snap of snapshots) {
    const data = snap.data();
    const tokensUsuario = data?.fcmTokens;

    if (Array.isArray(tokensUsuario)) {
      for (const token of tokensUsuario) {
        if (typeof token === "string" && token.trim().length > 0) {
          tokens.push({uid: snap.id, token});
        }
      }
    }
  }

  return tokens;
}

async function enviarPushGenerico(
  tokensDestino: TokenJugador[],
  titulo: string,
  cuerpo: string,
  datosExtra: Record<string, string>,
): Promise<void> {
  if (tokensDestino.length === 0) {
    return;
  }

  const tokens = tokensDestino.map((tj) => tj.token);

  const mensaje: MulticastMessage = {
    tokens,
    notification: {
      title: titulo,
      body: cuerpo,
    },
    data: datosExtra,
    android: {
      priority: "high",
    },
  };

  const respuesta = await getMessaging().sendEachForMulticast(mensaje);

  console.log("[CANCELAR PARTIDO] Push enviados:", {
    titulo,
    exitosos: respuesta.successCount,
    fallidos: respuesta.failureCount,
  });

  const lote = db.batch();
  let tokensInvalidos = 0;

  respuesta.responses.forEach((resultado, indice) => {
    if (resultado.success) {
      return;
    }

    const codigo = resultado.error?.code ?? "";
    const esTokenInvalido =
      codigo === "messaging/registration-token-not-registered" ||
      codigo === "messaging/invalid-registration-token";

    if (!esTokenInvalido) {
      return;
    }

    const tokenJugador = tokensDestino[indice];
    const usuarioRef = db.collection("usuarios").doc(tokenJugador.uid);

    lote.update(usuarioRef, {
      fcmTokens: FieldValue.arrayRemove(tokenJugador.token),
    });

    tokensInvalidos++;
  });

  if (tokensInvalidos > 0) {
    await lote.commit();
  }
}

async function enviarPushCancelacion(
  tokensJugadores: TokenJugador[],
  partidoId: string,
  partido: PartidoFirestore,
  fecha: Date,
): Promise<void> {
  const nombreOrganizador = obtenerNombreOrganizador(partido);
  const nombrePartido = obtenerNombrePartido(partido);
  const nombrePista = obtenerNombrePista(partido);
  const fechaTexto = obtenerFechaTexto(fecha);

  await enviarPushGenerico(
    tokensJugadores,
    "⚽ Partido cancelado",
    `${nombreOrganizador} ha cancelado "${nombrePartido}". ` +
      `${nombrePista} · ${fechaTexto}`,
    {
      tipo: "partido-cancelado",
      partidoId,
    },
  );
}

async function enviarPushConfirmacionOrganizador(
  tokensOrganizador: TokenJugador[],
  partidoId: string,
  partido: PartidoFirestore,
  fecha: Date,
): Promise<void> {
  const nombrePartido = obtenerNombrePartido(partido);
  const nombrePista = obtenerNombrePista(partido);
  const fechaTexto = obtenerFechaTexto(fecha);

  await enviarPushGenerico(
    tokensOrganizador,
    "⚽ Partido cancelado",
    `Has cancelado "${nombrePartido}" correctamente. ` +
      `${nombrePista} · ${fechaTexto}`,
    {
      tipo: "partido-cancelado-organizador",
      partidoId,
    },
  );
}

export const cancelarPartido = onCall(
  {
    region: "europe-west1",
    secrets: [paypalClientId, paypalClientSecret],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para cancelar un partido.",
      );
    }

    const data = request.data as CancelarPartidoRequest;
    const partidoId = data?.partidoId?.trim();

    if (!partidoId) {
      throw new HttpsError(
        "invalid-argument",
        "El identificador del partido es obligatorio.",
      );
    }

    const partidoRef = db.collection("partidos").doc(partidoId);
    const partidoSnapshot = await partidoRef.get();

    if (!partidoSnapshot.exists) {
      throw new HttpsError("not-found", "El partido no existe.");
    }

    const partido = partidoSnapshot.data() as PartidoFirestore;

    if (partido.organizadorId !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Solo el organizador puede cancelar este partido.",
      );
    }

    const estado = String(partido.estado ?? "")
      .trim()
      .toLowerCase();

    if (estado === "cancelado" || estado === "cancelada") {
      throw new HttpsError("already-exists", "Este partido ya está cancelado.");
    }

    if (estado === "finalizado") {
      throw new HttpsError(
        "failed-precondition",
        "Un partido finalizado no se puede cancelar.",
      );
    }

    const fecha = partido.fecha?.toDate?.();

    if (!fecha) {
      throw new HttpsError(
        "failed-precondition",
        "La fecha del partido no es válida.",
      );
    }

    const milisegundosHastaInicio = fecha.getTime() - Date.now();
    const veinticuatroHorasMs = 24 * 60 * 60 * 1000;

    if (milisegundosHastaInicio <= veinticuatroHorasMs) {
      throw new HttpsError(
        "failed-precondition",
        "Solo puedes cancelar con más de 24 horas de antelación.",
      );
    }

    const paypalCaptureId = String(partido.paypalCaptureId ?? "").trim();

    let refundStatus = "not-required";
    let reembolsado = false;

    if (paypalCaptureId) {
      const refund = await reembolsarCapturaPayPal(paypalCaptureId);

      refundStatus = refund.status;
      reembolsado = true;
    }

    await partidoRef.update({
      estado: "cancelado",
      canceladoPor: request.auth.uid,
      fechaCancelacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
      reembolsado,
      reembolsoEstado: refundStatus,
    });

    try {
      await crearAvisosCancelacion(partidoId, partido, request.auth.uid, fecha);

      const jugadores = obtenerJugadoresAVisar(
        partido.jugadoresId,
        request.auth.uid,
      );

      const [tokensJugadores, tokensOrganizador] = await Promise.all([
        obtenerTokensJugadores(jugadores),
        obtenerTokensJugadores([request.auth.uid]),
      ]);

      await enviarPushCancelacion(tokensJugadores, partidoId, partido, fecha);
      await enviarPushConfirmacionOrganizador(
        tokensOrganizador,
        partidoId,
        partido,
        fecha,
      );
    } catch (error) {
      console.error(
        "[CANCELAR PARTIDO] No se pudieron enviar los avisos:",
        error,
      );
    }

    return {
      success: true,
      refundStatus,
    };
  },
);
