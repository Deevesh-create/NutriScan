# NutriScan

A calorie tracker for weight loss, built in React Native (no Expo) for the Mobile Application Development module. Tested on a Samsung Galaxy A51 (Android 13).

## Features
- **Daily diary:** calorie ring, meal totals, macro targets, extra nutrients (saturated fat, sugars, fibre, salt), water tracker
- **Five ways to add food:**
  - scan a barcode (Open Food Facts, USDA, products shared by NutriScan users)
  - read a nutrition label with the camera (Google ML Kit, on the phone)
  - recognise a meal from a photo (TensorFlow Lite model, on the phone)
  - search by name (Mauritian dishes included)
  - type the values in
- **Goal and progress:** calorie target from the Mifflin-St Jeor equation, weight log with chart, 7-day history, streaks and badges
- **Phone features:** camera and flash, fingerprint lock, meal reminders, step counter sensor (or Samsung Health via Health Connect), haptics
- **Security:**
  - Supabase login (JWT); session encrypted with a key in the Android Keystore
  - Row Level Security on every table
  - USDA key kept on the server (Edge Function)
  - password asked again before deleting the account
  - app hidden in Recents; backups off
  - consent screen and privacy policy
- **Also:** works offline (diary cached, new foods queued), dark mode, English, French and Kreol Morisien, Help and FAQ

## Run it
1. `npm install`
2. Copy `src/lib/env.example.ts` to `src/lib/env.ts` and add your Supabase URL and anon key.
3. Set up Supabase:
   - SQL Editor: run `supabase/schema.sql`
   - Edge Functions: deploy `supabase/functions/usda-search` with the secret `USDA_API_KEY`
   - Storage: a public bucket `legal` holding the files from `docs/legal/`
4. Android:
   - `npx react-native run-android` (debug), or
   - `scripts/build-release.ps1`: signed release APKs (arm64, x86_64, universal) with your own key; asks for the key password
5. `npm run check`: calorie, label-parser and translation self-checks.

## Project layout
- `src/screens`: one file per screen
- `src/components`: shared UI (Scanner, Field, Button, cards)
- `src/lib`: logic (calories, food search, label parser, offline queue, i18n)
- `src/contexts`: auth and language state
- `android/app/src/main/java/com/com.nutriscan.app`: native modules (label reader, haptics)
- `supabase`: database SQL and the USDA Edge Function
- `docs`: test checklists, assignment checklist, architecture diagram, screenshots, legal texts
