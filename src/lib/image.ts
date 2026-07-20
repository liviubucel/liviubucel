/**
 * Image optimization utilities
 * Uses Astro's built-in Image component with Cloudflare Images
 */

export interface ImageConfig {
  src: string | ImageMetadata;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'png' | 'jpg';
  quality?: number;
  densities?: (number | string)[];
  sizes?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
}

export interface ImageMetadata {
  src: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Get responsive sizes string for different breakpoints
 */
export function getResponsiveSizes(): string {
  return [
    '(max-width: 640px) 100vw',
    '(max-width: 1024px) 50vw',
    '(max-width: 1280px) 33vw',
    '25vw',
  ].join(', ');
}

/**
 * Get image quality based on format
 */
export function getImageQuality(format: string = 'webp'): number {
  const qualities: Record<string, number> = {
    webp: 80,
    avif: 75,
    jpg: 85,
    png: 90,
  };
  return qualities[format] || 80;
}

/**
 * Get device pixel ratios for responsive images
 */
export function getDeviceDensities(): (number | string)[] {
  return [1, 2];
}

/**
 * Optimize image for featured/hero images
 */
export function getHeroImageProps(src: string | ImageMetadata): ImageConfig {
  return {
    src,
    alt: 'Featured image',
    format: 'webp',
    quality: 85,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px',
    densities: getDeviceDensities(),
    loading: 'eager',
  };
}

/**
 * Optimize image for thumbnail/card images
 */
export function getThumbnailImageProps(src: string | ImageMetadata, alt: string): ImageConfig {
  return {
    src,
    alt,
    format: 'webp',
    quality: 75,
    width: 400,
    height: 300,
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
    densities: getDeviceDensities(),
    loading: 'lazy',
  };
}

/**
 * Optimize image for inline content
 */
export function getInlineImageProps(src: string | ImageMetadata, alt: string): ImageConfig {
  return {
    src,
    alt,
    format: 'webp',
    quality: 80,
    sizes: getResponsiveSizes(),
    densities: getDeviceDensities(),
    loading: 'lazy',
  };
}

/**
 * Convert image to srcset format
 */
export function generateSrcSet(src: string, densities: (number | string)[] = [1, 2]): string {
  return densities
    .map((density) => {
      if (typeof density === 'number') {
        return `${src} ${density}x`;
      }
      return `${src} ${density}`;
    })
    .join(', ');
}
