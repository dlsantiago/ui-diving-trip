export interface InmersionResponse {
  id: number;
  nombre: string;
  zona: string | null;
  profundidadMetros: number | null;
  duracionMinutos?: number | null;
  temperaturaAgua?: number | null;
  tipoGas?: string | null;
  presionInicial?: number | null;
  presionFinal?: number | null;
  lastreKg?: number | null;
  notas?: string | null;
  orden: number;
  fotosInmersion: string[];
  videosInmersion: string[];
}

export interface ViajeResponse {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  creadoEn: string;
  expiraEn: string;
  fotosViaje: string[];
  videosViaje: string[];
  inmersiones: InmersionResponse[];
}
