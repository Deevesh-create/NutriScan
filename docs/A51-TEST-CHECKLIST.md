# NutriScan on the Galaxy A51: setup and test checklist

Phone: Samsung Galaxy A51, One UI 5.1, Android 13. Run each test on the **Pixel 6 emulator first**, then on the **A51**. Note **Actual** and **Pass/Fail** for each test (the report's test table needs them), and screenshot anything that fails (Power + Volume down).

## 0. Supabase setup (once, about 5 min)

- [ ] **S1** Deploy the USDA proxy: Dashboard → **Edge Functions → Deploy a new function → Via Editor** → name `usda-search` → paste `supabase/functions/usda-search/index.ts` → **Deploy**
- [ ] **S2** **Edge Functions → Secrets** → add `USDA_API_KEY` (the value after `=` in `supabase/functions/.env`)
- [ ] **S3** **Storage → New bucket** `legal`, **Public** on → upload `docs/legal/privacy-policy.txt` and `docs/legal/terms.txt`
- [ ] **S4** **Authentication → Sign In / Providers → Email:** turn on **Confirm email**; set the minimum password length to **8**
- [x] **S5** `supabase/community_foods.sql` run in the SQL Editor (done 6 Oct)
- [ ] **S6** `supabase/nutrients_and_water.sql` run in the SQL Editor (needed by the 8 Oct build: without it the diary won't load)
- [x] **S7** Re-deploy `usda-search` with the updated `index.ts` (it now keeps sat. fat, sugars, fibre and sodium): Edge Functions → usda-search → Code → paste → Deploy
- [x] **S8** `supabase/weight_log.sql` run in the SQL Editor (needed for the Weight card)
- [x] **S9** Re-upload `docs/legal/privacy-policy.txt` to the `legal` bucket (the policy now mentions weights, water and steps)
- [ ] **S10** On the phone: install **Health Connect** and **Samsung Health** from the Play Store; in Samsung Health → Settings → **Health Connect**, allow it to share **Steps** (both installed 8 Oct; NutriScan connected, 0 steps so far)

## 1. One-time phone setup (5 min)

1. **Developer options:** Settings → About phone → Software information → tap **Build number** 7 times → enter your PIN.
2. **USB debugging:** Settings → Developer options → **USB debugging** on.
3. Plug the phone into the PC with a data USB cable → on the phone, tap **Allow** on "Allow USB debugging?" (tick "Always allow from this computer").
4. **Install:** Android Studio → device list (top bar) → pick **Samsung SM-A515F** → keep the **release** variant → **Run ▶**.
   - Or from a terminal: `adb install -r android\app\build\outputs\apk\release\app-release.apk`
5. **Reminders on Samsung:** Settings → Apps → NutriScan → Battery → **Unrestricted** (otherwise One UI may hold reminders back).
6. **Logs while testing** (for Claude to debug): Android Studio → **Logcat**, filter `package:com.nutriscan.app`.

## 2. Tests

### Account, consent and goal
- [ ] **P1** Sign in with your account → **"Before you continue"** (first time only) → tap **Agree and continue** with no ticks → two red messages
- [ ] **P2** Tap the **Privacy Policy** and **Terms of Use** links → each opens in the app → back
- [ ] **P3** Tick both → **Agree and continue** → Today shows your goal
- [ ] **P4** Settings → **Privacy Policy** and **Terms of Use** rows open; "You agreed … on 7 October 2026" shows; **Open the online copy** opens the page in the browser (needs S3)
- [ ] **P5** Close the app (swipe away in Recents) → reopen → still signed in, no consent screen again

### Food search (USDA now goes through the Supabase proxy: needs S1 + S2)
- [ ] **P6** Search "banana" → **Banana, raw** (USDA) is first with "1 banana = 126 g"; "briani" → "Showing results for biryani"
- [ ] **P7** Type barcode `3017620422003` → Nutella filled in

### Camera, barcodes and labels (the reason to test on a real phone)
- [ ] **P8** Scan barcode → first time: explanation screen → **Allow camera** → camera view
- [ ] **P9** Scan 3 real products (local and imported) → name, kcal, macros filled in; note which ones weren't found
- [ ] **P10** A product **not found** → notice "isn't in Open Food Facts, USDA or NutriScan" → **Scan nutrition label** → point at the table → kcal, fat, carbs, protein turn green and the form fills in → type the name → **Add to diary**
- [ ] **P11** Scan the **same barcode again** → found instantly, notice "Another NutriScan user typed this product in"
- [ ] **P12** Label scan on 3 more packs (one per-100 g EU/Mauritian label, one French, one US "Nutrition Facts" if you have one) → numbers match the pack? Note how many seconds each took
- [ ] **P13** Snap meal → photograph 3 real dishes → note whether the right dish is in the top 3 → **Use this** → Add food filled in

### Diary
- [ ] **P14** Tap a food → change the grams → **Save changes** → totals update
- [ ] **P15** **‹** → Yesterday → add a food → it's on yesterday; History shows it on yesterday's bar; tap that bar → that day opens
- [ ] **P16** Add food → **＋** on a recent food → added in one tap
- [ ] **P17** Long-press a food → **Remove**

### Offline (turn on Airplane mode)
- [ ] **P18** Today → pull down → yellow "You're offline" notice, your diary still shows
- [ ] **P19** Add a food by typing it in → "Saved on this phone" → it shows "⏳ waiting to sync"
- [ ] **P20** Snap meal and Scan nutrition label still read (both run on the phone)
- [ ] **P21** Airplane mode off → pull down on Today → the waiting food is now a normal entry

### Hardware and permissions
- [x] **P22** *(8 Oct: allowed; 8:30, 13:00, 19:30 exact alarms scheduled)* Settings → **Meal reminders** on → Android 13 asks to allow notifications → **Allow** → switch stays on
- [ ] **P23** A reminder arrives (8:30, 13:00 or 19:30; or set the phone's clock 1 minute before one, then set it back)
- [x] **P24** *(8 Oct)* Settings → **Fingerprint lock** on → touch the sensor when asked → switch stays on
- [x] **P25** *(8 Oct: locked after 35 s away, fingerprint unlocked)* Close the app, wait 30 s, reopen → "NutriScan is locked" → fingerprint → unlocks
- [ ] **P26** Long-press the NutriScan icon → App info → Permissions → Camera → **Don't allow** → Scan barcode → explanation screen, typed barcode still works, no crash

### New account and deletion (use a **throwaway** account, not your real one)
- [ ] **P27** Sign out → **Create an account** without ticking the boxes → two red messages; tick both → account created (with S4 on: "Check your email" → confirm → sign in)
- [ ] **P28** Set a goal → add a food → Settings → **Delete my account and data** → confirm → back to Sign in; that email can't sign in any more

### Redesign (8 Oct)
- [ ] **P31** Today: ring in the middle, Goal / Food / Left on the left, meal totals on the right; macro bars show "% kcal" and "g left"
- [ ] **P32** Water: + three times → "3 of 8 glasses · 750 ml", three filled drops; − once → 2; leave and come back → still 2
- [ ] **P33** **Scan food** → camera with **Meal | Barcode | Label** tabs; each tab switches mode; flash button turns the torch on (phone only)
- [ ] **P34** Barcode tab → **Type in barcode** → box appears → `3017620422003` → Nutella, with sat. fat, sugars and salt filled in the **More nutrients** row
- [ ] **P35** Label tab → point at a pack → panel rows fill in → "Read. Check against the pack" → **Use these values** → Add food filled, including More nutrients
- [ ] **P36** Today shows "Sat. fat … · Sugars … · Salt … of 6 g" under the macros
- [ ] **P37** Phone Settings → Display → **Dark mode** on → reopen NutriScan → every screen dark and readable (Today, Add food, scanner sheet, Settings)

### Haptics, weight, steps, languages (8 Oct)
- [ ] **P38** Scan or type a barcode → a short "confirm" buzz; Add food with an empty name → a sharp "reject" buzz; water + → a light tick. *Needs phone Settings → Sounds and vibration → System sound/vibration control → **Touch interactions** on, and the phone not on mute (8 Oct: it was off, so no buzz, as designed)*
- [x] **P39** *(8 Oct: 109.5 kg → dot on chart, target 2,428 → 2,420, Today updated)* History → **Weight** card → **Log weight** → e.g. 79.5 → Save → chart dot, and "Daily target updated" if your target changed; Today shows the new target
- [x] **P40** *(8 Oct: 400 → "Weight: 30 to 300"; fixed: first Save tap only closed the keyboard)* Log a weight 30 or 400 → "Weight: 30 to 300"
- [ ] **P41** *(8 Oct: NutriScan connected and reading; Samsung Health allowed at 23:20 but had not synced its steps into Health Connect yet, recheck 9 Oct)* Today → **Steps** card: before S10 it says "Get Health Connect"; after S10, **Connect steps** → Health Connect permission screen → Allow → today's steps from Samsung Health and "About N kcal burned walking"
- [x] **P42** *(8 Oct: FR and Kreol fine; fixed: numbers now 2 420 / 0,4 in French, cut-off labels, "Série de 1 jours", "au En-cas")* Settings → **Language** → Français → every screen in French (Today, Add food, scanner, History, Settings, alerts); Kreol Morisien the same; back to English
- [ ] **P43** Reopen the app → the language you chose is kept; the consent screen appears once (policy updated 8 Oct)

### Look and feel
- [ ] **P29** Nothing is cut off or overlapping on any screen (A51 screen, One UI font size); text under the clock never overlaps when scrolling
- [ ] **P30** Phone Settings → Display → Font size at the largest → NutriScan screens still readable, buttons not cut off
