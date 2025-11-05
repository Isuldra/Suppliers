export interface UserSettings {
  senderEmail: string;
  senderName?: string;
  displayName?: string;
  slackWebhookUrl?: string;
  slackNotificationsEnabled?: boolean;
}

export interface SettingsData {
  user: UserSettings;
}

export const DEFAULT_SETTINGS: SettingsData = {
  user: {
    senderEmail: "andreas.elvethun@onemed.com",
    senderName: "OneMed Norge AS",
    displayName: "",
    slackWebhookUrl: "",
    slackNotificationsEnabled: false,
  },
};
