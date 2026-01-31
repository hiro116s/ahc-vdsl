// Utility functions

// Base path constant injected by webpack DefinePlugin
declare const BASE_PATH: string;

/**
 * Get the base path for the application
 * In production (GitHub Pages), this will be '/ahc-vdsl'
 * In development, this will be ''
 */
export function getBasePath(): string {
    return BASE_PATH || '';
}

/**
 * Build a URL with the correct base path
 */
export function buildUrl(path: string): string {
    const basePath = getBasePath();
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${normalizedPath}`;
}
