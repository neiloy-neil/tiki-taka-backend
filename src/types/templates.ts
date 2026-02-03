// Template Types for Seat Map Generation

export const TEMPLATE_TYPES = {
  THEATER: 'theater',
  STADIUM: 'stadium',
  GENERAL_ADMISSION: 'general_admission',
} as const;

export type TemplateType = typeof TEMPLATE_TYPES[keyof typeof TEMPLATE_TYPES];

// Theater Template Configuration
export interface TheaterSection {
  name: string; // e.g., "Orchestra", "Mezzanine", "Balcony"
  sectionCode: string; // e.g., "ORC", "MEZ", "BAL"
  rows: number;
  seatsPerRow: number;
  startX: number;
  startY: number;
  seatSpacing: number; // horizontal spacing between seats
  rowSpacing: number; // vertical spacing between rows
  hasAisle?: boolean; // center aisle splits the row
  aislePosition?: 'center' | 'left' | 'right';
}

export interface TheaterConfig {
  templateType: typeof TEMPLATE_TYPES.THEATER;
  sections: TheaterSection[];
  seatWidth: number; // default: 20
  seatHeight: number; // default: 20
}

// Stadium Template Configuration
export interface StadiumSection {
  name: string; // e.g., "Floor", "Lower Bowl", "Upper Bowl"
  sectionCode: string; // e.g., "FLR", "LWR", "UPR"
  rows: number;
  seatsPerRow: number;
  startAngle: number; // for curved sections
  endAngle: number;
  radius: number;
  tier: number; // 1, 2, 3 for different levels
}

export interface StadiumConfig {
  templateType: typeof TEMPLATE_TYPES.STADIUM;
  sections: StadiumSection[];
  centerX: number; // center of the stadium
  centerY: number;
  seatWidth: number;
  seatHeight: number;
}

// General Admission Configuration
export interface GeneralAdmissionZone {
  name: string; // e.g., "GA Floor", "Standing Room"
  zoneCode: string; // e.g., "GA1", "GA2"
  capacity: number; // total capacity
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeneralAdmissionConfig {
  templateType: typeof TEMPLATE_TYPES.GENERAL_ADMISSION;
  zones: GeneralAdmissionZone[];
}

// Union type for all configurations
export type VenueTemplateConfig = TheaterConfig | StadiumConfig | GeneralAdmissionConfig;

// Result from seat map generation
export interface SeatMetadata {
  id: string; // e.g., "SEC-ORC-R1-S5"
  section: string;
  row: string;
  seat: string;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface VenueLayoutResult {
  seatIndex: Map<string, SeatMetadata>;
  seatMapSvg: string;
  totalSeats: number;
  sections: string[];
}
