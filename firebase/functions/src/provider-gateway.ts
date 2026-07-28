import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

export interface JsonProviderGateway {
  request(url: string, init: RequestInit, source: string): Promise<unknown>;
}

export function createJsonProviderGateway(
  fetcher: typeof fetch = fetch,
  timeoutMs = 10_000,
): JsonProviderGateway {
  return {
    async request(url, init, source) {
      let response: Response;
      try {
        response = await fetcher(url, {
          ...init,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        logger.warn("Provider request failed", {
          source,
          errorName: error instanceof Error ? error.name : "unknown",
        });
        throw new HttpsError(
          "unavailable",
          "A required provider is temporarily unavailable.",
        );
      }
      if (!response.ok) {
        logger.warn("Provider rejected a request", {
          source,
          status: response.status,
        });
        throw new HttpsError(
          response.status === 429 ? "resource-exhausted" : "unavailable",
          "A required provider rejected the request.",
        );
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new HttpsError(
          "unavailable",
          "A required provider returned an invalid response.",
        );
      }
      return body;
    },
  };
}

export const jsonProviderGateway = createJsonProviderGateway();
