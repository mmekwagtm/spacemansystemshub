import type { CallableGateway } from "@spaceman/app-firebase";
import type { AppError } from "@spaceman/app-errors";
import type {
  BootstrapCustomerProfileInput,
  CommandResult,
  CreateCheckoutSessionInput,
  CustomerRegistrationInput,
  CreateStaffUserInput,
  DriverAssignmentInput,
  DriverLocationInput,
  FulfillmentTransitionInput,
  IdentitySession,
  UpdateUserScopeInput,
  UpdateUserStatusInput
} from "@spaceman/app-types";
import {
  bootstrapCustomerProfileInputSchema,
  createCheckoutSessionInputSchema,
  customerRegistrationInputSchema,
  createStaffUserInputSchema,
  driverAssignmentInputSchema,
  driverLocationInputSchema,
  fulfillmentTransitionInputSchema,
  updateUserScopeInputSchema,
  updateUserStatusInputSchema
} from "@spaceman/app-validation";
import {
  normalizeCustomerCredentials,
  normalizeEmailAddress,
  type AuthGateway,
  type IdentityUnsubscribe
} from "@spaceman/shared/auth";

export interface IdentityService {
  subscribe(
    listener: (session: IdentitySession | null) => void,
    onError: (error: AppError) => void
  ): IdentityUnsubscribe;
  signIn(email: string, password: string): Promise<IdentitySession | null>;
  registerCustomer(input: CustomerRegistrationInput): Promise<IdentitySession | null>;
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

export function createIdentityAdminService(gateway: CallableGateway): IdentityAdminService {
  return {
    inviteStaff(input) {
      return gateway.invoke("createStaffUser", createStaffUserInputSchema.parse(input));
    },
    updateStatus(input) {
      return gateway.invoke("updateUserStatus", updateUserStatusInputSchema.parse(input));
    },
    updateScope(input) {
      return gateway.invoke("updateUserScope", updateUserScopeInputSchema.parse(input));
    }
  };
}

export function createIdentityService(
  authGateway: AuthGateway,
  callableGateway: CallableGateway
): IdentityService {
  return {
    subscribe(listener, onError) {
      return authGateway.subscribe(listener, onError);
    },
    async signIn(email, password) {
      const credentials = normalizeCustomerCredentials({ email, password });
      await authGateway.signInWithEmailPassword(credentials.email, credentials.password);
      return authGateway.refreshSession();
    },
    async registerCustomer(input) {
      const parsed = customerRegistrationInputSchema.parse(input);
      await authGateway.signUpWithEmailPassword(parsed.email, parsed.password);
      const profileInput: BootstrapCustomerProfileInput = {
        displayName: parsed.displayName,
        ...(parsed.phoneE164 === undefined ? {} : { phoneE164: parsed.phoneE164 })
      };
      await callableGateway.invoke(
        "registerCustomerProfile",
        bootstrapCustomerProfileInputSchema.parse(profileInput)
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
    }
  };
}

export function createCheckoutService(gateway: CallableGateway) {
  return {
    createSession(input: CreateCheckoutSessionInput): Promise<CommandResult> {
      return gateway.invoke("createCheckoutSession", createCheckoutSessionInputSchema.parse(input));
    }
  };
}

export function createMerchantOrderService(gateway: CallableGateway) {
  return {
    transitionFulfillment(input: FulfillmentTransitionInput): Promise<CommandResult> {
      return gateway.invoke(
        "transitionMerchantFulfillment",
        fulfillmentTransitionInputSchema.parse(input)
      );
    }
  };
}

export function createDispatchService(gateway: CallableGateway) {
  return {
    assignDriver(input: DriverAssignmentInput): Promise<CommandResult> {
      return gateway.invoke("assignDriver", driverAssignmentInputSchema.parse(input));
    }
  };
}

export function createDriverDeliveryService(gateway: CallableGateway) {
  return {
    publishForegroundLocation(input: DriverLocationInput): Promise<CommandResult> {
      return gateway.invoke("updateDriverLocation", driverLocationInputSchema.parse(input));
    }
  };
}
