# Multi-language UI Support Implementation

## Overview

Add internationalization (i18n) support for Norwegian (NO), Swedish (SE), Danish (DK), and Finnish (FI). The language selector will be available on the initial welcome screen and in a settings menu. Email templates will use the app's selected language, and the preference will be persisted to localStorage.

## Implementation Approach

### 1. Install i18n Library

- Install `react-i18next` and `i18next` packages
- These are industry-standard libraries for React internationalization

### 2. Create Translation Files

Create language JSON files at `src/renderer/locales/`:

- `no.json` - Norwegian (default, extract from existing UI)
- `se.json` - Swedish translations
- `da.json` - Danish translations
- `fi.json` - Finnish translations

Translation structure will include:

- UI labels (buttons, headers, navigation)
- Progress indicator steps
- Form fields and validation messages
- Keyboard shortcuts
- Notifications and error messages
- Email template content (greeting, instructions, table headers, closing)

### 3. Configure i18n

Create `src/renderer/i18n/config.ts`:

- Initialize i18next with language resources
- Set default language to Norwegian ("no")
- Configure localStorage persistence using `i18next-browser-languagedetector`
- Set fallback language to Norwegian

### 4. Create Language Selector Component

Create `src/renderer/components/LanguageSelector.tsx`:

- Dropdown/select component with flag icons or language names
- Display current language
- Call i18n.changeLanguage() on selection
- Show in two modes: compact (top corner) and expanded (welcome screen)

### 5. Update App.tsx

Modifications to `src/renderer/App.tsx`:

- Import and wrap app with `I18nextProvider`
- Add language selector to header (line ~505, next to Dashboard button)
- Add welcome screen overlay on first launch (detect via localStorage flag)
- Welcome screen shows large language selector and "Get Started" button

### 6. Update All UI Components

Replace hardcoded Norwegian text with `useTranslation()` hook:

- `App.tsx` - Progress steps, headers, buttons (~20 strings)
- `FileUpload.tsx` - Upload interface text
- `WeekdaySelect.tsx` - Weekday labels and instructions
- `SupplierSelect.tsx` - Supplier selection UI
- `BulkSupplierSelect.tsx` - Bulk selection UI
- `DataReview.tsx` - Review interface
- `BulkDataReview.tsx` - Bulk review interface
- `EmailButton.tsx` - Email sending UI
- `BulkEmailPreview.tsx` - Preview interface
- `Dashboard.tsx` - Dashboard text
- `LogViewer.tsx` - Log viewer text
- `KeyboardShortcutsModal` - Shortcut descriptions

### 7. Update Email Service

Modify `src/renderer/services/emailService.ts`:

- Add Swedish and Danish email templates (similar structure to NO/EN)
- Add Finnish email template
- Update language detection to use app language instead of supplier language
- Map language codes: no→noTemplate, se→seTemplate, da→daTemplate, fi→fiTemplate, en→enTemplate

### 8. Add Settings Modal

Create `src/renderer/components/SettingsModal.tsx` (if doesn't exist):

- Modal with language selector (expanded view)
- Accessible from header menu
- Shows current language prominently
- "Save" and "Cancel" buttons

### 9. Type Definitions

Create `src/renderer/types/i18n.d.ts`:

- TypeScript definitions for translation keys
- Ensures type safety when using translation functions

### 10. Update Welcome Flow

Add first-launch detection:

- Check `localStorage.getItem('hasSeenWelcome')`
- Show full-screen welcome overlay with:
  - OneMed logo
  - App title and description
  - Large language selector
  - "Get Started" button (translated)
- Set flag after dismissal

## Email Template Language Mapping

- App language "no" → Norwegian email template
- App language "se" → Swedish email template
- App language "da" → Danish email template
- App language "fi" → Finnish email template
- Fallback to English if language not found

## Key Files to Modify

- `package.json` - Add i18next dependencies
- `src/renderer/i18n/config.ts` - New i18n configuration
- `src/renderer/locales/*.json` - New translation files (4 files)
- `src/renderer/components/LanguageSelector.tsx` - New component
- `src/renderer/components/SettingsModal.tsx` - New or updated component
- `src/renderer/App.tsx` - Add i18n provider and language selector
- `src/renderer/services/emailService.ts` - Add SE, DA, FI email templates
- All component files - Replace hardcoded text with useTranslation()

## Notes

- Database field names remain unchanged (as requested)
- Supplier data language codes in `supplierData.json` are ignored for email language
- Language preference persists across app restarts via localStorage
- Default language is Norwegian for existing users

## To-dos

- [ ] Install react-i18next and i18next packages with language detection plugin
- [ ] Create translation JSON files for NO, SE, DA, FI with all UI strings
- [ ] Set up i18n configuration with localStorage persistence
- [ ] Create LanguageSelector component with dropdown and language options
- [ ] Add first-launch welcome screen with language selection
- [ ] Update App.tsx with i18n provider and language selector in header
- [ ] Replace hardcoded text in all UI components with useTranslation hook
- [ ] Add Swedish, Danish, and Finnish email templates to emailService.ts
- [ ] Create/update SettingsModal with language preferences
- [ ] Test language switching, persistence, and email template selection
