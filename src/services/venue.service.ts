import { Venue, IVenue } from '../models/Venue.model.js';
import { cloudinary } from '../config/cloudinary.js';
import { parseSvgSeats, validateSvg, sanitizeSvg } from './svg.service.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { generateSeatMap, validateTemplateConfig } from './seatMapGenerator.service.js';
import { VenueTemplateConfig, VenueLayoutResult } from '../types/templates.js';

export interface CreateVenueInput {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdBy: string;
}

export interface UploadSvgInput {
  venueId: string;
  svgContent: string;
}

/**
 * Create a new venue
 */
export const createVenue = async (input: CreateVenueInput): Promise<IVenue> => {
  const { name, address, createdBy } = input;

  // Check if venue with same name already exists
  const existing = await Venue.findOne({ name, isActive: true });
  if (existing) {
    throw new AppError('Venue with this name already exists', 409);
  }

  // Create venue (without seat map initially)
  const venue = await Venue.create({
    name,
    address,
    seatMapSvg: '', // Will be uploaded separately
    seatIndex: new Map(),
    totalSeats: 0,
    createdBy,
    isActive: true,
  });

  return venue;
};

/**
 * Upload and parse SVG seat map
 */
export const uploadSvgSeatMap = async (input: UploadSvgInput): Promise<IVenue> => {
  const { venueId, svgContent } = input;

  // Find venue
  const venue = await Venue.findById(venueId);
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  // Validate SVG
  validateSvg(svgContent);

  // Sanitize SVG (remove scripts, etc.)
  const sanitizedSvg = sanitizeSvg(svgContent);

  // Parse seats from SVG
  const parsedSeats = parseSvgSeats(sanitizedSvg);

  if (parsedSeats.totalSeats === 0) {
    throw new AppError('No valid seats found in SVG', 400);
  }

  // Upload SVG to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(
    `data:image/svg+xml;base64,${Buffer.from(sanitizedSvg).toString('base64')}`,
    {
      folder: 'tiki-taka/venue-seat-maps',
      public_id: `venue-${venueId}-seatmap`,
      resource_type: 'image',
      format: 'svg',
    }
  );

  // Update venue with SVG URL and seat index
  venue.seatMapSvg = uploadResult.secure_url;
  venue.seatIndex = parsedSeats.seatIndex;
  venue.totalSeats = parsedSeats.totalSeats;

  await venue.save();

  return venue;
};

/**
 * Get venue by ID
 */
export const getVenueById = async (venueId: string): Promise<IVenue | null> => {
  return Venue.findById(venueId);
};

/**
 * Get all venues
 */
export const getAllVenues = async (filters: {
  city?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ venues: IVenue[]; total: number; page: number; pages: number }> => {
  const { city, isActive = true, page = 1, limit = 20 } = filters;

  const query: any = { isActive };

  if (city) {
    query['address.city'] = new RegExp(city, 'i');
  }

  const total = await Venue.countDocuments(query);
  const venues = await Venue.find(query)
    .select('-seatIndex') // Don't return full seat index in list view
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    venues,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

/**
 * Update venue
 */
export const updateVenue = async (
  venueId: string,
  updates: Partial<CreateVenueInput>
): Promise<IVenue | null> => {
  const venue = await Venue.findById(venueId);

  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  // Update fields
  if (updates.name) venue.name = updates.name;
  if (updates.address) venue.address = { ...venue.address, ...updates.address };

  await venue.save();

  return venue;
};

/**
 * Delete venue (soft delete)
 */
export const deleteVenue = async (venueId: string): Promise<void> => {
  const venue = await Venue.findById(venueId);

  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  // Check if venue has active events
  // TODO: Add this check when Event service is implemented

  venue.isActive = false;
  await venue.save();
};

/**
 * Generate venue seat map preview from template (without saving to DB)
 */
export const generateVenuePreview = (config: VenueTemplateConfig): VenueLayoutResult => {
  // Validate configuration
  validateTemplateConfig(config);

  // Generate seat map
  const layoutResult = generateSeatMap(config);

  return layoutResult;
};

/**
 * Create venue with template-generated seat map
 */
export const createVenueFromTemplate = async (input: {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  templateConfig: VenueTemplateConfig;
  createdBy: string;
}): Promise<IVenue> => {
  const { name, address, templateConfig, createdBy } = input;

  // Check if venue with same name already exists
  const existing = await Venue.findOne({ name, isActive: true });
  if (existing) {
    throw new AppError('Venue with this name already exists', 409);
  }

  // Validate and generate seat map
  validateTemplateConfig(templateConfig);
  const layoutResult = generateSeatMap(templateConfig);

  // Create venue with generated seat map
  const venue = await Venue.create({
    name,
    address,
    seatMapSvg: layoutResult.seatMapSvg,
    seatIndex: layoutResult.seatIndex,
    totalSeats: layoutResult.totalSeats,
    createdBy,
    isActive: true,
  });

  return venue;
};
