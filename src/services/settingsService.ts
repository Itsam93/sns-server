import {
  Settings,
  type IBusinessHour,
  type ISettings,
} from "../models/Settings.js";

export type UpdateSettingsInput = {
  organisation?: Partial<ISettings["organisation"]>;
  appointment?: Partial<ISettings["appointment"]>;
  businessHours?: IBusinessHour[];
  notifications?: Partial<ISettings["notifications"]>;
  website?: Partial<ISettings["website"]>;
  privacy?: Partial<ISettings["privacy"]>;
};

function mergeSettings(
  current: ISettings,
  updates: UpdateSettingsInput,
) {
  if (updates.organisation) {
    current.organisation = {
      ...current.organisation,
      ...updates.organisation,
    };
  }

  if (updates.appointment) {
    current.appointment = {
      ...current.appointment,
      ...updates.appointment,
    };
  }

  if (updates.businessHours) {
    current.businessHours =
      updates.businessHours;
  }

  if (updates.notifications) {
    current.notifications = {
      ...current.notifications,
      ...updates.notifications,
    };
  }

  if (updates.website) {
    current.website = {
      ...current.website,
      ...updates.website,
    };
  }

  if (updates.privacy) {
    current.privacy = {
      ...current.privacy,
      ...updates.privacy,
    };
  }

  return current;
}

export async function getSettings() {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({
      organisation: {
        name: "SnS Counselling & Wellness",
      },
    });
  }

  return settings;
}

export async function updateSettings(
  updates: UpdateSettingsInput,
) {
  const settings = await getSettings();

  mergeSettings(settings, updates);

  return settings.save();
}

export async function resetSettings() {
  const settings = await getSettings();

  await settings.deleteOne();

  return getSettings();
}