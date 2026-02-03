import * as cheerio from 'cheerio';

export interface SeatMetadata {
  id: string; // e.g., "SEC-A-R3-S12"
  section: string;
  row: string;
  seat: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface ParsedSeatMap {
  seatIndex: Map<string, SeatMetadata>;
  totalSeats: number;
  sections: string[];
}

/**
 * Parse SVG content to extract seat information
 * Convention: Seat IDs must follow pattern SECTION-ROW-SEAT
 * Example: SEC-A-R3-S12, SEC-VIP-R1-S5
 */
export const parseSvgSeats = (svgContent: string): ParsedSeatMap => {
  try {
    const $ = cheerio.load(svgContent, { xmlMode: true });
    const seatIndex = new Map<string, SeatMetadata>();
    const sectionsSet = new Set<string>();

    // Look for elements with data-seat-id attribute or id matching seat pattern
    $('[data-seat-id], [id^="SEC-"], rect.seat, circle.seat, path.seat').each((_, element) => {
      const $el = $(element);

      // Try to get seat ID from data-seat-id or id attribute
      let seatId = $el.attr('data-seat-id') || $el.attr('id');

      if (!seatId) return;

      // Validate seat ID format: SEC-{SECTION}-R{ROW}-S{SEAT}
      const seatPattern = /^SEC-([A-Z0-9]+)-R([0-9]+)-S([0-9]+)$/;
      const match = seatId.match(seatPattern);

      if (!match) {
        console.warn(`Invalid seat ID format: ${seatId} (expected: SEC-{SECTION}-R{ROW}-S{SEAT})`);
        return;
      }

      const [, section, row, seat] = match;

      // Extract coordinates based on element type
      let x = 0;
      let y = 0;

      if ($el.is('rect')) {
        x = parseFloat($el.attr('x') || '0');
        y = parseFloat($el.attr('y') || '0');
      } else if ($el.is('circle')) {
        x = parseFloat($el.attr('cx') || '0');
        y = parseFloat($el.attr('cy') || '0');
      } else if ($el.is('path')) {
        // For paths, try to extract transform translate values
        const transform = $el.attr('transform');
        if (transform) {
          const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
          if (translateMatch) {
            x = parseFloat(translateMatch[1]);
            y = parseFloat(translateMatch[2]);
          }
        }
      }

      // Add to seat index
      seatIndex.set(seatId, {
        id: seatId,
        section,
        row,
        seat,
        coordinates: { x, y },
      });

      sectionsSet.add(section);
    });

    if (seatIndex.size === 0) {
      throw new Error('No valid seats found in SVG. Ensure seats have IDs matching format: SEC-{SECTION}-R{ROW}-S{SEAT}');
    }

    return {
      seatIndex,
      totalSeats: seatIndex.size,
      sections: Array.from(sectionsSet).sort(),
    };
  } catch (error: any) {
    console.error('Error parsing SVG:', error);
    throw new Error(`Failed to parse SVG: ${error.message}`);
  }
};

/**
 * Validate SVG content
 */
export const validateSvg = (svgContent: string): boolean => {
  try {
    const $ = cheerio.load(svgContent, { xmlMode: true });

    // Check if it's a valid SVG
    const svgElement = $('svg');
    if (svgElement.length === 0) {
      throw new Error('Invalid SVG: No <svg> element found');
    }

    // Check for minimum size
    if (svgContent.length < 100) {
      throw new Error('Invalid SVG: Content too short');
    }

    return true;
  } catch (error: any) {
    throw new Error(`SVG validation failed: ${error.message}`);
  }
};

/**
 * Sanitize SVG content (remove scripts, external links)
 */
export const sanitizeSvg = (svgContent: string): string => {
  try {
    const $ = cheerio.load(svgContent, { xmlMode: true });

    // Remove script tags
    $('script').remove();

    // Remove event handlers
    $('*').each((_, element) => {
      const $el = $(element);
      const attrs = $el.attr();

      if (attrs) {
        Object.keys(attrs).forEach((attr) => {
          if (attr.startsWith('on')) {
            $el.removeAttr(attr);
          }
        });
      }
    });

    // Remove external references
    $('*[href^="javascript:"]').removeAttr('href');
    $('*[xlink\\:href^="javascript:"]').removeAttr('xlink:href');

    return $.xml();
  } catch (error: any) {
    console.error('Error sanitizing SVG:', error);
    throw new Error(`Failed to sanitize SVG: ${error.message}`);
  }
};
