/**
 * Custom Image Loader for CDN Integration
 * Optimizes image delivery through CDN with proper formatting and sizing
 */

interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

// CDN configuration
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.6fbmethodologies.com';
const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || 'https://d1example.cloudfront.net';

/**
 * Custom image loader that optimizes images through CDN
 */
export default function imageLoader({ src, width, quality = 75 }: ImageLoaderProps): string {
  // Handle external URLs - return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Handle absolute paths
  if (src.startsWith('/')) {
    src = src.slice(1);
  }

  // Determine the best format based on browser support
  // This would be enhanced with browser detection in a real implementation
  const format = getOptimalFormat();

  // Build CDN URL with optimization parameters
  const cdnUrl = `${CDN_BASE_URL}/${src}`;

  // Add optimization parameters
  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    f: format,
    // Add auto format detection
    auto: 'format,compress',
  });

  return `${cdnUrl}?${params.toString()}`;
}

/**
 * Determine optimal image format
 * In a real implementation, this would use browser detection
 */
function getOptimalFormat(): string {
  // For server-side rendering, default to WebP
  // Client-side would detect browser support
  if (typeof window === 'undefined') {
    return 'webp';
  }

  // Check browser support (simplified)
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  // Check AVIF support
  if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif';
  }

  // Check WebP support
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp';
  }

  // Fallback to JPEG
  return 'jpeg';
}

/**
 * Generate responsive image srcSet for different device sizes
 */
export function generateSrcSet(
  src: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920, 2048],
  quality: number = 75
): string {
  return sizes
    .map(size => `${imageLoader({ src, width: size, quality })} ${size}w`)
    .join(', ');
}

/**
 * Generate optimal sizes attribute for responsive images
 */
export function generateSizes(breakpoints: { [key: string]: string } = {}): string {
  const defaultBreakpoints = {
    '(max-width: 640px)': '100vw',
    '(max-width: 768px)': '100vw',
    '(max-width: 1024px)': '50vw',
    '(max-width: 1280px)': '33vw',
    ...breakpoints,
  };

  const sizeEntries = Object.entries(defaultBreakpoints);
  const mediaQueries = sizeEntries.slice(0, -1).map(([media, size]) => `${media} ${size}`);
  const defaultSize = sizeEntries[sizeEntries.length - 1][1];

  return [...mediaQueries, defaultSize].join(', ');
}

/**
 * Preload critical images for better performance
 */
export function preloadImage(src: string, width: number = 1920, quality: number = 75): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = imageLoader({ src, width, quality });

  // Add to head
  document.head.appendChild(link);
}

/**
 * Lazy load images with Intersection Observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
          this.observer?.unobserve(img);
          this.images.delete(img);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });
  }

  observe(img: HTMLImageElement): void {
    if (!this.observer) {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
      return;
    }

    this.images.add(img);
    this.observer.observe(img);
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcSet = img.dataset.srcset;

    if (src) {
      img.src = src;
    }

    if (srcSet) {
      img.srcset = srcSet;
    }

    img.classList.remove('lazy-loading');
    img.classList.add('lazy-loaded');

    // Trigger load event for any listeners
    img.dispatchEvent(new Event('load'));
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.images.clear();
    }
  }
}

/**
 * Image placeholder generator for better UX
 */
export function generatePlaceholder(width: number, height: number, color: string = '#f0f0f0'): string {
  // Generate a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle" dy=".35em">
        Loading...
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Blur placeholder for smooth loading transitions
 */
export function generateBlurPlaceholder(originalSrc: string): string {
  // In a real implementation, this would generate a low-quality blurred version
  // For now, return a simple gradient placeholder
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Export singleton instance for lazy loading
export const lazyLoader = new LazyImageLoader();