/**
 * @mesh/domain — lógica pura de MESH.
 *
 * Sin React, sin React Native, sin Supabase. Esa restricción está impuesta por
 * lint (ver eslint.config.mjs) y es la razón por la que los motores de gusto y
 * matching se pueden testear sin simulador y reutilizar desde el seeder.
 * Ver ADR-001.
 */

export { MATCHING_VERSION, TASTE_VERSION } from './version.ts'
export type { MatchingVersion, TasteVersion } from './version.ts'

export {
  CATEGORIES,
  STYLES,
  findStyle,
  isKnownCategory,
  isKnownStyle,
  stylesForCategory,
} from './taxonomy/taxonomy.ts'
export type {
  CategoryDefinition,
  CategorySlug,
  StyleDefinition,
} from './taxonomy/taxonomy.ts'

export {
  LOCATIONS,
  findLocation,
  isKnownLocation,
  isSameMetro,
} from './taxonomy/locations.ts'
export type { LocationDefinition } from './taxonomy/locations.ts'

export type {
  Availability,
  AvailabilityStatus,
  Interaction,
  InteractionSource,
  InteractionVerdict,
  Location,
  Match,
  MatchBand,
  MatchComponents,
  MatchReason,
  MoneyRange,
  PortfolioItem,
  Professional,
  ProjectBrief,
  ProjectStatus,
  ProjectTiming,
  StyleProficiency,
  TasteProfile,
  Uuid,
  WeightedStyle,
} from './types/core.ts'

export {
  STYLE_WEIGHT_TOLERANCE,
  artistSchema,
  availabilitySchema,
  contactSchema,
  portfolioItemSchema,
  portfolioSchema,
  priceSchema,
  validatePortfolioStyles,
} from './content/schemas.ts'
export type {
  ArtistContent,
  PortfolioContent,
  PortfolioItemContent,
} from './content/schemas.ts'

export {
  FORBIDDEN_EXIF_TAGS,
  MAX_LIVE_PROJECTS,
  MAX_PROJECT_REFERENCES,
  MAX_UPLOAD_BYTES,
  MAX_USER_STORAGE_BYTES,
  PORTFOLIO_SIZES,
  StoragePathError,
  UPLOAD_MIME_TYPES,
  avatarPath,
  isOwnedPath,
  isUploadMimeType,
  portfolioPath,
  referencePath,
  validateUpload,
} from './storage/paths.ts'
export type {
  Bucket,
  PortfolioSize,
  UploadCandidate,
  UploadMimeType,
} from './storage/paths.ts'
