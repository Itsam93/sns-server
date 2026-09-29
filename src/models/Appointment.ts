import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type AppointmentStatus =
  | "pending"
  | "accepted"
  | "ongoing"
  | "completed"
  | "rejected"
  | "cancelled"
  | "rescheduled";

export type SessionType =
  | "in_person"
  | "online"
  | "phone";

export interface IAppointment
  extends Document {
  clientId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  servicePackageId?: mongoose.Types.ObjectId;

  requestedDate: Date;
  requestedTime: string;
  requestedStart?: Date;
  requestedEnd?: Date;

  scheduledStart?: Date;
  scheduledEnd?: Date;

  sessionType: SessionType;
  status: AppointmentStatus;

  rejectionReason?: string;
  cancellationReason?: string;

  adminNote?: string;
  meetingLink?: string;
  location?: string;

  bookingKey?: string;
  activeBookingKey?: string;

  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):[0-5]\d$/;

const ACTIVE_STATUSES: AppointmentStatus[] = [
  "pending",
  "accepted",
  "ongoing",
  "rescheduled",
];

const appointmentSchema =
  new Schema<IAppointment>(
    {
      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        index: true,
      },

      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        index: true,
      },

      servicePackageId: {
        type: Schema.Types.ObjectId,
        ref: "ServicePackage",
        index: true,
      },

      requestedDate: {
        type: Date,
        required: true,
      },

      requestedTime: {
        type: String,
        required: true,
        trim: true,
        match: [
          TIME_REGEX,
          "Requested time must be in HH:mm format.",
        ],
      },

      requestedStart: {
        type: Date,
      },

      requestedEnd: {
        type: Date,
      },

      scheduledStart: {
        type: Date,
      },

      scheduledEnd: {
        type: Date,
      },

      sessionType: {
        type: String,
        enum: [
          "in_person",
          "online",
          "phone",
        ],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "accepted",
          "ongoing",
          "completed",
          "rejected",
          "cancelled",
          "rescheduled",
        ],
        default: "pending",
        required: true,
        index: true,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      cancellationReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      adminNote: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      meetingLink: {
        type: String,
        trim: true,
      },

      location: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      bookingKey: {
        type: String,
        trim: true,
      },

      activeBookingKey: {
        type: String,
        trim: true,
      },

      acceptedAt: {
        type: Date,
      },

      completedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      strict: true,
      strictQuery: true,
    },
  );

appointmentSchema.index({
  clientId: 1,
  status: 1,
});

appointmentSchema.index({
  clientId: 1,
  servicePackageId: 1,
  status: 1,
});

appointmentSchema.index({
  serviceId: 1,
  requestedStart: 1,
  requestedEnd: 1,
});

appointmentSchema.index({
  serviceId: 1,
  scheduledStart: 1,
  scheduledEnd: 1,
});

appointmentSchema.index(
  {
    bookingKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      bookingKey: {
        $exists: true,
      },
    },
  },
);

appointmentSchema.index(
  {
    activeBookingKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      activeBookingKey: {
        $exists: true,
      },
    },
  },
);

appointmentSchema.pre(
  "validate",
  async function () {
    const hasRequestedStart =
      Boolean(this.requestedStart);

    const hasRequestedEnd =
      Boolean(this.requestedEnd);

    if (
      hasRequestedStart !==
      hasRequestedEnd
    ) {
      throw new Error(
        "Requested start and end must be provided together.",
      );
    }

    if (
      this.requestedStart &&
      this.requestedEnd &&
      this.requestedStart >=
        this.requestedEnd
    ) {
      throw new Error(
        "Requested appointment end must be after the start.",
      );
    }

    const hasScheduledStart =
      Boolean(this.scheduledStart);

    const hasScheduledEnd =
      Boolean(this.scheduledEnd);

    if (
      hasScheduledStart !==
      hasScheduledEnd
    ) {
      throw new Error(
        "Scheduled start and end must be provided together.",
      );
    }

    if (
      this.scheduledStart &&
      this.scheduledEnd &&
      this.scheduledStart >=
        this.scheduledEnd
    ) {
      throw new Error(
        "Scheduled appointment end must be after the start.",
      );
    }

    if (
      ACTIVE_STATUSES.includes(
        this.status,
      )
    ) {
      if (
        !this.activeBookingKey
      ) {
        throw new Error(
          "Active appointments must have an active booking key.",
        );
      }
    } else if (
      this.activeBookingKey
    ) {
      throw new Error(
        "Inactive appointments cannot have an active booking key.",
      );
    }

    if (
      this.status ===
        "accepted" ||
      this.status ===
        "ongoing" ||
      this.status ===
        "rescheduled" ||
      this.status ===
        "completed"
    ) {
      if (
        !this.scheduledStart ||
        !this.scheduledEnd
      ) {
        throw new Error(
          "This appointment status requires a scheduled time.",
        );
      }
    }

    if (
      this.status ===
      "completed"
    ) {
      if (
        !this.completedAt
      ) {
        throw new Error(
          "Completed appointments must have completedAt.",
        );
      }
    } else if (
      this.completedAt
    ) {
      throw new Error(
        "Only completed appointments may have completedAt.",
      );
    }

    if (
      this.status ===
      "cancelled"
    ) {
      if (
        !this.cancelledAt
      ) {
        throw new Error(
          "Cancelled appointments must have cancelledAt.",
        );
      }
    } else if (
      this.cancelledAt
    ) {
      throw new Error(
        "Only cancelled appointments may have cancelledAt.",
      );
    }

    if (
      this.status ===
      "rejected"
    ) {
      if (
        !this.rejectionReason
      ) {
        throw new Error(
          "Rejected appointments must have a rejection reason.",
        );
      }
    }
  },
);

export const Appointment =
  mongoose.model<IAppointment>(
    "Appointment",
    appointmentSchema,
  );

export default Appointment;