export interface InmersionResponse {
  id: number;
  nombre: string;
  zona: string | null;
  profundidadMetros: number | null;
  orden: number;
  fotosInmersion: string[];
}

export interface ViajeResponse {
  id: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  creadoEn: string;
  expiraEn: string;
  fotosViaje: string[];
  inmersiones: InmersionResponse[];
}
