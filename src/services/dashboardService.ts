import mongoose from "mongoose";

import { Appointment } from "../models/Appointment.js";
import { AuditLog } from "../models/AuditLog.js";
import { Client } from "../models/Client.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { FAQ } from "../models/FAQ.js";
import { IntakeForm } from "../models/IntakeForm.js";
import { Notification } from "../models/Notification.js";
import { Resource } from "../models/Resource.js";
import { Service } from "../models/Service.js";
import { Testimonial } from "../models/Testimonial.js";
import { User } from "../models/User.js";
import { Workshop } from "../models/Workshop.js";
import { WorkshopRequest } from "../models/WorkshopRequest.js";
import { AppError } from "../utils/appError.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "ongoing",
  "rescheduled",
] as const;

const COMPLETED_APPOINTMENT_STATUSES = [
  "completed",
] as const;

const CANCELLED_APPOINTMENT_STATUSES = [
  "cancelled",
  "rejected",
] as const;

function validateObjectId(
  id: string,
  fieldName: string,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

function getStartOfDay(
  date: Date,
) {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function getEndOfDay(
  date: Date,
) {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999,
  );

  return result;
}

function getStartOfWeek(
  date: Date,
) {
  const result =
    getStartOfDay(date);

  const day =
    result.getDay();

  const daysFromMonday =
    day === 0
      ? 6
      : day - 1;

  result.setDate(
    result.getDate() -
      daysFromMonday,
  );

  return result;
}

function getEndOfWeek(
  date: Date,
) {
  const result =
    getStartOfWeek(date);

  result.setDate(
    result.getDate() + 6,
  );

  return getEndOfDay(
    result,
  );
}

function getStartOfMonth(
  date: Date,
) {
  const result =
    getStartOfDay(date);

  result.setDate(1);

  return result;
}

function getEndOfMonth(
  date: Date,
) {
  const result =
    getStartOfMonth(date);

  result.setMonth(
    result.getMonth() + 1,
  );

  result.setMilliseconds(
    -1,
  );

  return result;
}

function getDateRange(
  from?: string,
  to?: string,
) {
  const now =
    new Date();

  if (!from && !to) {
    return {
      start:
        getStartOfMonth(now),
      end:
        getEndOfMonth(now),
    };
  }

  const start = from
    ? getStartOfDay(
        new Date(`${from}T00:00:00`),
      )
    : getStartOfMonth(now);

  const end = to
    ? getEndOfDay(
        new Date(`${to}T00:00:00`),
      )
    : getEndOfMonth(now);

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    throw new AppError(
      "Invalid dashboard date range.",
      400,
    );
  }

  if (start > end) {
    throw new AppError(
      "The start date cannot be after the end date.",
      400,
    );
  }

  return {
    start,
    end,
  };
}

async function getAppointmentCounts() {
  const counts =
    await Appointment.aggregate([
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  return counts.reduce<
    Record<string, number>
  >(
    (result, item) => {
      result[item._id] =
        item.count;

      return result;
    },
    {},
  );
}

async function getAdminOverview(
  start: Date,
  end: Date,
) {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalClients,
    activeClients,
    inactiveClients,
    activeServices,
    upcomingWorkshops,
    pendingWorkshopRequests,
    pendingTestimonials,
    draftResources,
    publishedResources,
    unreadContactMessages,
    unreadNotifications,
    appointmentCounts,
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({
      isActive: true,
    }),

    User.countDocuments({
      isActive: false,
    }),

    Client.countDocuments(),

    User.countDocuments({
      role: "client",
      isActive: true,
    }),

    User.countDocuments({
      role: "client",
      isActive: false,
    }),

    Service.countDocuments({
      isActive: true,
    }),

    Workshop.countDocuments({
      status: "published",
      startDate: {
        $gte: new Date(),
      },
    }),

    WorkshopRequest.countDocuments({
      status: "pending",
    }),

    Testimonial.countDocuments({
      status: "pending",
    }),

    Resource.countDocuments({
      status: "draft",
    }),

    Resource.countDocuments({
      status: "published",
    }),

    ContactMessage.countDocuments({
      status: {
        $in: [
          "new",
          "read",
        ],
      },
    }),

    Notification.countDocuments({
      isRead: false,
    }),

    getAppointmentCounts(),
  ]);

  const [
    appointmentsInRange,
    appointmentsToday,
    appointmentsThisWeek,
    appointmentsThisMonth,
    upcomingAppointments,
    recentAuditLogs,
  ] = await Promise.all([
    Appointment.countDocuments({
      requestedDate: {
        $gte: start,
        $lte: end,
      },
    }),

    Appointment.countDocuments({
      requestedDate: {
        $gte: getStartOfDay(
          new Date(),
        ),
        $lte: getEndOfDay(
          new Date(),
        ),
      },
    }),

    Appointment.countDocuments({
      requestedDate: {
        $gte: getStartOfWeek(
          new Date(),
        ),
        $lte: getEndOfWeek(
          new Date(),
        ),
      },
    }),

    Appointment.countDocuments({
      requestedDate: {
        $gte: getStartOfMonth(
          new Date(),
        ),
        $lte: getEndOfMonth(
          new Date(),
        ),
      },
    }),

    Appointment.find({
      status: {
        $in:
          ACTIVE_APPOINTMENT_STATUSES,
      },
      requestedDate: {
        $gte: new Date(),
      },
    })
      .populate(
        "clientId",
        "firstName lastName phone",
      )
      .populate(
        "serviceId",
        "name durationMinutes price currency",
      )
      .sort({
        requestedDate: 1,
        requestedStartTime: 1,
      })
      .limit(10),

    AuditLog.find()
      .populate(
        "actorId",
        "email role",
      )
      .sort({
        createdAt: -1,
      })
      .limit(10),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
    },

    clients: {
      total: totalClients,
      active: activeClients,
      inactive: inactiveClients,
    },

    services: {
      active: activeServices,
    },

    appointments: {
      totalInRange:
        appointmentsInRange,
      today:
        appointmentsToday,
      thisWeek:
        appointmentsThisWeek,
      thisMonth:
        appointmentsThisMonth,
      byStatus:
        appointmentCounts,
      active:
        ACTIVE_APPOINTMENT_STATUSES.reduce(
          (
            total,
            status,
          ) =>
            total +
            (
              appointmentCounts[
                status
              ] ?? 0
            ),
          0,
        ),
      completed:
        COMPLETED_APPOINTMENT_STATUSES.reduce(
          (
            total,
            status,
          ) =>
            total +
            (
              appointmentCounts[
                status
              ] ?? 0
            ),
          0,
        ),
      cancelledOrRejected:
        CANCELLED_APPOINTMENT_STATUSES.reduce(
          (
            total,
            status,
          ) =>
            total +
            (
              appointmentCounts[
                status
              ] ?? 0
            ),
          0,
        ),
    },

    upcomingAppointments,

    workshops: {
      upcoming:
        upcomingWorkshops,
      pendingRequests:
        pendingWorkshopRequests,
    },

    testimonials: {
      pending:
        pendingTestimonials,
    },

    resources: {
      draft:
        draftResources,
      published:
        publishedResources,
    },

    contactMessages: {
      unread:
        unreadContactMessages,
    },

    notifications: {
      unread:
        unreadNotifications,
    },

    recentAuditLogs,
  };
}

export async function getAdminDashboard(
  from?: string,
  to?: string,
) {
  const {
    start,
    end,
  } = getDateRange(
    from,
    to,
  );

  const overview =
    await getAdminOverview(
      start,
      end,
    );

  return {
    dateRange: {
      from: start,
      to: end,
    },
    ...overview,
  };
}

export async function getClientDashboard(
  clientId: string,
) {
  validateObjectId(
    clientId,
    "client ID",
  );

  const client =
    await Client.findById(
      clientId,
    ).populate(
      "userId",
      "email isActive isEmailVerified",
    );

  if (!client) {
    throw new AppError(
      "Client not found.",
      404,
    );
  }

  const [
    activeAppointment,
    appointmentHistory,
    intakeForm,
    unreadNotifications,
    upcomingWorkshops,
    activeServices,
  ] = await Promise.all([
    Appointment.findOne({
      clientId,
      status: {
        $in:
          ACTIVE_APPOINTMENT_STATUSES,
      },
    })
      .populate(
        "serviceId",
        "name description durationMinutes price currency",
      )
      .sort({
        requestedDate: 1,
      }),

    Appointment.find({
      clientId,
      status: {
        $in: [
          "completed",
          "cancelled",
          "rejected",
        ],
      },
    })
      .populate(
        "serviceId",
        "name durationMinutes price currency",
      )
      .sort({
        requestedDate: -1,
      })
      .limit(10),

    IntakeForm.findOne({
      clientId,
    }),

    Notification.find({
      userId: client.userId,
      isRead: false,
    })
      .sort({
        createdAt: -1,
      })
      .limit(10),

    Workshop.find({
      status: "published",
      startDate: {
        $gte: new Date(),
      },
    })
      .sort({
        startDate: 1,
      })
      .limit(5),

    Service.find({
      isActive: true,
    }).sort({
      name: 1,
    }),
  ]);

  const canBook =
    !activeAppointment;

  return {
    profile: {
      id: client._id,
      firstName:
        client.firstName,
      lastName:
        client.lastName,
      phone:
        client.phone,
      dateOfBirth:
        client.dateOfBirth,
      preferredContactMethod:
        client.preferredContactMethod,
      profileImage:
        client.profileImage,
    },

    booking: {
      canBook,
      reason: canBook
        ? null
        : "ACTIVE_APPOINTMENT",
      appointmentId:
        activeAppointment?._id ??
        null,
    },

    upcomingAppointment:
      activeAppointment,

    appointmentHistory,

    appointments: {
      total:
        await Appointment.countDocuments({
          clientId,
        }),
      completed:
        await Appointment.countDocuments({
          clientId,
          status: "completed",
        }),
      cancelled:
        await Appointment.countDocuments({
          clientId,
          status: "cancelled",
        }),
      rejected:
        await Appointment.countDocuments({
          clientId,
          status: "rejected",
        }),
    },

    intakeForm: {
      completed:
        Boolean(
          intakeForm?.completedAt,
        ),
      completedAt:
        intakeForm?.completedAt ??
        null,
    },

    notifications: {
      unread:
        unreadNotifications.length,
      items:
        unreadNotifications,
    },

    workshops:
      upcomingWorkshops,

    services:
      activeServices,
  };
}