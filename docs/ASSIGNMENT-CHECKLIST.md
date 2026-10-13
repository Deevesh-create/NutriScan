# NutriScan vs the assignment brief (checked 10 Oct 2026)

✅ done and tested on the A51 · 🟡 built, but a test or a part is still open · ❌ not done yet

## 1. Project requirements (brief §1, §3)
| Requirement | Status | Evidence |
|---|---|---|
| Not a simple CRUD app | ✅ | Calorie engine (Mifflin-St Jeor), AI meal recognition on the phone, nutrition-label reader, barcode lookup in 3 databases, badges and streaks |
| At least 2 hardware features | ✅ | Camera, fingerprint sensor, notifications, step counter (via Health Connect), vibration, flash |
| Complete end-to-end system | ✅ | Supabase: login, Postgres database, file storage, server function (USDA) |
| Multiple connected screens | ✅ | 14 screens: Login, Register, Consent, Setup, Today, History, Settings, Add food, Scan, Snap, Label, Goals, Legal, plus tabs |
| Real logic and state management | ✅ | Auth and language contexts, offline queue that syncs later, calorie target updates when weight changes |
| Authentication and secure flows | ✅ | Email + password, email confirmation, consent screen, fingerprint lock, delete account |
| Realistic, production-like UX | ✅ | Redesign, mocked up in Claude Design; dark mode |
| Cross-platform | 🟡 | React Native with the `ios/` folder kept, but built and tested on Android only. Say this in the report |
| Topic approved | ❓ | Matches the brief's suggested "Health Monitoring Application using device sensors and activity tracking". Get the approval in writing |

## 2. Device integration, at least 2 (brief §3.2)
| Feature | Status | How NutriScan uses it |
|---|---|---|
| Camera | ✅ | Barcode scan, nutrition-label reading, meal photo AI, flash button |
| Sensors | 🟡 | Fingerprint sensor ✅ · steps from Samsung Health via Health Connect (connected; Samsung had not synced yet) · vibration (haptics; phone's touch vibration was off) |
| Notifications | ✅ | Daily breakfast, lunch and dinner reminders, scheduled as exact alarms; each switched on or off, time picked on Android's clock (1.1). Arrived on 9 Oct (P23) |
| File storage | 🟡 | Label photos saved, read and then deleted; offline copy of the diary on the phone; policy files in Supabase Storage. No user media upload (not needed: already above 2) |
| GPS | ❌ | Not used, and not needed for a calorie tracker. Explain why in the report |

## 3. Security and permissions (brief §3.3)
| Requirement | Status | Evidence |
|---|---|---|
| Runtime permissions | 🟡 | Camera (explanation screen first) ✅, notifications ✅, Health Connect ✅, fingerprint ✅. "Camera denied" path not tested on the A51 (P26) |
| Token-based login | ✅ | Supabase JWT + refresh token; session encrypted with a key in the Android Keystore |
| Validation and sanitisation | ✅ | zod rules on every form (trimmed, ranges); database checks (e.g. weight 30–300); server function checks its input |
| Protecting sensitive data | 🟡 | Row Level Security, HTTPS only, backups off, fingerprint lock, USDA key on the server, no microphone permission, photos deleted, privacy policy + consent (Mauritius DPA 2017). **Still to do:** hide the diary in Recents while locked; ask for fingerprint/password before Delete account |

## 4. UI/UX (brief §3.4)
| Requirement | Status | Evidence |
|---|---|---|
| Clean, responsive design | 🟡 | Design system, tested on the A51 in dark mode. Light mode and largest font (P30) not tested yet |
| Consistent navigation | ✅ | Bottom tabs + stack; scanner tabs Meal / Barcode / Label |
| Proper components | ✅ | Buttons, cards, forms, lists, chips, progress ring, charts |
| Mobile-first | ✅ | Built for phones; screen-reader labels; labels shrink to fit |

## 5. Non-functional (brief §4)
| Requirement | Status | Evidence |
|---|---|---|
| No crashes | 🟡 | Error boundary; no crash in A51 testing so far. Finish the open tests |
| Efficient performance | 🟡 | Caching, fast-fail when offline, slimmed server replies. **APK is 141 MB**: shipping only the phone's CPU type would cut it a lot (optional) |
| Modular, reusable code | ✅ | `components/`, `lib/`, `contexts/`, `screens/`; shared Scanner, Field, Button… |
| Error handling | ✅ | Offline notice, form errors, camera failure screen, error boundary |

## 6. Deliverables (brief §5, §6)
| Deliverable | Status | Who |
|---|---|---|
| Source code | ✅ | — |
| APK | 🟡 Release APK works; **sign it with your own key** | You + me |
| Technical report, PDF, 2,500–5,000 words, template sections 1–13 | ❌ | You write it; I give the outline |
| Architecture diagram | 🟡 | `docs/architecture.svg` is from 6 Oct and outdated → I update it |
| Navigation diagram | ❌ | Me |
| Wireframes / screenshots | 🟡 | Claude Design canvas exists; `docs/screenshots` are from before the redesign → retake on the A51 (light, dark, French) |
| Testing section | 🟡 | `docs/A51-TEST-CHECKLIST.md` (P1–P43) + `npm run check` (calorie and translation checks). Finish the open tests |
| Demo video, 10–15 min | ❌ | I write the script; you record |
| GitHub link (template appendix 13) | ❌ | No git repository yet. Make a private GitHub repo (your account) |
| Code snippets (appendix) | ❌ | Pick 4–5 from the outline |

## 7. Important notes in the brief
| Note | Status |
|---|---|
| Group work (2 students) | ⚠️ You're solo. Confirm with the lecturer that solo is fine |
| Original implementation / no copy-paste | ✅ Be ready to explain the code; add the AI-use declaration |

## 8. Bonus features
| Bonus | Status |
|---|---|
| AI integration (image recognition) | ✅ Meal recognition on the phone + label reading (ML Kit) |
| Cloud backend | ✅ Supabase (same role as Firebase) |
| Offline mode | 🟡 Built; A51 test open (P18–P21) |
| Multi-language | ✅ English, French, Kreol Morisien, tested on the A51 |
