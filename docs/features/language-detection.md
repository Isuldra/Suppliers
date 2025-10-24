# Language Detection - OneMed SupplyChain

## Overview

The application now uses an intelligent language detection system that balances user preferences with system language settings.

## How It Works

### Priority Order:

1. **User Manually Selected Language** - If the user has explicitly chosen a language, that takes priority
2. **System Language** - If no manual selection exists, the app follows the system's language settings
3. **Default Fallback** - Norwegian (no) as the default for Norwegian users

### Detection Logic:

#### First Time Users:

- App automatically detects system language
- Maps system language codes to supported app languages:
  - `nb`, `nn`, `no` → Norwegian (`no`)
  - `sv`, `sv-SE` → Swedish (`se`)
  - `da`, `da-DK` → Danish (`da`)
  - `fi`, `fi-FI` → Finnish (`fi`)
  - `en`, `en-US`, `en-GB` → English (`en`)

#### Returning Users:

- If user has manually selected a language, that preference is remembered
- App continues to use the manually selected language
- User can reset to system language at any time

### User Controls:

#### Language Selector:

- **Manual Selection**: Click any language flag to manually select that language
- **Reset to System**: Use the "Reset to system language" option to go back to following system settings

#### Reset Functionality:

- Clears both the saved language preference and the "user selected" flag
- Re-detects system language and applies it
- Useful when system language changes or user wants to start fresh

## Technical Implementation:

### Storage:

- `i18nextLng`: Stores the selected language code
- `userSelectedLanguage`: Boolean flag indicating if user manually selected a language

### Functions:

- `detectAppLanguage()`: Main detection function with priority logic
- `resetLanguageToSystem()`: Resets to system language detection

## Benefits:

1. **New Users**: Automatically get the right language based on their system
2. **Existing Users**: Keep their manual preferences
3. **Flexibility**: Can easily switch between manual and automatic detection
4. **System Changes**: Can reset when system language changes

## Supported Languages:

- 🇳🇴 Norwegian (no)
- 🇸🇪 Swedish (se)
- 🇩🇰 Danish (da)
- 🇫🇮 Finnish (fi)
- 🇬🇧 English (en)
