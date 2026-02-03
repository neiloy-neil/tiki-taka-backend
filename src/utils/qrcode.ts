import QRCode from 'qrcode';

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg';
  quality?: number;
  margin?: number;
  width?: number;
}

/**
 * Generate QR code as a data URL (base64)
 */
export const generateQRCodeDataURL = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<string> => {
  try {
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'H',
      type: options.type || 'image/png',
      quality: options.quality || 0.92,
      margin: options.margin || 1,
      width: options.width || 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    };

    const dataURL = await QRCode.toDataURL(data, qrOptions);
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as a buffer (for uploading to Cloudinary)
 */
export const generateQRCodeBuffer = async (
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> => {
  try {
    const qrOptions = {
      errorCorrectionLevel: (options.errorCorrectionLevel || 'H') as 'L' | 'M' | 'Q' | 'H',
      type: 'png' as const,
      quality: options.quality || 0.92,
      margin: options.margin || 1,
      width: options.width || 400,
    };

    const buffer = await QRCode.toBuffer(data, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
};
