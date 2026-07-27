import { AppError } from "@spaceman/app-errors";
import type {
  CheckoutSession,
  DeliveryZone,
  DriverAssignment,
  FeeRule,
  ImportBatch,
  ImportBatchRow,
  Item,
  Notification,
  Order,
  PlatformSettings,
  Store,
  UserProfile,
} from "@spaceman/app-types";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

export interface PageRequest {
  cursor?: string;
  limit?: number;
  category?: string;
  search?: string;
}

export interface Page<TRecord> {
  records: TRecord[];
  nextCursor?: string;
}

export interface UserRepository {
  getById(userId: string): Promise<UserProfile | null>;
  listStaff(page: PageRequest): Promise<Page<UserProfile>>;
}

export interface StoreRepository {
  getById(storeId: string): Promise<Store | null>;
  listActive(page: PageRequest): Promise<Page<Store>>;
  listForMerchant(merchantId: string, page: PageRequest): Promise<Page<Store>>;
  listPendingForMerchant(
    merchantId: string,
    page: PageRequest,
  ): Promise<Page<Store>>;
  listForAdmin(page: PageRequest): Promise<Page<Store>>;
}

export interface ItemRepository {
  getById(itemId: string): Promise<Item | null>;
  listActiveForStore(storeId: string, page: PageRequest): Promise<Page<Item>>;
  listForStore(storeId: string, page: PageRequest): Promise<Page<Item>>;
}

export interface ImportBatchRepository {
  getById(batchId: string): Promise<ImportBatch | null>;
  listForStore(storeId: string, page: PageRequest): Promise<Page<ImportBatch>>;
  listRows(batchId: string, page: PageRequest): Promise<Page<ImportBatchRow>>;
}

export interface OrderRepository {
  getById(orderId: string): Promise<Order | null>;
  listForCustomer(customerId: string, page: PageRequest): Promise<Page<Order>>;
  listOperationalForStore(
    storeId: string,
    page: PageRequest,
  ): Promise<Page<Order>>;
}

export interface CheckoutSessionRepository {
  getById(checkoutSessionId: string): Promise<CheckoutSession | null>;
}

export interface CheckoutConfigurationRepository {
  getSettings(): Promise<PlatformSettings | null>;
  getDeliveryZone(deliveryZoneId: string): Promise<DeliveryZone | null>;
  getFeeRule(feeRuleId: string): Promise<FeeRule | null>;
  listDeliveryZones(page: PageRequest): Promise<Page<DeliveryZone>>;
  listFeeRules(
    deliveryZoneId: string,
    page: PageRequest,
  ): Promise<Page<FeeRule>>;
}

export interface DriverAssignmentRepository {
  getByOrderId(orderId: string): Promise<DriverAssignment | null>;
  listActiveForDriver(
    driverId: string,
    page: PageRequest,
  ): Promise<Page<DriverAssignment>>;
}

export interface NotificationRepository {
  listForRecipient(
    recipientId: string,
    page: PageRequest,
  ): Promise<Page<Notification>>;
}

export interface RepositoryBundle {
  users: UserRepository;
  stores: StoreRepository;
  items: ItemRepository;
  importBatches: ImportBatchRepository;
  checkoutSessions: CheckoutSessionRepository;
  checkoutConfiguration: CheckoutConfigurationRepository;
  orders: OrderRepository;
  assignments: DriverAssignmentRepository;
  notifications: NotificationRepository;
}

const MAX_PAGE_SIZE = 50;

function pageSize(request: PageRequest): number {
  return Math.max(1, Math.min(request.limit ?? 20, MAX_PAGE_SIZE));
}

export function normalizeFirestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeFirestoreValue);
  if (value === null || typeof value !== "object") return value;
  if ("toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const date = toDate.call(value) as unknown;
      if (date instanceof Date && Number.isFinite(date.getTime()))
        return date.toISOString();
    }
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      normalizeFirestoreValue(entry),
    ]),
  );
}

function recordFromSnapshot<TRecord extends { id: string }>(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): TRecord {
  const data = normalizeFirestoreValue(snapshot.data()) as Record<
    string,
    unknown
  >;

  return {
    ...data,
    id: snapshot.id,
  } as unknown as TRecord;
}

async function readById<TRecord extends { id: string }>(
  firestore: Firestore,
  collectionName: string,
  id: string,
): Promise<TRecord | null> {
  const snapshot = await getDoc(doc(firestore, collectionName, id));
  return snapshot.exists()
    ? recordFromSnapshot<TRecord>(
        snapshot as QueryDocumentSnapshot<DocumentData>,
      )
    : null;
}

async function readPage<TRecord extends { id: string }>(
  firestore: Firestore,
  collectionName: string,
  request: PageRequest,
  constraints: QueryConstraint[],
): Promise<Page<TRecord>> {
  const reference = collection(firestore, collectionName);
  const cursorSnapshot = request.cursor
    ? await getDoc(doc(firestore, collectionName, request.cursor))
    : undefined;
  if (
    request.cursor &&
    cursorSnapshot !== undefined &&
    !cursorSnapshot.exists()
  ) {
    throw new AppError({
      code: "invalid_input",
      source: "app-database",
      message: `Catalog cursor ${request.cursor} does not exist.`,
      userMessage:
        "This catalog page is no longer available. Refresh and try again.",
    });
  }

  const size = pageSize(request);
  const snapshot = await getDocs(
    query(
      reference,
      ...constraints,
      orderBy(documentId()),
      ...(cursorSnapshot?.exists() ? [startAfter(cursorSnapshot)] : []),
      limit(size + 1),
    ),
  );
  const visible = snapshot.docs.slice(0, size);
  const records = visible.map((item) => recordFromSnapshot<TRecord>(item));
  const hasNextPage = snapshot.docs.length > size;
  const last = visible.at(-1);
  return {
    records,
    ...(hasNextPage && last !== undefined ? { nextCursor: last.id } : {}),
  };
}

async function readOrderedPage<TRecord extends { id: string }>(
  firestore: Firestore,
  collectionName: string,
  request: PageRequest,
  constraints: QueryConstraint[],
): Promise<Page<TRecord>> {
  const reference = collection(firestore, collectionName);
  const cursorSnapshot = request.cursor
    ? await getDoc(doc(firestore, collectionName, request.cursor))
    : undefined;
  if (
    request.cursor &&
    cursorSnapshot !== undefined &&
    !cursorSnapshot.exists()
  )
    throw new AppError({
      code: "invalid_input",
      source: "app-database",
      message: `Cursor ${request.cursor} does not exist.`,
      userMessage: "This page is no longer available. Refresh and try again.",
    });

  const size = pageSize(request);
  const snapshot = await getDocs(
    query(
      reference,
      ...constraints,
      ...(cursorSnapshot?.exists() ? [startAfter(cursorSnapshot)] : []),
      limit(size + 1),
    ),
  );
  const visible = snapshot.docs.slice(0, size);
  const records = visible.map((item) => recordFromSnapshot<TRecord>(item));
  const last = visible.at(-1);
  return {
    records,
    ...(snapshot.docs.length > size && last ? { nextCursor: last.id } : {}),
  };
}

export function normalizeCatalogSearch(value: string): string {
  return value.trim().toLocaleLowerCase("en-ZA").replace(/\s+/g, " ");
}

export function normalizeCatalogPageRequest(
  request: PageRequest = {},
): Required<Pick<PageRequest, "limit">> & PageRequest {
  return {
    ...request,
    limit: pageSize(request),
    ...(request.search === undefined
      ? {}
      : { search: normalizeCatalogSearch(request.search) }),
  };
}

function catalogFilters(
  request: PageRequest,
  categoryField: "category" | "categoryLabel",
): QueryConstraint[] {
  const search =
    request.search === undefined
      ? undefined
      : normalizeCatalogSearch(request.search);
  return [
    ...(request.category ? [where(categoryField, "==", request.category)] : []),
    ...(search
      ? [
          where("searchName", ">=", search),
          where("searchName", "<=", `${search}\uf8ff`),
          orderBy("searchName"),
        ]
      : []),
  ];
}

export function createFirestoreRepositories(
  firestore: Firestore,
): Pick<
  RepositoryBundle,
  | "stores"
  | "items"
  | "importBatches"
  | "checkoutSessions"
  | "checkoutConfiguration"
  | "orders"
> {
  return {
    stores: {
      getById(storeId) {
        return readById<Store>(firestore, "stores", storeId);
      },
      listActive(request) {
        return readPage<Store>(firestore, "stores", request, [
          where("status", "==", "active"),
          where("approvalState", "==", "approved"),
          ...catalogFilters(request, "category"),
        ]);
      },
      listForMerchant(merchantId, request) {
        return readPage<Store>(firestore, "stores", request, [
          where("merchantId", "==", merchantId),
          ...catalogFilters(request, "category"),
        ]);
      },
      listPendingForMerchant(merchantId, request) {
        return readPage<Store>(firestore, "stores", request, [
          where("merchantId", "==", merchantId),
          where("status", "==", "draft"),
          where("approvalState", "in", ["pending", "rejected"]),
          ...catalogFilters(request, "category"),
        ]);
      },
      listForAdmin(request) {
        return readPage<Store>(
          firestore,
          "stores",
          request,
          catalogFilters(request, "category"),
        );
      },
    },
    items: {
      getById(itemId) {
        return readById<Item>(firestore, "items", itemId);
      },
      listActiveForStore(storeId, request) {
        return readPage<Item>(firestore, "items", request, [
          where("storeId", "==", storeId),
          where("status", "==", "active"),
          ...catalogFilters(request, "categoryLabel"),
        ]);
      },
      listForStore(storeId, request) {
        return readPage<Item>(firestore, "items", request, [
          where("storeId", "==", storeId),
          ...catalogFilters(request, "categoryLabel"),
        ]);
      },
    },
    importBatches: {
      getById(batchId) {
        return readById<ImportBatch>(firestore, "importBatches", batchId);
      },
      listForStore(storeId, request) {
        return readPage<ImportBatch>(firestore, "importBatches", request, [
          where("storeId", "==", storeId),
        ]);
      },
      listRows(batchId, request) {
        return readPage<ImportBatchRow>(
          firestore,
          `importBatches/${batchId}/rows`,
          request,
          [],
        );
      },
    },
    checkoutSessions: {
      getById(checkoutSessionId) {
        return readById<CheckoutSession>(
          firestore,
          "checkoutSessions",
          checkoutSessionId,
        );
      },
    },
    checkoutConfiguration: {
      getSettings() {
        return readById<PlatformSettings>(
          firestore,
          "platformSettings",
          "default",
        );
      },
      getDeliveryZone(deliveryZoneId) {
        return readById<DeliveryZone>(
          firestore,
          "deliveryZones",
          deliveryZoneId,
        );
      },
      getFeeRule(feeRuleId) {
        return readById<FeeRule>(firestore, "feeRules", feeRuleId);
      },
      listDeliveryZones(request) {
        return readOrderedPage<DeliveryZone>(
          firestore,
          "deliveryZones",
          request,
          [orderBy("name")],
        );
      },
      listFeeRules(deliveryZoneId, request) {
        return readOrderedPage<FeeRule>(firestore, "feeRules", request, [
          where("deliveryZoneId", "==", deliveryZoneId),
          orderBy("version", "desc"),
        ]);
      },
    },
    orders: {
      getById(orderId) {
        return readById<Order>(firestore, "orders", orderId);
      },
      listForCustomer(customerId, request) {
        return readOrderedPage<Order>(firestore, "orders", request, [
          where("customerId", "==", customerId),
          orderBy("createdAt", "desc"),
        ]);
      },
      listOperationalForStore(storeId, request) {
        return readOrderedPage<Order>(firestore, "orders", request, [
          where("storeId", "==", storeId),
          where("fulfillment.status", "in", [
            "paid",
            "confirmed",
            "preparing",
            "ready_for_pickup",
            "on_the_way",
          ]),
          orderBy("updatedAt", "desc"),
        ]);
      },
    },
  };
}
