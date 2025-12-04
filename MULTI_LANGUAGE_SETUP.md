# Multi-Language Support (EN/TH) - Setup Guide

## Overview

The application now supports **English (EN)** and **Thai (TH)** languages. Users can switch between languages using the language switcher in the navigation bar.

---

## 🎯 Features

- ✅ **Language Switcher** - Easy language switching in navigation bar
- ✅ **Automatic Detection** - Detects browser language preference
- ✅ **Persistent Storage** - Saves language preference in localStorage
- ✅ **Date Localization** - dayjs automatically uses correct locale for dates
- ✅ **Complete Translations** - All UI text translated for EN/TH

---

## 📁 File Structure

```
src/
├── i18n/
│   ├── config.ts              # i18n configuration
│   └── locales/
│       ├── en.json            # English translations
│       └── th.json            # Thai translations
└── components/
    └── LanguageSwitcher.tsx   # Language switcher component
```

---

## 🔧 How to Use Translations

### Basic Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Typography>{t('common.appName')}</Typography>
  );
};
```

### Translation Keys Structure

Translations are organized by feature:

- `common.*` - Common UI elements (buttons, labels, etc.)
- `auth.*` - Authentication pages
- `navigation.*` - Navigation menu items
- `members.*` - Member management
- `booking.*` - Booking management
- `pricing.*` - Price management
- `courses.*` - Course management
- `language.*` - Language switcher

### Example Translation Keys

```typescript
// Common
t('common.save')           // "Save" / "บันทึก"
t('common.cancel')         // "Cancel" / "ยกเลิก"
t('common.loading')        // "Loading..." / "กำลังโหลด..."

// Members
t('members.title')         // "Members" / "สมาชิก"
t('members.addMember')     // "Add Member" / "เพิ่มสมาชิก"

// Booking
t('booking.createBooking') // "Create Booking" / "สร้างการจอง"
t('booking.totalAmount')   // "Total Amount" / "จำนวนเงินรวม"
```

---

## 🌐 Adding New Translations

### Step 1: Add to English Translation File

Edit `src/i18n/locales/en.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}
```

### Step 2: Add to Thai Translation File

Edit `src/i18n/locales/th.json`:

```json
{
  "myFeature": {
    "title": "ฟีเจอร์ของฉัน",
    "description": "คำอธิบายฟีเจอร์"
  }
}
```

### Step 3: Use in Component

```typescript
const { t } = useTranslation();
<Typography>{t('myFeature.title')}</Typography>
```

---

## 📅 Date Formatting with dayjs

dayjs automatically uses the correct locale based on the selected language:

```typescript
import dayjs from 'dayjs';

// English: "January 15, 2024"
// Thai: "15 มกราคม 2567"
dayjs().format('MMMM DD, YYYY');

// The locale is automatically set when language changes
```

---

## 🎨 Language Switcher Component

The language switcher is automatically added to:
- **Login Page** (top right)
- **Main Layout** (navigation bar, next to user name)

### Usage

```typescript
import LanguageSwitcher from '../components/LanguageSwitcher';

<LanguageSwitcher />
```

---

## 🔄 Language Detection

The system detects language in this order:

1. **localStorage** - Previously selected language
2. **Browser** - Browser language preference
3. **Default** - Falls back to English

---

## 📝 Translation Coverage

### ✅ Fully Translated

- Login page
- Navigation menu
- Common UI elements
- Member management
- Booking management
- Pricing
- Courses
- Settings

### 🔄 Partially Translated

Some components may still have hardcoded English text. To translate:

1. Find the text in the component
2. Add translation key to `en.json` and `th.json`
3. Replace text with `t('key')`

---

## 🐛 Troubleshooting

### Language Not Changing

- Check browser console for errors
- Verify translation files are valid JSON
- Clear localStorage: `localStorage.removeItem('i18nextLng')`

### Missing Translations

- Check if key exists in both `en.json` and `th.json`
- Verify key path is correct (e.g., `common.save` not `commonSave`)
- Check browser console for missing key warnings

### Dates Not Localized

- Ensure dayjs locale is imported: `import 'dayjs/locale/th'`
- Check that i18n config updates dayjs locale on language change

---

## 🚀 Best Practices

1. **Use Translation Keys** - Always use `t('key')` instead of hardcoded text
2. **Organize by Feature** - Group related translations together
3. **Keep Keys Descriptive** - Use clear, hierarchical keys (e.g., `members.addMember`)
4. **Test Both Languages** - Always test UI in both EN and TH
5. **Consistent Terminology** - Use same terms across translations

---

## 📚 Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [dayjs Locale Documentation](https://day.js.org/docs/en/i18n/i18n)

---

## ✅ Implementation Checklist

- [x] Install i18n dependencies
- [x] Create i18n configuration
- [x] Create EN/TH translation files
- [x] Add language switcher component
- [x] Update LoginPage with translations
- [x] Update MainLayout with translations
- [x] Set up dayjs locale support
- [ ] Update all components with translations (ongoing)
- [ ] Add more translations as needed

---

**Last Updated:** $(date)

