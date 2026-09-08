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

  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):[0-5]\d$/;

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
    },
  );

appointmentSchema.index({
  clientId: 1,
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

export const Appointment =
  mongoose.model<IAppointment>(
    "Appointment",
    appointmentSchema,
  );