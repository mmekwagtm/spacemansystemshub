import type { CallableGateway } from "@spaceman/app-firebase";
import type {
  CommandResult,
  CreateCheckoutSessionInput,
  DriverAssignmentInput,
  DriverLocationInput,
  FulfillmentTransitionInput
} from "@spaceman/app-types";
import {
  createCheckoutSessionInputSchema,
  driverAssignmentInputSchema,
  driverLocationInputSchema,
  fulfillmentTransitionInputSchema
} from "@spaceman/app-validation";

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
