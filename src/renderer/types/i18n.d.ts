import 'react-i18next';

// Define the structure of our translation files
interface TranslationResources {
  app: {
    title: string;
    welcome: {
      title: string;
      description: string;
      getStarted: string;
    };
  };
  navigation: {
    dashboard: string;
    keyboardShortcuts: string;
    settings: string;
  };
  progress: {
    uploadFile: string;
    selectWeekday: string;
    selectSupplier: string;
    reviewData: string;
    sendEmail: string;
  };
  fileUpload: {
    title: string;
    fileLoaded: string;
    rowsReady: string;
    uploadNewFile: string;
  };
  configuration: {
    title: string;
    weekday: string;
    sendingMode: string;
    singleSupplier: string;
    multipleSuppliers: string;
    supplier: string;
    suppliers: string;
  };
  dataReview: {
    title: string;
    reviewOrderLines: string;
  };
  email: {
    title: string;
    previewAndSend: string;
  };
  validation: {
    errors: string;
  };
  keyboardShortcuts: {
    title: string;
    reset: string;
    goBack: string;
    confirm: string;
    navigate: string;
    close: string;
  };
  buttons: {
    close: string;
    save: string;
    cancel: string;
    next: string;
    back: string;
    complete: string;
  };
  languages: {
    norwegian: string;
    swedish: string;
    danish: string;
    finnish: string;
    english: string;
  };
}

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationResources;
    };
  }
}
