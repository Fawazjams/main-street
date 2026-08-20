/**
 * Craigslist publishes each photo at several fixed sizes, addressed by a
 * suffix on the same URL. Asking for the size we actually need keeps a card
 * thumbnail at ~7KB instead of pulling a 75KB gallery image.
 *
 * Sizes that exist: 300x300, 600x450, 1200x900. There is no 50x50.
 */
export type PhotoSize = "300x300" | "600x450" | "1200x900";

export const photoAt = (url: string, size: PhotoSize) =>
  url.replace(/_\d+x\d+\.jpg$/i, `_${size}.jpg`);
