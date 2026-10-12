import mongoose from "mongoose";

import { Payment } from "../models/Payment.js";
import { Service } from "../models/Service.js";

import {
  createAppointmentFromPayment,
} from "./appointmentService.js";

import {
  confirmWorkshopReservation,
  expireWorkshopReservation,
  getWorkshopReservationByPaymentId,
  recoverExpiredWorkshopReservation,
} from "./workshopReservationService.js";

import {
  createWorkshopRegistration,
  getWorkshopRegistrationByPaymentId,
} from "./workshopRegistrationService.js";

type PaymentMetadata = Map<string, string> | undefined;

type ServicePayment = {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  metadata?: PaymentMetadata;
};

type WorkshopPayment = {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
};

function getMetadataValue(
  metadata: PaymentMetadata,
  key: string,
): string | undefined {
  const value = metadata?.get(key);

  return value?.trim() || undefined;
}

function parseAppointmentDate(
  metadata: PaymentMetadata,
): Date {
  const value = getMetadataValue(
    metadata,
    "requestedDate",
  );

  if (!value) {
    throw new Error(
      "Appointment date is missing from the payment.",
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Appointment date stored on the payment is invalid.",
    );
  }

  return date;
}

function getAppointmentTime(
  metadata: PaymentMetadata,
): string {
  const value = getMetadataValue(
    metadata,
    "requestedTime",
  );

  if (!value) {
    throw new Error(
      "Appointment time is missing from the payment.",
    );
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(
      "Appointment time stored on the payment is invalid.",
    );
  }

  return value;
}

function getSessionType(
  metadata: PaymentMetadata,
): "in_person" | "online" | "phone" {
  const value = getMetadataValue(
    metadata,
    "sessionType",
  );

  if (
    value !== "in_person" &&
    value !== "online" &&
    value !== "phone"
  ) {
    throw new Error(
      "Appointment session type is missing or invalid on the payment.",
    );
  }

  return value;
}

class PaymentFulfilmentService {
  async fulfilPayment(
    paymentId: mongoose.Types.ObjectId,
  ): Promise<void> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment was not found.");
    }

    if (payment.status !== "successful") {
      throw new Error(
        "Only successful payments can be fulfilled.",
      );
    }

    switch (payment.productType) {
      case "service":
        await this.fulfilServicePayment(payment);
        return;

      case "programme":
        await this.fulfilProgrammePayment(payment);
        return;

      case "workshop":
        await this.fulfilWorkshopPayment(payment);
        return;

      default:
        throw new Error(
          `Unsupported payment product type: ${payment.productType}.`,
        );
    }
  }

  private async fulfilServicePayment(
    payment: ServicePayment,
  ): Promise<void> {
    const service = await Service.findById(
      payment.productId,
    ).lean();

    if (!service) {
      throw new Error(
        "The service attached to the payment no longer exists.",
      );
    }

    try {
      const appointmentInput = {
        paymentId: payment._id.toString(),
        clientId: payment.clientId.toString(),
        serviceId: payment.productId.toString(),
        requestedDate: parseAppointmentDate(
          payment.metadata,
        ),
        requestedTime: getAppointmentTime(
          payment.metadata,
        ),
        sessionType: getSessionType(
          payment.metadata,
        ),
      };

      await createAppointmentFromPayment(
        appointmentInput,
      );
    } catch (error) {
      console.error(
        "[Appointment payment fulfilment failed]",
        {
          paymentId: payment._id.toString(),
          clientId: payment.clientId.toString(),
          serviceId: payment.productId.toString(),
          metadata: payment.metadata
            ? Object.fromEntries(payment.metadata)
            : undefined,
          error,
        },
      );

      throw error;
    }
  }

  private async fulfilProgrammePayment(
    _payment: {
      _id: mongoose.Types.ObjectId;
      productId: mongoose.Types.ObjectId;
      optionId?: string;
    },
  ): Promise<void> {
    throw new Error(
      "Programme payment fulfilment requires the programme registration model.",
    );
  }

  private async fulfilWorkshopPayment(
    payment: WorkshopPayment,
  ): Promise<void> {
    const paymentId = payment._id.toString();

    let reservation =
      await getWorkshopReservationByPaymentId(
        paymentId,
      );

    if (!reservation) {
      throw new Error(
        "Workshop reservation associated with this payment was not found.",
      );
    }

    if (
      reservation.clientId.toString() !==
        payment.clientId.toString() ||
      reservation.workshopId.toString() !==
        payment.productId.toString()
    ) {
      throw new Error(
        "Workshop reservation does not match the payment.",
      );
    }

    const existingRegistration =
      await getWorkshopRegistrationByPaymentId(
        paymentId,
      );

    if (existingRegistration) {
      if (
        existingRegistration.status === "cancelled" ||
        existingRegistration.status === "refunded"
      ) {
        throw new Error(
          `The registration for this successful payment has status "${existingRegistration.status}" and requires reconciliation.`,
        );
      }

      return;
    }

    if (reservation.status === "cancelled") {
      throw new Error(
        "The workshop reservation was cancelled despite the successful payment and requires reconciliation.",
      );
    }

    if (reservation.status === "expired") {
      reservation =
        await recoverExpiredWorkshopReservation(
          reservation._id.toString(),
          paymentId,
        );
    } else if (reservation.status === "pending") {
      if (
        reservation.expiresAt.getTime() <= Date.now()
      ) {
        await expireWorkshopReservation(
          reservation._id.toString(),
        );

        reservation =
          await recoverExpiredWorkshopReservation(
            reservation._id.toString(),
            paymentId,
          );
      } else {
        reservation = await confirmWorkshopReservation(
          reservation._id.toString(),
        );
      }
    }

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "recovered"
    ) {
      throw new Error(
        `Cannot fulfil a workshop reservation with status "${reservation.status}".`,
      );
    }

    await createWorkshopRegistration({
      clientId: reservation.clientId.toString(),
      workshopId: reservation.workshopId.toString(),
      paymentId,
      ticketCode: reservation.ticketCode,
      ticketName: reservation.ticketName,
      attendeeCount: reservation.attendeeCount,
      amountPaid: reservation.amount,
      currency: reservation.currency,
      fullName: reservation.fullName,
      email: reservation.email,
      phone: reservation.phone,
      organisationName:
        reservation.organisationName,
    });
  }
}

export const paymentFulfilmentService =
  new PaymentFulfilmentService();
