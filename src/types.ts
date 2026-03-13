export type LotStatus = 'available' | 'sold' | 'reserved';

export interface Lot {
  id: string;
  number: string;
  area: string;
  status: LotStatus;
  price?: string | number;
  points: string; // SVG polygon points
  soldBy?: string; // Broker ID
  observations?: string;
  registration?: string; // Matrícula
  soldAt?: string; // ISO date
}

export interface MapConfig {
  imageUrl: string;
  width: number;
  height: number;
}

export interface Broker {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  agency: string;
  password?: string;
}
