# ⏭️ NEXT SESSION — Yahin se shuru karo (Bill App)

> **Pichla kaam:** 2026-06-10. Branch `main`, last commit `5f3fd6b` (pushed to
> `github.com/Jaanu-ji/Billing-Inventory-Mobile`). Gates green: `tsc` 0 ·
> `jest` 106/106 · `eslint` 0 errors (3 cosmetic warns). DB schema **v18**.
>
> **Detailed history:** `PROGRESS.md` (§8.8 = auth/Phase J, §8.9 = sync/Phase K
> ke go-live checklists). Ye file sirf "kal kya karna hai + mujhe kya chahiye".

---

## 1. Abhi app kis state me hai

- **Saare development phases (1–2, A–K) DONE.** Pura offline billing app: scan →
  cart → simple/GST bill → save → history → PDF/WhatsApp; units, billing modes,
  payments/udhaar ledger, discount/round-off/hold, business-adaptive inventory,
  visual polish.
- **Auth (Phase J)** aur **Cloud sync (Phase K)** ban gaye hain par **OFF by
  default** (`Config.auth.enabled = false`, `Config.sync.enabled = false`) — toh
  app abhi exactly **fully offline** chalta hai, kuch network pe depend nahi.
- **Backend = Supabase (serverless), NOT Express.** App seedhe Supabase se baat
  karega (RLS se secure). Auth = Firebase phone-OTP. `backend/schema.sql` = cloud
  schema jo Supabase me apply hoga.

## 2. Kal ka plan

1. **APK banana** (debug-signed — testing ke liye kaafi) → §4.
2. **Device pe app test** karna — khaaskar Phase I visual screens (ye design
   screenshots se banaye, device pe eyeball pending): dashboard, billing/cart,
   bill-detail invoice, product form, settings, bills history. Jo off lage → fix.
3. **Backend live karna** — tum creds doge (§3), main wiring karunga (§5).

---

## 3. ⭐ MUJHE TUMSE KYA CHAHIYE (backend live karne ke liye)

> App ke bina-backend wale hisse ko APK + test karne ke liye **kuch nahi chahiye**
> — wo abhi ready hai. Neeche wali cheezein sirf **auth + cloud sync ko ON**
> karne ke liye hain.

### A. 🔥 Firebase (phone-OTP login ke liye)
1. [console.firebase.google.com](https://console.firebase.google.com) pe ek
   **project** banao (naam kuch bhi, e.g. "Dukaan Bill").
2. Us project me **Android app add karo** — package name **`com.bill`** (exact,
   yahi app ka applicationId hai).
3. **App ka SHA-1 + SHA-256 add karo** (Project settings → Your apps → Add
   fingerprint). Debug build ke liye ye hain (maine nikale):
   - **SHA-1:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **SHA-256:** `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`
   *(Phone auth ko app-verification ke liye SHA chahiye. Release keystore alag
   hoga — wo §3C.)*
4. **`google-services.json` download karo** → mujhe do (ya
   `frontend/android/app/google-services.json` pe rakho).
5. Firebase Console → **Authentication → Sign-in method → Phone** ENABLE karo.
6. *(Recommended for testing)* Authentication → Phone → **"Phone numbers for
   testing"** me ek **test number + fixed OTP** add karo (e.g. `+91 99999 99999`
   → `123456`). Isse bina real SMS ke login test kar payenge.

### B. 🟢 Supabase (cloud database)
1. [supabase.com](https://supabase.com) pe ek **project** banao.
2. Settings → **API** se ye 2 cheezein do:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public key** (lamba `eyJ...` token — ye public-safe hai, RLS protect
     karta hai)
3. Supabase → **SQL Editor** me `backend/schema.sql` ka pura content paste karke
   **Run** karo (ye saari cloud tables + RLS banata hai). *(Main verify kar dunga.)*
4. **Firebase ↔ Supabase JWT link** — taaki Supabase Firebase ke login token ko
   maane (`auth.jwt() ->> 'sub'` = Firebase uid). Supabase Dashboard →
   **Authentication → Sign In / Providers → Third-party auth → Firebase** add
   karna padega (Firebase project ID chahiye hoga). *Ye thoda technical hai —
   kal saath me kar lenge, bas Firebase project ID ready rakhna.*

### C. (Sirf agar Play Store / proper release APK chahiye — abhi optional)
- Ek **release keystore** (`keytool` se generate) + uska SHA-1/SHA-256 bhi
  Firebase me add karna. **Testing ke liye iski zaroorat nahi** — debug APK kaafi
  hai. Batana agar Play Store pe daalna ho.

> **Short version jo kal chahiye:** `google-services.json` + Supabase **URL** +
> Supabase **anon key** + Firebase **project ID**. Bas — baaki wiring main karunga.

---

## 4. APK kaise banayenge (kal)

Prereqs (machine pe pehle se hone chahiye): **JDK 17** (`JAVA_HOME`), Android SDK,
ek connected device (`adb devices`) ya emulator.

```powershell
cd C:\BanaoBanao\Bill\frontend
npm install                         # agar naye packages aaye (Firebase/Supabase) to zaroori
# --- Debug APK (testing) ---
cd android
.\gradlew assembleDebug             # APK: android/app/build/outputs/apk/debug/app-debug.apk
# ya seedhe device pe chalao:
cd ..
npx react-native run-android
```
- App abhi **com.bill** package se banegi, naam "Bill", v1.0.
- Release/debug abhi dono **debug keystore** se signed hain (RN default).
- ⚠️ Agar Firebase/Supabase packages install kiye (native), to **clean rebuild**:
  `cd android; .\gradlew clean; cd ..; npx react-native run-android`.

## 5. Backend go-live — creds aane ke baad MAIN ye karunga

1. `cd frontend; npm i @react-native-firebase/app @react-native-firebase/auth @supabase/supabase-js`
2. `google-services.json` → `frontend/android/app/` + gradle plugin lines add
   (google-services). Android rebuild.
3. `services/AuthService.ts` → `authService` ko `FirebaseAuthService` pe swap
   (template file me hi hai).
4. `services/SupabaseClient.ts` → `getSupabase()` uncomment (template ready).
5. `services/sync/SyncController.ts` → engine ko `SupabaseSyncTransport` se banao
   (template `SyncTransport.ts` me).
6. `constants/config.ts` → `supabase.url` + `supabase.anonKey` bharo;
   `auth.enabled = true`; `sync.enabled = true`.
7. Test: login (phone OTP) → bill banao → Supabase tables me data aaya? → doosre
   device/restore pe pull hua? Offline pe billing fir bhi chale (sabse zaroori).

**Go-live ke chhote follow-ups** (creds ke baad): bill PDF/photo → Supabase
storage; bade backlog ke liye pull pagination loop; LWW ko real do-device edit pe
verify. (Sab PROGRESS §8.9 me noted.)

---

## 6. Kal turant start karne ke liye

```powershell
cd C:\BanaoBanao\Bill
git pull                            # latest main (5f3fd6b ya aage)
cd frontend; npx tsc --noEmit; npm test   # confirm sab green (106 tests)
```
Phir is file ka §3 (creds) + §4 (APK) follow karo. Koi doubt ho to PROGRESS.md
dekho. 👍
