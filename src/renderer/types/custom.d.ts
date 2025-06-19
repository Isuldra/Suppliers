// Declaration for image files so TypeScript recognizes them as valid imports
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.png";
declare module "*.gif";
declare module "*.svg";
declare module "*.webp";

declare global {
  interface ElectronAPI {
    sendEmailViaEmlAndCOM: (payload: {
      to: string;
      subject: string;
      html: string;
    }) => Promise<{ success: boolean; error?: string }>;
  }

  interface Window {
    electron: ElectronAPI;
  }
}
