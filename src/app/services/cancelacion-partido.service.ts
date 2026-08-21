import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { CancelarPartidoResponse } from '../interfaces/Cancelar-partido.interface';

@Injectable({
  providedIn: 'root',
})
export class CancelacionPartidoService {
  private functions = inject(Functions);

  async cancelarPartido(partidoId: string): Promise<CancelarPartidoResponse> {
    const cancelarPartidoFn = httpsCallable<
      { partidoId: string },
      CancelarPartidoResponse
    >(this.functions, 'cancelarPartidoConReembolso');

    const resultado = await cancelarPartidoFn({ partidoId });
    return resultado.data;
  }
}
