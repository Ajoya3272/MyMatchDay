import { Injectable } from '@angular/core';
import { MunicipioIne, ProvinciaIne } from '../interfaces/ubicacion.interface';

@Injectable({
  providedIn: 'root',
})
export class UbicacionService {
  private provinciasCache: Promise<ProvinciaIne[]> | null = null;
  private municipiosCache: Promise<MunicipioIne[]> | null = null;

  obtenerProvincias(): Promise<ProvinciaIne[]> {
    if (!this.provinciasCache) {
      this.provinciasCache = fetch('/assets/data/provincias.json')
        .then((res) => res.json())
        .then((data: ProvinciaIne[]) =>
          [...data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        )
        .catch((error) => {
          console.error('[UBICACION] Error cargando provincias:', error);
          return [];
        });
    }

    return this.provinciasCache;
  }

  async obtenerMunicipiosDeProvincia(
    provinciaId: string,
  ): Promise<MunicipioIne[]> {
    if (!this.municipiosCache) {
      this.municipiosCache = fetch('/assets/data/municipios.json')
        .then((res) => res.json())
        .then((data: MunicipioIne[]) => data)
        .catch((error) => {
          console.error('[UBICACION] Error cargando municipios:', error);
          return [];
        });
    }

    const municipios = await this.municipiosCache;

    return municipios
      .filter((m) => m.provincia_id === provinciaId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
}
