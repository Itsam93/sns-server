import type { PaymentProvider } from "./PaymentProvider.js";
import { KoraProvider } from "./koraProvider.js";

const DEFAULT_PAYMENT_PROVIDER = "korapay";

export function createPaymentProvider(): PaymentProvider {
  const provider =
    process.env.PAYMENT_PROVIDER?.trim().toLowerCase() ||
    DEFAULT_PAYMENT_PROVIDER;

  switch (provider) {
    case "korapay":
      return new KoraProvider();

    default:
      throw new Error(
        `Unsupported payment provider: ${provider}.`,
      );
  }
}