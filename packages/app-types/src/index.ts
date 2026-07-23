import type {
  AppRole,
  AssignmentStatus,
  FulfillmentStatus,
  NeedsActionReason,
  PaymentStatus,
  RefundStatus,
  UserStatus,
} from "@spaceman/app-core";

export interface DocumentMetadata {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  testRunId?: string;
}

export interface Money {
  amountMinor: number;
  currency: "ZAR";
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DeliveryAddress {
  label: string;
  formattedAddress: string;
  coordinates: Coordinates;
  placeId?: string;
  instructions?: string;
}

export interface RoleScope {
  storeIds: string[];
  deliveryZoneIds: string[];
  regionIds: string[];
}

export interface UserProfile extends DocumentMetadata {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: UserStatus;
  scope: RoleScope;
  phoneE164?: string;
  archivedAt?: string;
}

export interface IdentityClaims extends RoleScope {
  role: AppRole;
  status: UserStatus;
}

export interface IdentitySession {
  uid: string;
  email: string;
  emailVerified: boolean;
  claims: IdentityClaims | null;
  profile: UserProfile | null;
}

export interface CustomerRegistrationInput {
  email: string;
  password: string;
  displayName: string;
  phoneE164?: string;
}

export interface BootstrapCustomerProfileInput {
  displayName: string;
  phoneE164?: string;
}

export type StoreStatus = "draft" | "active" | "suspended" | "archived";
export type ItemStatus = "draft" | "active" | "hidden" | "archived";
export type StoreApprovalState = "pending" | "approved" | "rejected";
export type CatalogSource =
  "manual" | "merchant" | "google_places" | "catalog_csv";

export interface CatalogMedia {
  sourcePath: string;
  thumbnailPath: string;
  altText: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  sourceUrl?: string;
  thumbnailUrl?: string;
  attribution?: string;
}

export interface OpeningHoursPeriod {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  closed: boolean;
  opensAt?: string;
  closesAt?: string;
}

export interface Store extends DocumentMetadata {
  id: string;
  merchantId: string;
  name: string;
  searchName: string;
  category: string;
  description: string;
  status: StoreStatus;
  approvalState: StoreApprovalState;
  source: CatalogSource;
  sourceId?: string;
  deliveryZoneIds: string[];
  address: DeliveryAddress;
  openingHours: OpeningHoursPeriod[];
  openForOrders: boolean;
  minimumOrder: Money;
  cardMedia?: CatalogMedia;
  heroMedia?: CatalogMedia;
  imageUrl?: string;
  rejectionReason?: string;
}

export interface Item extends DocumentMetadata {
  id: string;
  storeId: string;
  name: string;
  searchName: string;
  description?: string;
  status: ItemStatus;
  available: boolean;
  price: Money;
  categoryLabel: string;
  sortOrder: number;
  source: CatalogSource;
  sourceId?: string;
  importBatchId?: string;
  imageAlt: string;
  media?: CatalogMedia;
  imageUrl?: string;
  categoryId?: string;
}

export interface CheckoutLine {
  itemId: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

export type CheckoutSessionStatus =
  | "draft"
  | "quoted"
  | "payment_initialized"
  | "payment_pending"
  | "payment_verified"
  | "failed"
  | "expired"
  | "abandoned"
  | "consumed";

export interface CheckoutSession extends DocumentMetadata {
  id: string;
  customerId: string;
  storeId: string;
  status: CheckoutSessionStatus;
  lines: CheckoutLine[];
  deliveryAddress: DeliveryAddress;
  itemSubtotal: Money;
  deliveryFee: Money;
  serviceFee: Money;
  total: Money;
  feeRuleId: string;
  quoteExpiresAt: string;
  paystackReference?: string;
  paymentProvider: "paystack";
}

export interface PaymentState {
  status: PaymentStatus;
  provider: "paystack";
  reference: string;
  paidAt?: string;
  refundStatus: RefundStatus;
  refundRequestedAmount?: Money;
  refundedAmount?: Money;
}

export interface FulfillmentState {
  status: FulfillmentStatus;
  confirmedAt?: string;
  readyForPickupAt?: string;
  deliveredAt?: string;
}

export interface AssignmentState {
  status: AssignmentStatus;
  version: number;
  driverId?: string;
  assignedAt?: string;
}

export interface NeedsActionState {
  reasons: NeedsActionReason[];
  updatedAt: string;
}

export interface Order extends DocumentMetadata {
  id: string;
  checkoutSessionId: string;
  customerId: string;
  storeId: string;
  lines: CheckoutLine[];
  deliveryAddress: DeliveryAddress;
  itemSubtotal: Money;
  deliveryFee: Money;
  serviceFee: Money;
  total: Money;
  payment: PaymentState;
  fulfillment: FulfillmentState;
  assignment: AssignmentState;
  needsAction: NeedsActionState;
}

export interface PaymentEvent extends DocumentMetadata {
  id: string;
  checkoutSessionId: string;
  orderId?: string;
  provider: "paystack";
  providerEventId: string;
  reference: string;
  status: PaymentStatus;
  receivedAt: string;
  payloadHash: string;
}

export interface OrderEvent extends DocumentMetadata {
  id: string;
  orderId: string;
  actorId: string;
  actorRole: AppRole | "system";
  eventType: string;
  previousFulfillmentStatus?: FulfillmentStatus;
  nextFulfillmentStatus?: FulfillmentStatus;
  detail?: string;
}

export interface DriverAssignment extends DocumentMetadata {
  id: string;
  orderId: string;
  storeId: string;
  driverId?: string;
  assignmentStatus: AssignmentStatus;
  version: number;
}

export interface DriverLocation extends DocumentMetadata {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  driverId: string;
  coordinates: Coordinates;
  capturedAt: string;
  source: "foreground_active_delivery";
}

export interface Notification extends DocumentMetadata {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  route?: string;
}

export type NotificationChannel = "in_app" | "fcm";
export type NotificationOutboxStatus =
  "pending" | "sent" | "failed" | "suppressed";

export interface NotificationOutbox extends DocumentMetadata {
  id: string;
  recipientId: string;
  notificationId?: string;
  channel: NotificationChannel;
  status: NotificationOutboxStatus;
  deduplicationKey: string;
  attempts: number;
  lastAttemptAt?: string;
}

export interface Activity extends DocumentMetadata {
  id: string;
  actorId: string;
  actorRole: AppRole | "system";
  activityType: string;
  resourceType: string;
  resourceId: string;
  summary: string;
}

export interface AuditLog extends DocumentMetadata {
  id: string;
  actorId: string;
  actorRole: AppRole | "system";
  action: string;
  targetType: string;
  targetId: string;
  correlationId?: string;
  detail?: Record<string, string | number | boolean>;
}

export interface FeeRule extends DocumentMetadata {
  id: string;
  deliveryZoneId: string;
  name: string;
  active: boolean;
  currency: "ZAR";
  baseFee: Money;
  perKilometreFee: Money;
}

export interface DeliveryZone extends DocumentMetadata {
  id: string;
  name: string;
  active: boolean;
  serviceAreaVersion: number;
}

export interface PlatformSettings extends DocumentMetadata {
  id: "default";
  maintenanceMode: boolean;
  customerOrderingEnabled: boolean;
  mapsQuoteEnabled: boolean;
  paystackEnabled: boolean;
  notificationDeliveryEnabled: boolean;
}

export type ImportBatchStatus =
  | "staged"
  | "validating"
  | "ready"
  | "applying"
  | "applied"
  | "failed"
  | "cancelled";

export interface ImportBatchRow {
  id: string;
  batchId: string;
  rowNumber: number;
  selected: boolean;
  duplicateOf?: string;
  valid: boolean;
  errors: string[];
  normalized: Omit<UpsertItemInput, "itemId">;
}

export interface ImportBatch extends DocumentMetadata {
  id: string;
  storeId: string;
  requestedBy: string;
  sourceType: "google_places" | "catalog_csv";
  sourceReference?: string;
  status: ImportBatchStatus;
  contentHash: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  committedRows: number;
  errorSummary?: string;
}

export type SettlementStatus =
  "pending" | "calculated" | "approved" | "paid" | "failed" | "void";

export interface Settlement extends DocumentMetadata {
  id: string;
  storeId: string;
  periodStart: string;
  periodEnd: string;
  grossSales: Money;
  platformFees: Money;
  refunds: Money;
  netPayable: Money;
  status: SettlementStatus;
  paidAt?: string;
}

export interface CreateCheckoutSessionInput {
  storeId: string;
  lines: Array<Pick<CheckoutLine, "itemId" | "quantity">>;
  deliveryAddress: DeliveryAddress;
}

export interface FulfillmentTransitionInput {
  orderId: string;
  expectedCurrentStatus: FulfillmentStatus;
  nextStatus: FulfillmentStatus;
  reason?: string;
}

export interface DriverAssignmentInput {
  orderId: string;
  driverId: string;
  expectedVersion: number;
}

export interface DriverLocationInput {
  orderId: string;
  coordinates: Coordinates;
  capturedAt: string;
}

export interface CreateStaffUserInput {
  email: string;
  displayName: string;
  role: "merchant" | "driver" | "admin";
  scope: RoleScope;
  phoneE164?: string;
}

export interface UpdateUserStatusInput {
  userId: string;
  status: UserStatus;
}

export interface UpdateUserScopeInput {
  userId: string;
  scope: RoleScope;
}

export interface UpsertStoreInput {
  storeId?: string;
  merchantId: string;
  name: string;
  category?: string;
  description?: string;
  status: StoreStatus;
  deliveryZoneIds: string[];
  address: DeliveryAddress;
  openingHours?: OpeningHoursPeriod[];
  openForOrders?: boolean;
  minimumOrder?: Money;
  cardMedia?: CatalogMedia;
  heroMedia?: CatalogMedia;
  imageUrl?: string;
}

export interface SubmitMerchantStoreInput {
  storeId?: string;
  name: string;
  category: string;
  description: string;
  address: DeliveryAddress;
  openingHours: OpeningHoursPeriod[];
  minimumOrder: Money;
  cardMedia?: CatalogMedia;
  heroMedia?: CatalogMedia;
}

export interface ReviewStoreSubmissionInput {
  storeId: string;
  decision: "approve" | "reject";
  reason?: string;
  deliveryZoneIds?: string[];
}

export interface UpdateMerchantStoreInput {
  storeId: string;
  name: string;
  category: string;
  description: string;
  openingHours: OpeningHoursPeriod[];
  openForOrders: boolean;
  minimumOrder: Money;
  cardMedia?: CatalogMedia;
  heroMedia?: CatalogMedia;
}

export interface UpsertItemInput {
  itemId?: string;
  storeId: string;
  name: string;
  description?: string;
  status: ItemStatus;
  price: Money;
  available?: boolean;
  categoryLabel?: string;
  sortOrder?: number;
  source?: Extract<
    CatalogSource,
    "manual" | "merchant" | "catalog_csv"
  >;
  sourceId?: string;
  importBatchId?: string;
  imageAlt?: string;
  media?: CatalogMedia;
  imageUrl?: string;
  categoryId?: string;
}

export interface SetItemAvailabilityInput {
  itemId: string;
  available: boolean;
}

export interface RetireCatalogItemInput {
  itemId: string;
}

export interface StorePlaceSearchInput {
  query: string;
  sessionToken?: string;
}

export interface StorePlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string;
  category: string;
  coordinates: Coordinates;
}

export interface StageGoogleStoreImportInput {
  placeId: string;
  merchantId: string;
}

export interface StageCsvCatalogImportInput {
  storeId: string;
  csv: string;
}

export interface CommitCatalogImportInput {
  batchId: string;
  selectedRowIds: string[];
}

export interface CancelCatalogImportInput {
  batchId: string;
}

export interface CleanupCatalogMediaInput {
  storeId: string;
  sourcePath: string;
  thumbnailPath: string;
}

export interface CatalogPageRequest {
  cursor?: string;
  limit?: number;
  category?: string;
  search?: string;
}

export interface RefundRequestInput {
  orderId: string;
  reason: string;
  amountMinor?: number;
}

export interface ArchiveOrRedactAccountInput {
  userId: string;
  mode: "archive" | "redact";
  reason: string;
}

export interface CommandResult {
  id: string;
  acceptedAt: string;
}
