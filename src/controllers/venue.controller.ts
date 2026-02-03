import { Request, Response } from 'express';
import * as venueService from '../services/venue.service.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';

/**
 * Create new venue
 */
export const createVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await venueService.createVenue({
    ...req.body,
    createdBy: req.user!.userId,
  });

  res.status(201).json({
    success: true,
    message: 'Venue created successfully',
    data: venue,
  });
});

/**
 * Upload SVG seat map for venue
 */
export const uploadSvgSeatMap = asyncHandler(async (req: Request, res: Response) => {
  const { venueId } = req.params;
  const { svgContent } = req.body;

  if (!svgContent) {
    res.status(400).json({
      success: false,
      message: 'SVG content is required',
    });
    return;
  }

  const venue = await venueService.uploadSvgSeatMap({
    venueId,
    svgContent,
  });

  res.status(200).json({
    success: true,
    message: 'SVG seat map uploaded and parsed successfully',
    data: {
      id: venue._id,
      name: venue.name,
      totalSeats: venue.totalSeats,
      seatMapUrl: venue.seatMapSvg,
      sections: Array.from(new Set(Array.from(venue.seatIndex.values()).map((s) => s.section))),
    },
  });
});

/**
 * Get venue by ID
 */
export const getVenue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const venue = await venueService.getVenueById(id);

  if (!venue) {
    res.status(404).json({
      success: false,
      message: 'Venue not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: venue,
  });
});

/**
 * Get all venues
 */
export const getVenues = asyncHandler(async (req: Request, res: Response) => {
  const { city, isActive, page, limit } = req.query;

  const result = await venueService.getAllVenues({
    city: city as string,
    isActive: isActive === 'false' ? false : true,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  });

  res.status(200).json({
    success: true,
    data: result.venues,
    pagination: {
      total: result.total,
      page: result.page,
      pages: result.pages,
      limit: limit ? parseInt(limit as string) : 20,
    },
  });
});

/**
 * Update venue
 */
export const updateVenue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const venue = await venueService.updateVenue(id, req.body);

  if (!venue) {
    res.status(404).json({
      success: false,
      message: 'Venue not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Venue updated successfully',
    data: venue,
  });
});

/**
 * Delete venue (soft delete)
 */
export const deleteVenue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await venueService.deleteVenue(id);

  res.status(200).json({
    success: true,
    message: 'Venue deleted successfully',
  });
});

/**
 * Generate venue preview from template (without saving)
 * POST /api/v1/venues/preview
 */
export const generatePreview = asyncHandler(async (req: Request, res: Response) => {
  const { templateConfig } = req.body;

  if (!templateConfig) {
    res.status(400).json({
      success: false,
      message: 'Template configuration is required',
    });
    return;
  }

  const preview = venueService.generateVenuePreview(templateConfig);

  res.status(200).json({
    success: true,
    message: 'Preview generated successfully',
    data: {
      seatMapSvg: preview.seatMapSvg,
      totalSeats: preview.totalSeats,
      sections: preview.sections,
    },
  });
});

/**
 * Create venue from template
 * POST /api/v1/venues/from-template
 */
export const createVenueFromTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, address, templateConfig } = req.body;

  if (!name || !address || !templateConfig) {
    res.status(400).json({
      success: false,
      message: 'Name, address, and templateConfig are required',
    });
    return;
  }

  const venue = await venueService.createVenueFromTemplate({
    name,
    address,
    templateConfig,
    createdBy: req.user!.userId,
  });

  res.status(201).json({
    success: true,
    message: 'Venue created from template successfully',
    data: {
      id: venue._id,
      name: venue.name,
      address: venue.address,
      totalSeats: venue.totalSeats,
      seatMapSvg: venue.seatMapSvg,
    },
  });
});
