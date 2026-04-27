// TODO: Court types
// - Court interface
// - Sport type enum

export interface Court {
  id: string;
  name: string;
  sportType: string;
  address: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
