export interface ProvinciaIne {
  provincia_id: string;
  nombre: string;
}

export interface MunicipioIne {
  municipio_id: string;
  provincia_id: string;
  cmun: string;
  dc: string;
  nombre: string;
}
