import type {
  CallableGateway,
  CatalogMediaGateway,
  CatalogMediaUpload,
} from "@spaceman/app-firebase";
import type { AppError } from "@spaceman/app-errors";
import type {
  Page,
  PageRequest,
  RepositoryBundle,
} from "@spaceman/app-database";
import type {
  BootstrapCustomerProfileInput,
  CheckoutQuoteResult,
  CheckoutSession,
  CommandResult,
  CreateCheckoutSessionInput,
  CustomerRegistrationInput,
  CreateStaffUserInput,
  DeliveryAddressCandidate,
  DeliveryZone,
  DriverAssignmentInput,
  DriverLocationInput,
  FeeRule,
  FulfillmentTransitionInput,
  IdentitySession,
  ImportBatch,
  ImportBatchRow,
  InitializePaystackPaymentInput,
  Item,
  Order,
  PaystackPaymentAuthorization,
  PaystackPaymentVerification,
  PlatformSettings,
  PublishDeliveryFeeRuleInput,
  SearchDeliveryAddressesInput,
  SetItemAvailabilityInput,
  StageCsvCatalogImportInput,
  StageGoogleStoreImportInput,
  Store,
  StorePlaceCandidate,
  StorePlaceSearchInput,
  SubmitMerchantStoreInput,
  ReviewStoreSubmissionInput,
  UpdateMerchantStoreInput,
  UpdateCheckoutSettingsInput,
  UpsertItemInput,
  UpsertDeliveryZoneInput,
  UpsertStoreInput,
  RetireCatalogItemInput,
  CommitCatalogImportInput,
  CancelCatalogImportInput,
  CatalogMedia,
  CleanupCatalogMediaInput,
  UpdateUserScopeInput,
  UpdateUserStatusInput,
  VerifyPaystackPaymentInput,
} from "@spaceman/app-types";
import {
  bootstrapCustomerProfileInputSchema,
  cancelCatalogImportInputSchema,
  cleanupCatalogMediaInputSchema,
  commitCatalogImportInputSchema,
  createCheckoutSessionInputSchema,
  customerRegistrationInputSchema,
  createStaffUserInputSchema,
  driverAssignmentInputSchema,
  driverLocationInputSchema,
  fulfillmentTransitionInputSchema,
  initializePaystackPaymentInputSchema,
  publishDeliveryFeeRuleInputSchema,
  retireCatalogItemInputSchema,
  reviewStoreSubmissionInputSchema,
  setItemAvailabilityInputSchema,
  searchDeliveryAddressesInputSchema,
  stageCsvCatalogImportInputSchema,
  stageGoogleStoreImportInputSchema,
  storePlaceSearchInputSchema,
  submitMerchantStoreInputSchema,
  updateUserScopeInputSchema,
  updateUserStatusInputSchema,
  updateCheckoutSettingsInputSchema,
  updateMerchantStoreInputSchema,
  upsertDeliveryZoneInputSchema,
  upsertItemInputSchema,
  upsertStoreInputSchema,
  verifyPaystackPaymentInputSchema,
} from "@spaceman/app-validation";
import {
  normalizeCustomerCredentials,
  normalizeEmailAddress,
  type AuthGateway,
  type IdentityUnsubscribe,
} from "@spaceman/shared/auth";

export { createFirestoreRepositories } from "@spaceman/app-database";

export interface IdentityService {
  subscribe(
    listener: (session: IdentitySession | null) => void,
    onError: (error: AppError) => void,
  ): IdentityUnsubscribe;
  signIn(email: string, password: string): Promise<IdentitySession | null>;
  registerCustomer(
    input: CustomerRegistrationInput,
  ): Promise<IdentitySession | null>;
  signOut(): Promise<void>;
  resendVerification(): Promise<void>;
  sendStaffSetupLink(email: string): Promise<void>;
  syncClaims(): Promise<IdentitySession | null>;
}

export interface IdentityAdminService {
  inviteStaff(input: CreateStaffUserInput): Promise<CommandResult>;
  updateStatus(input: UpdateUserStatusInput): Promise<CommandResult>;
  updateScope(input: UpdateUserScopeInput): Promise<CommandResult>;
}

export function createIdentityAdminService(
  gateway: CallableGateway,
): IdentityAdminService {
  return {
    inviteStaff(input) {
      return gateway.invoke(
        "createStaffUser",
        createStaffUserInputSchema.parse(input),
      );
    },
    updateStatus(input) {
      return gateway.invoke(
        "updateUserStatus",
        updateUserStatusInputSchema.parse(input),
      );
    },
    updateScope(input) {
      return gateway.invoke(
        "updateUserScope",
        updateUserScopeInputSchema.parse(input),
      );
    },
  };
}

export function createIdentityService(
  authGateway: AuthGateway,
  callableGateway: CallableGateway,
): IdentityService {
  return {
    subscribe(listener, onError) {
      return authGateway.subscribe(listener, onError);
    },
    async signIn(email, password) {
      const credentials = normalizeCustomerCredentials({ email, password });
      await authGateway.signInWithEmailPassword(
        credentials.email,
        credentials.password,
      );
      return authGateway.refreshSession();
    },
    async registerCustomer(input) {
      const parsed = customerRegistrationInputSchema.parse(input);
      await authGateway.signUpWithEmailPassword(parsed.email, parsed.password);
      const profileInput: BootstrapCustomerProfileInput = {
        displayName: parsed.displayName,
        ...(parsed.phoneE164 === undefined
          ? {}
          : { phoneE164: parsed.phoneE164 }),
      };
      await callableGateway.invoke(
        "registerCustomerProfile",
        bootstrapCustomerProfileInputSchema.parse(profileInput),
      );
      await authGateway.sendCurrentUserEmailVerification();
      return authGateway.refreshSession(true);
    },
    signOut() {
      return authGateway.signOut();
    },
    resendVerification() {
      return authGateway.sendCurrentUserEmailVerification();
    },
    sendStaffSetupLink(email) {
      return authGateway.sendPasswordResetEmail(normalizeEmailAddress(email));
    },
    async syncClaims() {
      await callableGateway.invoke("syncMyClaims", {});
      return authGateway.refreshSession(true);
    },
  };
}

export interface MarketplaceService {
  listActiveStores(request?: PageRequest): Promise<Page<Store>>;
  listActiveItems(storeId: string, request?: PageRequest): Promise<Page<Item>>;
  listMerchantStores(
    merchantId: string,
    request?: PageRequest,
  ): Promise<Page<Store>>;
  listPendingMerchantStores(
    merchantId: string,
    request?: PageRequest,
  ): Promise<Page<Store>>;
  listManagedItems(storeId: string, request?: PageRequest): Promise<Page<Item>>;
  listAdminStores(request?: PageRequest): Promise<Page<Store>>;
  getImportBatch(batchId: string): Promise<ImportBatch | null>;
  listImportRows(
    batchId: string,
    request?: PageRequest,
  ): Promise<Page<ImportBatchRow>>;
  saveAdminStore(input: UpsertStoreInput): Promise<CommandResult>;
  submitMerchantStore(input: SubmitMerchantStoreInput): Promise<CommandResult>;
  reviewStore(input: ReviewStoreSubmissionInput): Promise<CommandResult>;
  updateMerchantStore(input: UpdateMerchantStoreInput): Promise<CommandResult>;
  saveItem(input: UpsertItemInput): Promise<CommandResult>;
  setItemAvailability(input: SetItemAvailabilityInput): Promise<CommandResult>;
  retireItem(input: RetireCatalogItemInput): Promise<CommandResult>;
  searchPlaces(input: StorePlaceSearchInput): Promise<StorePlaceCandidate[]>;
  stageGoogleImport(input: StageGoogleStoreImportInput): Promise<CommandResult>;
  stageCsvImport(input: StageCsvCatalogImportInput): Promise<CommandResult>;
  commitImport(input: CommitCatalogImportInput): Promise<CommandResult>;
  cancelImport(input: CancelCatalogImportInput): Promise<CommandResult>;
  cleanupMedia(input: CleanupCatalogMediaInput): Promise<CommandResult>;
  stageMedia(input: CatalogMediaUpload): Promise<CatalogMedia>;
}

export function createMarketplaceService(
  repositories: Pick<RepositoryBundle, "stores" | "items" | "importBatches">,
  gateway: CallableGateway,
  mediaGateway?: CatalogMediaGateway,
): MarketplaceService {
  const page = (request?: PageRequest): PageRequest => request ?? { limit: 20 };
  return {
    listActiveStores(request) {
      return repositories.stores.listActive(page(request));
    },
    listActiveItems(storeId, request) {
      return repositories.items.listActiveForStore(storeId, page(request));
    },
    listMerchantStores(merchantId, request) {
      return repositories.stores.listForMerchant(merchantId, page(request));
    },
    listPendingMerchantStores(merchantId, request) {
      return repositories.stores.listPendingForMerchant(
        merchantId,
        page(request),
      );
    },
    listManagedItems(storeId, request) {
      return repositories.items.listForStore(storeId, page(request));
    },
    listAdminStores(request) {
      return repositories.stores.listForAdmin(page(request));
    },
    getImportBatch(batchId) {
      return repositories.importBatches.getById(batchId);
    },
    listImportRows(batchId, request) {
      return repositories.importBatches.listRows(batchId, page(request));
    },
    saveAdminStore(input) {
      return gateway.invoke("upsertStore", upsertStoreInputSchema.parse(input));
    },
    submitMerchantStore(input) {
      return gateway.invoke(
        "submitMerchantStore",
        submitMerchantStoreInputSchema.parse(input),
      );
    },
    reviewStore(input) {
      return gateway.invoke(
        "reviewStoreSubmission",
        reviewStoreSubmissionInputSchema.parse(input),
      );
    },
    updateMerchantStore(input) {
      return gateway.invoke(
        "updateMerchantStore",
        updateMerchantStoreInputSchema.parse(input),
      );
    },
    saveItem(input) {
      return gateway.invoke("upsertItem", upsertItemInputSchema.parse(input));
    },
    setItemAvailability(input) {
      return gateway.invoke(
        "setItemAvailability",
        setItemAvailabilityInputSchema.parse(input),
      );
    },
    retireItem(input) {
      return gateway.invoke(
        "retireCatalogItem",
        retireCatalogItemInputSchema.parse(input),
      );
    },
    searchPlaces(input) {
      return gateway.invoke(
        "searchStorePlaces",
        storePlaceSearchInputSchema.parse(input),
      );
    },
    stageGoogleImport(input) {
      return gateway.invoke(
        "stageGoogleStoreImport",
        stageGoogleStoreImportInputSchema.parse(input),
      );
    },
    stageCsvImport(input) {
      return gateway.invoke(
        "stageCsvCatalogImport",
        stageCsvCatalogImportInputSchema.parse(input),
      );
    },
    commitImport(input) {
      return gateway.invoke(
        "commitCatalogImport",
        commitCatalogImportInputSchema.parse(input),
      );
    },
    cancelImport(input) {
      return gateway.invoke(
        "cancelCatalogImport",
        cancelCatalogImportInputSchema.parse(input),
      );
    },
    cleanupMedia(input) {
      return gateway.invoke(
        "cleanupCatalogMedia",
        cleanupCatalogMediaInputSchema.parse(input),
      );
    },
    stageMedia(input) {
      if (!mediaGateway) {
        throw new Error("Catalog media is unavailable in this client.");
      }
      return mediaGateway.stage(input);
    },
  };
}

export interface CheckoutService {
  searchAddresses(
    input: SearchDeliveryAddressesInput,
  ): Promise<DeliveryAddressCandidate[]>;
  createSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutQuoteResult>;
  initializePayment(
    input: InitializePaystackPaymentInput,
  ): Promise<PaystackPaymentAuthorization>;
  verifyPayment(
    input: VerifyPaystackPaymentInput,
  ): Promise<PaystackPaymentVerification>;
  getSession(checkoutSessionId: string): Promise<CheckoutSession | null>;
  getOrder(orderId: string): Promise<Order | null>;
  listCustomerOrders(
    customerId: string,
    request?: PageRequest,
  ): Promise<Page<Order>>;
}

export function createCheckoutService(
  repositories: Pick<RepositoryBundle, "checkoutSessions" | "orders">,
  gateway: CallableGateway,
): CheckoutService {
  return {
    searchAddresses(input) {
      return gateway.invoke(
        "searchDeliveryAddresses",
        searchDeliveryAddressesInputSchema.parse(input),
      );
    },
    createSession(input) {
      return gateway.invoke(
        "createCheckoutSession",
        createCheckoutSessionInputSchema.parse(input),
      );
    },
    initializePayment(input) {
      return gateway.invoke(
        "initializePaystackPayment",
        initializePaystackPaymentInputSchema.parse(input),
      );
    },
    verifyPayment(input) {
      return gateway.invoke(
        "verifyPaystackPayment",
        verifyPaystackPaymentInputSchema.parse(input),
      );
    },
    getSession(checkoutSessionId) {
      return repositories.checkoutSessions.getById(checkoutSessionId);
    },
    getOrder(orderId) {
      return repositories.orders.getById(orderId);
    },
    listCustomerOrders(customerId, request) {
      return repositories.orders.listForCustomer(
        customerId,
        request ?? { limit: 20 },
      );
    },
  };
}

export interface CheckoutAdminService {
  getSettings(): Promise<PlatformSettings | null>;
  listDeliveryZones(request?: PageRequest): Promise<Page<DeliveryZone>>;
  listFeeRules(
    deliveryZoneId: string,
    request?: PageRequest,
  ): Promise<Page<FeeRule>>;
  upsertDeliveryZone(input: UpsertDeliveryZoneInput): Promise<CommandResult>;
  publishDeliveryFeeRule(
    input: PublishDeliveryFeeRuleInput,
  ): Promise<CommandResult>;
  updateSettings(input: UpdateCheckoutSettingsInput): Promise<CommandResult>;
}

export function createCheckoutAdminService(
  repositories: Pick<RepositoryBundle, "checkoutConfiguration">,
  gateway: CallableGateway,
): CheckoutAdminService {
  return {
    getSettings() {
      return repositories.checkoutConfiguration.getSettings();
    },
    listDeliveryZones(request) {
      return repositories.checkoutConfiguration.listDeliveryZones(
        request ?? { limit: 20 },
      );
    },
    listFeeRules(deliveryZoneId, request) {
      return repositories.checkoutConfiguration.listFeeRules(
        deliveryZoneId,
        request ?? { limit: 20 },
      );
    },
    upsertDeliveryZone(input) {
      return gateway.invoke(
        "upsertDeliveryZone",
        upsertDeliveryZoneInputSchema.parse(input),
      );
    },
    publishDeliveryFeeRule(input) {
      return gateway.invoke(
        "publishDeliveryFeeRule",
        publishDeliveryFeeRuleInputSchema.parse(input),
      );
    },
    updateSettings(input) {
      return gateway.invoke(
        "updateCheckoutSettings",
        updateCheckoutSettingsInputSchema.parse(input),
      );
    },
  };
}

export function createMerchantOrderService(gateway: CallableGateway) {
  return {
    transitionFulfillment(
      input: FulfillmentTransitionInput,
    ): Promise<CommandResult> {
      return gateway.invoke(
        "transitionMerchantFulfillment",
        fulfillmentTransitionInputSchema.parse(input),
      );
    },
  };
}

export function createDispatchService(gateway: CallableGateway) {
  return {
    assignDriver(input: DriverAssignmentInput): Promise<CommandResult> {
      return gateway.invoke(
        "assignDriver",
        driverAssignmentInputSchema.parse(input),
      );
    },
  };
}

export function createDriverDeliveryService(gateway: CallableGateway) {
  return {
    publishForegroundLocation(
      input: DriverLocationInput,
    ): Promise<CommandResult> {
      return gateway.invoke(
        "updateDriverLocation",
        driverLocationInputSchema.parse(input),
      );
    },
  };
}
