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
  locationLabel,
  neighborhoodsOf,
  proximity,
} from './taxonomy/locations.ts'
export type {
  LocationDefinition,
  LocationKind,
  Proximity,
} from './taxonomy/locations.ts'

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
  FIXTURE_SLUG_PREFIX,
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
  PortfolioFormat,
  PortfolioSize,
  UploadCandidate,
  UploadMimeType,
} from './storage/paths.ts'

export {
  DISPLAY_MIN_SCORE,
  DISPLAY_MIN_SUPPORT,
  INTERACTION_VALUE,
  READY_MIN_INTERACTIONS,
  READY_MIN_SCORE,
  READY_MIN_STYLES,
  SATURATION_K,
} from './taste/config.ts'
export { computeTaste, saturate, topStyles, valueOf } from './taste/taste.ts'
export type {
  PieceStyles,
  TasteEvidence,
  TasteInput,
  TasteResult,
} from './taste/taste.ts'

export {
  AMBIENT_TASTE_WEIGHT,
  AVAILABILITY_STALE_DAYS,
  AVAILABILITY_VALUE,
  AVERSION_FACTOR,
  BAND_GOOD,
  BAND_STRONG,
  COMPONENT_WEIGHTS,
  LOCATION_VALUE,
  MAX_REASONS,
  PROJECT_WEIGHT,
  REASON_MIN_CONTRIBUTION,
  SCORE_FLOOR,
  TOP_STYLES,
  type ComponentName,
} from './matching/config.ts'
export {
  availabilityComponent,
  bandFor,
  blendProjectStyles,
  daysBetween,
  deriveReasons,
  locationComponent,
  matchProfessionals,
  priceComponent,
  scoreProfessional,
  styleComponent,
} from './matching/matching.ts'
export type {
  Candidate,
  MatchContext,
  MatchOptions,
  ScoreBreakdown,
  ScoredMatch,
} from './matching/matching.ts'

export {
  composeContactMessage,
  instagramUrl,
  whatsappUrl,
} from './contact/message.ts'
export type { ContactLabels, ContactMessageInput } from './contact/message.ts'

export { haversineKm, roundDistanceKm } from './geo/distance.ts'
export type { GeoCoordinates } from './geo/distance.ts'
