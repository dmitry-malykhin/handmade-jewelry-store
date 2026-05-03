/**
 * Senichka studio identity — single source of truth used across product detail,
 * footer, about page, and email templates. Change here to update everywhere.
 *
 * Issue #233 — surfaces the maker / origin so customers can see who crafted
 * their piece. "Made in [city]" carries +3-6% conversion lift on premium
 * handmade per Etsy seller research (see docs/19).
 */

export const STUDIO_NAME = 'Senichka'

/**
 * Public-facing city / region for the studio. Shows up in trust signals
 * ("Handcrafted in {city}") and the maker provenance line. Keep human-readable
 * (e.g. "Irvine, CA") rather than full address.
 */
export const STUDIO_CITY = 'Irvine, CA'
