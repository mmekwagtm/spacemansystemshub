import type {
  AppRole,
  AssignmentStatus,
  FulfillmentStatus,
  NeedsActionReason,
  PaymentStatus,
  RefundStatus,
  UserStatus
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

export type StoreStatus = "draft" | "active" | "suspended" | "archived";
export type ItemStatus = "draft" | "active" | "hidden" | "archived";

export interface Store extends DocumentMetadata {
  id: string;
  merchantId: string;
  name: string;
  status: StoreStatus;
  deliveryZoneIds: string[];
  address: DeliveryAddress;
  imageUrl?: string;
}

export interface Item extends DocumentMetadata {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  status: ItemStatus;
  price: Money;
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
export type NotificationOutboxStatus = "pending" | "sent" | "failed" | "suppressed";

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

export type ImportBatchStatus = "pending" | "validating" | "applied" | "failed" | "cancelled";

export interface ImportBatch extends DocumentMetadata {
  id: string;
  storeId: string;
  requestedBy: string;
  sourceType: "catalog_csv" | "catalog_api";
  status: ImportBatchStatus;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errorSummary?: string;
}

export type SettlementStatus = "pending" | "calculated" | "approved" | "paid" | "failed" | "void";

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
  status: StoreStatus;
  deliveryZoneIds: string[];
  address: DeliveryAddress;
  imageUrl?: string;
}

export interface UpsertItemInput {
  itemId?: string;
  storeId: string;
  name: string;
  description?: string;
  status: ItemStatus;
  price: Money;
  imageUrl?: string;
  categoryId?: string;
}

export interface RetireCatalogItemInput {
  itemId: string;
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
