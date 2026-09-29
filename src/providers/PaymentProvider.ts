import type {
  PaymentProviderInitializeInput,
  PaymentProviderInitializeResult,
  PaymentProviderRefundInput,
  PaymentProviderRefundResult,
  PaymentProviderVerificationResult,
} from "../types/payment.js";

export interface PaymentProvider {
  readonly name: string;

  initialize(
    input: PaymentProviderInitializeInput,
  ): Promise<
    PaymentProviderInitializeResult
  >;

  verify(
    providerReference: string,
  ): Promise<
    PaymentProviderVerificationResult
  >;

  refund(
    input: PaymentProviderRefundInput,
  ): Promise<
    PaymentProviderRefundResult
  >;

  getRefund(
    providerReference: string,
  ): Promise<
    PaymentProviderRefundResult
  >;
}