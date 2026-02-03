import {
  TheaterConfig,
  StadiumConfig,
  GeneralAdmissionConfig,
  VenueTemplateConfig,
  VenueLayoutResult,
  SeatMetadata,
  TEMPLATE_TYPES,
  TheaterSection,
  StadiumSection,
} from '../types/templates.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

/**
 * Main entry point for generating seat maps from templates
 */
export const generateSeatMap = (config: VenueTemplateConfig): VenueLayoutResult => {
  switch (config.templateType) {
    case TEMPLATE_TYPES.THEATER:
      return generateTheaterLayout(config as TheaterConfig);
    case TEMPLATE_TYPES.STADIUM:
      return generateStadiumLayout(config as StadiumConfig);
    case TEMPLATE_TYPES.GENERAL_ADMISSION:
      return generateGeneralAdmissionLayout(config as GeneralAdmissionConfig);
    default:
      throw new AppError('Invalid template type', 400);
  }
};

/**
 * Generate Theater Layout
 * Creates straight rows with optional center aisles
 */
export const generateTheaterLayout = (config: TheaterConfig): VenueLayoutResult => {
  const { sections, seatWidth = 20, seatHeight = 20 } = config;

  if (!sections || sections.length === 0) {
    throw new AppError('At least one section is required', 400);
  }

  const seatIndex = new Map<string, SeatMetadata>();
  const sectionsArray: string[] = [];
  let svgElements: string[] = [];
  let maxX = 0;
  let maxY = 0;

  sections.forEach((section) => {
    sectionsArray.push(section.sectionCode);
    const sectionSeats = generateTheaterSection(section, seatWidth, seatHeight);

    // Add to seat index
    sectionSeats.forEach((seat) => {
      seatIndex.set(seat.id, seat);

      // Track max dimensions for SVG viewBox
      if (seat.coordinates.x + seatWidth > maxX) {
        maxX = seat.coordinates.x + seatWidth;
      }
      if (seat.coordinates.y + seatHeight > maxY) {
        maxY = seat.coordinates.y + seatHeight;
      }
    });

    // Generate SVG elements for this section
    const sectionSvg = generateTheaterSectionSvg(sectionSeats, seatWidth, seatHeight, section);
    svgElements.push(sectionSvg);
  });

  // Add padding to viewBox
  const padding = 50;
  const viewBoxWidth = maxX + padding * 2;
  const viewBoxHeight = maxY + padding * 2;

  // Build complete SVG
  const seatMapSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="100%" height="100%">
  <defs>
    <style>
      .seat { fill: #10b981; stroke: #064e3b; stroke-width: 1; cursor: pointer; }
      .seat:hover { fill: #34d399; }
      .seat.held { fill: #f59e0b; }
      .seat.sold { fill: #ef4444; }
      .section-label { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #1f2937; }
      .row-label { font-family: Arial, sans-serif; font-size: 12px; fill: #6b7280; }
    </style>
  </defs>
  <rect width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#f9fafb"/>
  ${svgElements.join('\n  ')}
</svg>`.trim();

  return {
    seatIndex,
    seatMapSvg,
    totalSeats: seatIndex.size,
    sections: sectionsArray,
  };
};

/**
 * Generate seats for a single theater section
 */
const generateTheaterSection = (
  section: TheaterSection,
  seatWidth: number,
  seatHeight: number
): SeatMetadata[] => {
  const seats: SeatMetadata[] = [];
  const { sectionCode, rows, seatsPerRow, startX, startY, seatSpacing, rowSpacing, hasAisle, aislePosition } = section;

  for (let rowNum = 1; rowNum <= rows; rowNum++) {
    const rowLabel = String(rowNum);
    const y = startY + (rowNum - 1) * (seatHeight + rowSpacing);

    let seatCount = 0;
    let xOffset = 0;

    for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
      seatCount++;

      // Add aisle gap if needed
      if (hasAisle && aislePosition === 'center' && seatCount === Math.ceil(seatsPerRow / 2) + 1) {
        xOffset += seatSpacing * 2; // Double spacing for aisle
      }

      const x = startX + (seatCount - 1) * (seatWidth + seatSpacing) + xOffset;
      const seatLabel = String(seatNum);
      const seatId = `SEC-${sectionCode}-R${rowLabel}-S${seatLabel}`;

      seats.push({
        id: seatId,
        section: sectionCode,
        row: rowLabel,
        seat: seatLabel,
        coordinates: { x, y },
      });
    }
  }

  return seats;
};

/**
 * Generate SVG markup for a theater section
 */
const generateTheaterSectionSvg = (
  seats: SeatMetadata[],
  seatWidth: number,
  seatHeight: number,
  section: TheaterSection
): string => {
  const seatElements = seats.map((seat) => {
    const { x, y } = seat.coordinates;
    return `<rect id="${seat.id}" data-seat-id="${seat.id}" class="seat" x="${x}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="3"/>`;
  });

  // Add section label
  const labelX = section.startX;
  const labelY = section.startY - 20;
  const sectionLabel = `<text class="section-label" x="${labelX}" y="${labelY}">${section.name}</text>`;

  // Add row labels (on the left side)
  const rowLabels: string[] = [];
  for (let rowNum = 1; rowNum <= section.rows; rowNum++) {
    const y = section.startY + (rowNum - 1) * (seatHeight + section.rowSpacing) + seatHeight / 2 + 4;
    const x = section.startX - 30;
    rowLabels.push(`<text class="row-label" x="${x}" y="${y}" text-anchor="end">Row ${rowNum}</text>`);
  }

  return `
  <!-- Section: ${section.name} -->
  <g id="section-${section.sectionCode}">
    ${sectionLabel}
    ${rowLabels.join('\n    ')}
    ${seatElements.join('\n    ')}
  </g>`;
};

/**
 * Generate Stadium Layout
 * Creates curved rows following stadium shape using polar coordinates
 */
export const generateStadiumLayout = (config: StadiumConfig): VenueLayoutResult => {
  const { sections, centerX, centerY, seatWidth = 20, seatHeight = 20 } = config;

  if (!sections || sections.length === 0) {
    throw new AppError('At least one section is required', 400);
  }

  const seatIndex = new Map<string, SeatMetadata>();
  const sectionsArray: string[] = [];
  let svgElements: string[] = [];

  sections.forEach((section) => {
    sectionsArray.push(section.sectionCode);
    const sectionSeats = generateStadiumSection(section, centerX, centerY, seatWidth, seatHeight);

    // Add to seat index
    sectionSeats.forEach((seat) => {
      seatIndex.set(seat.id, seat);
    });

    // Generate SVG elements
    const sectionSvg = generateStadiumSectionSvg(sectionSeats, seatWidth, seatHeight, section);
    svgElements.push(sectionSvg);
  });

  // Stadium viewBox is typically larger
  const viewBoxSize = Math.max(centerX, centerY) * 2 + 200;

  const seatMapSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="100%" height="100%">
  <defs>
    <style>
      .seat { fill: #10b981; stroke: #064e3b; stroke-width: 1; cursor: pointer; }
      .seat:hover { fill: #34d399; }
      .seat.held { fill: #f59e0b; }
      .seat.sold { fill: #ef4444; }
      .section-label { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #1f2937; }
      .tier-label { font-family: Arial, sans-serif; font-size: 14px; fill: #6b7280; }
    </style>
  </defs>
  <rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#f9fafb"/>
  <circle cx="${centerX}" cy="${centerY}" r="100" fill="#94a3b8" fill-opacity="0.3" stroke="#475569" stroke-width="2"/>
  ${svgElements.join('\n  ')}
</svg>`.trim();

  return {
    seatIndex,
    seatMapSvg,
    totalSeats: seatIndex.size,
    sections: sectionsArray,
  };
};

/**
 * Generate seats for a single stadium section using polar coordinates
 */
const generateStadiumSection = (
  section: StadiumSection,
  centerX: number,
  centerY: number,
  seatWidth: number,
  seatHeight: number
): SeatMetadata[] => {
  const seats: SeatMetadata[] = [];
  const { sectionCode, rows, seatsPerRow, startAngle, endAngle, radius, tier } = section;

  const tierOffset = (tier - 1) * 40; // Vertical offset for different tiers

  for (let rowNum = 1; rowNum <= rows; rowNum++) {
    const rowLabel = String(rowNum);
    const currentRadius = radius + (rowNum - 1) * (seatHeight + 5);
    const angleStep = (endAngle - startAngle) / seatsPerRow;

    for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
      const angle = startAngle + seatNum * angleStep;
      const angleRad = (angle * Math.PI) / 180;

      // Convert polar to cartesian coordinates
      const x = centerX + currentRadius * Math.cos(angleRad) - seatWidth / 2;
      const y = centerY + currentRadius * Math.sin(angleRad) - seatHeight / 2 + tierOffset;

      const seatLabel = String(seatNum);
      const seatId = `SEC-${sectionCode}-R${rowLabel}-S${seatLabel}`;

      seats.push({
        id: seatId,
        section: sectionCode,
        row: rowLabel,
        seat: seatLabel,
        coordinates: { x, y },
      });
    }
  }

  return seats;
};

/**
 * Generate SVG markup for a stadium section
 */
const generateStadiumSectionSvg = (
  seats: SeatMetadata[],
  seatWidth: number,
  seatHeight: number,
  section: StadiumSection
): string => {
  const seatElements = seats.map((seat) => {
    const { x, y } = seat.coordinates;
    return `<rect id="${seat.id}" data-seat-id="${seat.id}" class="seat" x="${x}" y="${y}" width="${seatWidth}" height="${seatHeight}" rx="3"/>`;
  });

  // Calculate label position (at the start of the section arc)
  const labelAngleRad = (section.startAngle * Math.PI) / 180;
  const labelRadius = section.radius - 30;
  const labelX = 500 + labelRadius * Math.cos(labelAngleRad);
  const labelY = 500 + labelRadius * Math.sin(labelAngleRad);

  const sectionLabel = `<text class="section-label" x="${labelX}" y="${labelY}">${section.name} (Tier ${section.tier})</text>`;

  return `
  <!-- Section: ${section.name} -->
  <g id="section-${section.sectionCode}">
    ${sectionLabel}
    ${seatElements.join('\n    ')}
  </g>`;
};

/**
 * Generate General Admission Layout
 * Creates standing zones with capacity limits (no individual seats)
 */
export const generateGeneralAdmissionLayout = (config: GeneralAdmissionConfig): VenueLayoutResult => {
  const { zones } = config;

  if (!zones || zones.length === 0) {
    throw new AppError('At least one zone is required', 400);
  }

  const seatIndex = new Map<string, SeatMetadata>();
  const sectionsArray: string[] = [];
  let svgElements: string[] = [];
  let maxX = 0;
  let maxY = 0;

  zones.forEach((zone) => {
    sectionsArray.push(zone.zoneCode);

    // For GA zones, create virtual "seats" representing capacity
    for (let i = 1; i <= zone.capacity; i++) {
      const seatId = `SEC-${zone.zoneCode}-R0-S${i}`;

      seatIndex.set(seatId, {
        id: seatId,
        section: zone.zoneCode,
        row: '0', // GA zones don't have rows
        seat: String(i),
        coordinates: {
          x: zone.x + (i % 10) * 5, // Spread virtually across zone
          y: zone.y + Math.floor(i / 10) * 5,
        },
      });
    }

    // Track max dimensions
    if (zone.x + zone.width > maxX) maxX = zone.x + zone.width;
    if (zone.y + zone.height > maxY) maxY = zone.y + zone.height;

    // Generate SVG rectangle for the zone
    svgElements.push(`
  <!-- Zone: ${zone.name} -->
  <g id="zone-${zone.zoneCode}">
    <rect x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}"
          fill="#10b981" fill-opacity="0.2" stroke="#064e3b" stroke-width="2"/>
    <text class="section-label" x="${zone.x + zone.width / 2}" y="${zone.y + zone.height / 2}"
          text-anchor="middle">${zone.name}</text>
    <text class="row-label" x="${zone.x + zone.width / 2}" y="${zone.y + zone.height / 2 + 20}"
          text-anchor="middle">Capacity: ${zone.capacity}</text>
  </g>`);
  });

  // Add padding
  const padding = 50;
  const viewBoxWidth = maxX + padding * 2;
  const viewBoxHeight = maxY + padding * 2;

  const seatMapSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="100%" height="100%">
  <defs>
    <style>
      .section-label { font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; fill: #1f2937; }
      .row-label { font-family: Arial, sans-serif; font-size: 14px; fill: #6b7280; }
    </style>
  </defs>
  <rect width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#f9fafb"/>
  ${svgElements.join('\n  ')}
</svg>`.trim();

  return {
    seatIndex,
    seatMapSvg,
    totalSeats: seatIndex.size,
    sections: sectionsArray,
  };
};

/**
 * Validate template configuration
 */
export const validateTemplateConfig = (config: VenueTemplateConfig): boolean => {
  if (!config || !config.templateType) {
    throw new AppError('Template configuration is required', 400);
  }

  switch (config.templateType) {
    case TEMPLATE_TYPES.THEATER: {
      const theaterConfig = config as TheaterConfig;
      if (!theaterConfig.sections || theaterConfig.sections.length === 0) {
        throw new AppError('Theater template requires at least one section', 400);
      }

      theaterConfig.sections.forEach((section, idx) => {
        if (!section.sectionCode || !section.name) {
          throw new AppError(`Section ${idx + 1}: name and sectionCode are required`, 400);
        }
        if (section.rows < 1 || section.seatsPerRow < 1) {
          throw new AppError(`Section ${idx + 1}: rows and seatsPerRow must be at least 1`, 400);
        }
      });
      break;
    }

    case TEMPLATE_TYPES.GENERAL_ADMISSION: {
      const gaConfig = config as GeneralAdmissionConfig;
      if (!gaConfig.zones || gaConfig.zones.length === 0) {
        throw new AppError('General Admission template requires at least one zone', 400);
      }

      gaConfig.zones.forEach((zone, idx) => {
        if (!zone.zoneCode || !zone.name) {
          throw new AppError(`Zone ${idx + 1}: name and zoneCode are required`, 400);
        }
        if (zone.capacity < 1) {
          throw new AppError(`Zone ${idx + 1}: capacity must be at least 1`, 400);
        }
      });
      break;
    }

    case TEMPLATE_TYPES.STADIUM: {
      const stadiumConfig = config as StadiumConfig;
      if (!stadiumConfig.sections || stadiumConfig.sections.length === 0) {
        throw new AppError('Stadium template requires at least one section', 400);
      }

      stadiumConfig.sections.forEach((section, idx) => {
        if (!section.sectionCode || !section.name) {
          throw new AppError(`Section ${idx + 1}: name and sectionCode are required`, 400);
        }
        if (section.rows < 1 || section.seatsPerRow < 1) {
          throw new AppError(`Section ${idx + 1}: rows and seatsPerRow must be at least 1`, 400);
        }
        if (section.radius < 1) {
          throw new AppError(`Section ${idx + 1}: radius must be at least 1`, 400);
        }
      });
      break;
    }

    default:
      throw new AppError('Invalid template type', 400);
  }

  return true;
};
