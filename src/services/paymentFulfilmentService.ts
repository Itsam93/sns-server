import mongoose from "mongoose";

import { Payment } from "../models/Payment.js";
import { Service } from "../models/Service.js";
import { Workshop } from "../models/Workshop.js";

import {
  createAppointmentFromPayment,
} from "./appointmentService.js";
import {
  createWorkshopRegistration,
} from "./workshopRegistrationService.js";

type PaymentMetadata = Map<
  string,
  string
> | undefined;

function getMetadataValue(
  metadata: PaymentMetadata,
  key: string,
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  const value = metadata.get(key);

  return value?.trim() || undefined;
}

function parseAppointmentDate(
  metadata: PaymentMetadata,
): Date {
  const value =
    getMetadataValue(
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
  const value =
    getMetadataValue(
      metadata,
      "requestedTime",
    );

  if (!value) {
    throw new Error(
      "Appointment time is missing from the payment.",
    );
  }

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      "Appointment time stored on the payment is invalid.",
    );
  }

  return value;
}

function getSessionType(
  metadata: PaymentMetadata,
):
  | "in_person"
  | "online"
  | "phone" {
  const value =
    getMetadataValue(
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
    const payment =
      await Payment.findById(
        paymentId,
      );

    if (!payment) {
      throw new Error(
        "Payment was not found.",
      );
    }

    if (
      payment.status !==
      "successful"
    ) {
      throw new Error(
        "Only successful payments can be fulfilled.",
      );
    }

    switch (
      payment.productType
    ) {
      case "service":
        await this.fulfilServicePayment(
          payment,
        );
        return;

      case "programme":
        await this.fulfilProgrammePayment(
          payment,
        );
        return;

      case "workshop":
        await this.fulfilWorkshopPayment(
          payment,
        );
        return;

      default:
        throw new Error(
          `Unsupported payment product type: ${payment.productType}.`,
        );
    }
  }

  private async fulfilServicePayment(
    payment: {
      _id: mongoose.Types.ObjectId;
      clientId: mongoose.Types.ObjectId;
      productId: mongoose.Types.ObjectId;
      metadata?: PaymentMetadata;
    },
  ): Promise<void> {
    const service =
      await Service.findById(
        payment.productId,
      ).lean();

    if (!service) {
      throw new Error(
        "The service attached to the payment no longer exists.",
      );
    }

    const requestedDate =
      parseAppointmentDate(
        payment.metadata,
      );

    const requestedTime =
      getAppointmentTime(
        payment.metadata,
      );

    const sessionType =
      getSessionType(
        payment.metadata,
      );

    await createAppointmentFromPayment(
      {
        paymentId:
          payment._id.toString(),
        clientId:
          payment.clientId.toString(),
        serviceId:
          payment.productId.toString(),
        requestedDate,
        requestedTime,
        sessionType,
      },
    );
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
    payment: {
      _id: mongoose.Types.ObjectId;
      clientId: mongoose.Types.ObjectId;
      productId: mongoose.Types.ObjectId;
      optionId?: string;
      amount: mongoose.Types.Decimal128;
      currency:
        | "NGN"
        | "USD"
        | "GBP";
      metadata?: PaymentMetadata;
    },
  ): Promise<void> {
    if (!payment.optionId) {
      throw new Error(
        "Workshop payment is missing its ticket code.",
      );
    }

    const existingRegistration =
      await this.getExistingWorkshopRegistration(
        payment._id,
      );

    if (existingRegistration) {
      return;
    }

    const workshop =
      await Workshop.findById(
        payment.productId,
      ).lean();

    if (!workshop) {
      throw new Error(
        "The workshop attached to the payment no longer exists.",
      );
    }

    const ticket =
      workshop.ticketTypes.find(
        (item) =>
          item.code.toLowerCase() ===
          payment.optionId!
            .toLowerCase(),
      );

    if (!ticket) {
      throw new Error(
        "The workshop ticket attached to the payment no longer exists.",
      );
    }

    if (!ticket.isActive) {
      throw new Error(
        "The workshop ticket attached to the payment is no longer active.",
      );
    }

    const fullName =
      getMetadataValue(
        payment.metadata,
        "registrationFullName",
      ) ?? "";

    const email =
      getMetadataValue(
        payment.metadata,
        "registrationEmail",
      )?.toLowerCase() ?? "";

    const phone =
      getMetadataValue(
        payment.metadata,
        "registrationPhone",
      );

    const organisationName =
      getMetadataValue(
        payment.metadata,
        "registrationOrganisationName",
      );

    if (!fullName) {
      throw new Error(
        "Workshop registration full name is missing from the payment.",
      );
    }

    if (!email) {
      throw new Error(
        "Workshop registration email is missing from the payment.",
      );
    }

    await createWorkshopRegistration({
      clientId:
        payment.clientId.toString(),
      workshopId:
        payment.productId.toString(),
      paymentId:
        payment._id.toString(),
      ticketCode:
        ticket.code,
      ticketName:
        ticket.name,
      attendeeCount:
        ticket.attendeeCount,
      amountPaid:
        payment.amount,
      currency:
        payment.currency,
      fullName,
      email,
      phone,
      organisationName,
      registeredAt:
        new Date(),
    });
  }

  private async getExistingWorkshopRegistration(
    paymentId: mongoose.Types.ObjectId,
  ) {
    const {
      WorkshopRegistration,
    } = await import(
      "../models/WorkshopRegistration.js"
    );

    return WorkshopRegistration.findOne({
      paymentId,
    }).lean();
  }
}

export const paymentFulfilmentService =
  new PaymentFulfilmentService();