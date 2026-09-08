import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IBusinessHour {
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";

  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface ISettings extends Document {
  organisation: {
    name: string;
    tagline?: string;
    description?: string;
    email?: string;
    phone?: string;
    alternatePhone?: string;
    address?: string;
    website?: string;
  };

  appointment: {
    minimumAdvanceHours: number;
    maximumAdvanceDays: number;
    defaultSessionDurationMinutes: number;
    allowClientCancellation: boolean;
    cancellationMinimumHours: number;
    allowClientRescheduling: boolean;
    reschedulingMinimumHours: number;
  };

  businessHours: IBusinessHour[];

  notifications: {
    emailNotificationsEnabled: boolean;
    appointmentConfirmationEnabled: boolean;
    appointmentReminderEnabled: boolean;
    appointmentReminderHours: number;
    cancellationNotificationsEnabled: boolean;
    workshopNotificationsEnabled: boolean;
    contactMessageNotificationsEnabled: boolean;
  };

  website: {
    defaultPageTitle?: string;
    defaultMetaDescription?: string;
    defaultMetaKeywords?: string[];
    maintenanceMode: boolean;
    maintenanceMessage?: string;
  };

  privacy: {
    confidentialityNotice?: string;
    privacyNotice?: string;
    dataRetentionDays: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const businessHourSchema =
  new Schema<IBusinessHour>(
    {
      day: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        required: true,
      },

      isOpen: {
        type: Boolean,
        default: false,
        required: true,
      },

      openTime: {
        type: String,
        trim: true,
      },

      closeTime: {
        type: String,
        trim: true,
      },
    },
    {
      _id: false,
    },
  );

const settingsSchema =
  new Schema<ISettings>(
    {
      organisation: {
        name: {
          type: String,
          required: [
            true,
            "Organisation name is required.",
          ],
          trim: true,
          maxlength: 250,
        },

        tagline: {
          type: String,
          trim: true,
          maxlength: 250,
        },

        description: {
          type: String,
          trim: true,
          maxlength: 5000,
        },

        email: {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 320,
        },

        phone: {
          type: String,
          trim: true,
          maxlength: 30,
        },

        alternatePhone: {
          type: String,
          trim: true,
          maxlength: 30,
        },

        address: {
          type: String,
          trim: true,
          maxlength: 1000,
        },

        website: {
          type: String,
          trim: true,
          maxlength: 500,
        },
      },

      appointment: {
        minimumAdvanceHours: {
          type: Number,
          default: 2,
          min: 0,
        },

        maximumAdvanceDays: {
          type: Number,
          default: 90,
          min: 1,
        },

        defaultSessionDurationMinutes: {
          type: Number,
          default: 60,
          min: 15,
        },

        allowClientCancellation: {
          type: Boolean,
          default: true,
        },

        cancellationMinimumHours: {
          type: Number,
          default: 24,
          min: 0,
        },

        allowClientRescheduling: {
          type: Boolean,
          default: true,
        },

        reschedulingMinimumHours: {
          type: Number,
          default: 24,
          min: 0,
        },
      },

      businessHours: {
        type: [businessHourSchema],
        default: [
          {
            day: "monday",
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00",
          },
          {
            day: "tuesday",
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00",
          },
          {
            day: "wednesday",
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00",
          },
          {
            day: "thursday",
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00",
          },
          {
            day: "friday",
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00",
          },
          {
            day: "saturday",
            isOpen: false,
          },
          {
            day: "sunday",
            isOpen: false,
          },
        ],
      },

      notifications: {
        emailNotificationsEnabled: {
          type: Boolean,
          default: true,
        },

        appointmentConfirmationEnabled: {
          type: Boolean,
          default: true,
        },

        appointmentReminderEnabled: {
          type: Boolean,
          default: true,
        },

        appointmentReminderHours: {
          type: Number,
          default: 24,
          min: 1,
        },

        cancellationNotificationsEnabled: {
          type: Boolean,
          default: true,
        },

        workshopNotificationsEnabled: {
          type: Boolean,
          default: true,
        },

        contactMessageNotificationsEnabled: {
          type: Boolean,
          default: true,
        },
      },

      website: {
        defaultPageTitle: {
          type: String,
          trim: true,
          maxlength: 250,
        },

        defaultMetaDescription: {
          type: String,
          trim: true,
          maxlength: 500,
        },

        defaultMetaKeywords: {
          type: [String],
          default: [],
        },

        maintenanceMode: {
          type: Boolean,
          default: false,
        },

        maintenanceMessage: {
          type: String,
          trim: true,
          maxlength: 1000,
        },
      },

      privacy: {
        confidentialityNotice: {
          type: String,
          trim: true,
          maxlength: 5000,
        },

        privacyNotice: {
          type: String,
          trim: true,
          maxlength: 5000,
        },

        dataRetentionDays: {
          type: Number,
          default: 3650,
          min: 1,
        },
      },
    },
    {
      timestamps: true,
    },
  );

export const Settings =
  mongoose.model<ISettings>(
    "Settings",
    settingsSchema,
  );