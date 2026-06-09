# DUKAAN — Complete Requirements & Edge Cases
**(Design ko complete banane ke liye — har business, har situation ka solution)**

Goal: design level pe har problem ka jawab ho, taaki dukaandaar ko app "poora kaam ki cheez" lage, adhूrа nahi. Build me jo na chahiye baad me trim kar lenge — par vision complete ho.

---

## A. Core principle
Har dukaan alag hai. App ko **dukaan ke hisaab se dhalna** chahiye, dukaan ko app ke hisaab se nahi. Onboarding pe business type + unka tareeka set ho, phir poora app usi hisaab se behave kare. Aur jo business list me na ho, woh **khud apne hisaab se** set kar paye.

---

## B. Selling unit — har item alag tarah bikta hai
Abhi app sirf "quantity" janta hai. Real me:
- **Pcs / piece** — dawa ka patta, biscuit, soap (count me)
- **Kg / gram** — atta, sabzi, dal (weight me, decimal qty: 1.5 kg)
- **Litre / ml** — doodh, oil, petrol
- **Meter** — kapda, wire, rope
- **Bora / bag / packet / box / dozen / crate / tin** — wholesale/bulk units
- **Strip / tablet** (medical) — patta ya ek goli
- **Custom unit** — business khud bana le agar list me na ho

**Solution:** Har product/item pe ek **unit** field. Billing me qty us unit me (decimal allowed — 1.5 kg, 0.5 litre). Price per unit. Bill pe unit dikhe ("Atta — 2.5 kg × ₹40 = ₹100").

---

## C. Billing modes — har business ka alag tareeka
Ek hi billing screen sab pe fit nahi hoti. Business type se default mode:

1. **Barcode/scan mode** (kirana, packaged) — camera kholo, scan karo. (abhi hai)
2. **Scanner-free / list mode** — jiske paas barcode wala saaman hai hi nahi. Scanner kholne ka faida nahi. Seedha apni item-list se tap karke ya search karke add. Ya quick-buttons (favourites). (sabzi wala, chai wala, loose saaman, service wala)
3. **Service mode** — koi product nahi, sirf service line items. (salon, repair, consultant) (abhi hai)
4. **Mixed mode** — product + service ek saath. (mobile shop, garage) (abhi hai)

**Solution:** Onboarding pe business type → default mode set. Par dukaandaar **manually mode switch** bhi kar sake (ek dukaan me kabhi scan, kabhi loose). Scanner-free business me camera default na khule — seedha search/quick-add aaye.

---

## D. Bill banate waqt ka flow — simple, step-by-step
Tera point: ek saath bड़ा form na aaye. Ek-ek cheez, ya skip karke seedha bill.
- Scan/add khatam → "Done"
- Customer detail **optional aur fast**: pehle bas naam (chaahe toh), phir number (chaahe toh) — ek-ek, ya "skip" karke seedha bill
- Bill type (GST/simple) — sirf tab pooche jab zaroori, default yaad rakhe
- **Sabse fast path:** add → Done → bill (bina kuch bhare bhi ban jaye)

**Solution:** Checkout ko ek **light step-by-step / optional** banao, bड़ा form nahi. Jo dukaandaar fast chahta hai woh 2 tap me bill nikaale; jo detail chahta hai woh bhare.

---

## E. Paid / Unpaid / Udhaar
Bहुत dukaano me udhaar chalta hai. Abhi nahi hai.
- Bill pe **Paid / Unpaid** mark
- Unpaid = udhaar; customer ke naam se pending dikhe
- Customer-wise pending total ("Rohit — ₹450 baaki")
- Baad me paid mark kar sake
- (Future: udhaar reminder WhatsApp pe)

**Solution:** Har bill pe payment status (Paid/Unpaid/Partial). Customer ledger view — kiska kitna baaki.

---

## F. Inventory — business ke hisaab se
Tera point: medical wala patte ko pcs me beche, uska inventory waisा dikhe. Har business apna format dekhe.
- Product list business type ke hisaab se (medical = dawa naam + batch/expiry optional; kirana = naam + price; garment = size/color optional)
- Unit ke hisaab se stock (agar stock track karna ho — optional, kyunki humne pehle decide kiya tha stock abhi nahi)
- **Note:** Stock-tracking abhi optional rakhna — design me dikhe ("stock badhao/dekho") par build me phase. Billing stock pe depend na kare.

**Solution:** Product fields business-type adaptive. Inventory view ka layout business ke hisaab se. Stock optional.

---

## G. Bill format — har business apna
Medical ka bill alag dikhta (batch/expiry), kirana ka simple, garment ka size-wise. 
**Solution:** Bill template business-type ke hisaab se thoda adapt kare (jo fields relevant hain wahi dikhe). Core same (dukaan header, items, total, GST/simple).

---

## H. "List me nahi" wala business — khud set kare
Jo business dropdown me na mile, woh "Other / Custom" choose kare aur khud bataye:
- Kya bechta hai (product/service/dono)
- Default unit kya (pcs/kg/custom)
- GST hai ya nahi
- Scan use karega ya list mode

**Solution:** "Other" business pe ek chhota custom-setup — dukaandaar apne hisaab se app ko dhaal le.

---

## I. Aur edge cases (jo abhi tak nahi soche)
- **Discount** — bill pe discount (% ya ₹), per item ya total. Bahut common.
- **Round-off** — total ko round karna (₹152.40 → ₹152).
- **Multiple price** — ek item ka MRP aur selling price alag; ya wholesale vs retail rate.
- **Return / refund** — galat bill, ya customer wapas kare. (kam se kam bill cancel/delete + note)
- **Bill edit** — save ke baad galti pakdी toh edit/cancel.
- **Customer save** — baar-baar aane wala customer, number save ho, agli baar auto.
- **Day summary** — aaj kitna becha, kitne bill (dashboard me hai, par cash/udhaar split bhi).
- **Quick favourites** — top-selling items ek tap pe (loose/list mode ke liye zaroori).
- **Hold / park bill** — ek customer ka bill adhूrа chhod ke doosra start (counter pe common).
- **Tax-inclusive vs exclusive** — price me GST shamil hai ya upar lagega.

---

## J. Sab me ek hi cheez constant: SIMPLE
Yeh sab features ho — **par dukaandaar ko bhaari na lage.** Jo feature uske business ka nahi, woh dikhe hi na (business type se hide). Default sabse fast. Advanced cheezein chhupi hui, zarurat pe khulein. Yeh balance sabse important hai — warna hum Vyapar jaise bhaari ban jayenge, jo problem hum solve kar rahe the.

---

## Priority (design me sab, build me yeh order)
**Must (core):** unit support, billing modes (scan/list/service/mixed + manual switch), step-by-step light checkout, paid/unpaid, business-adaptive product+bill, "Other" custom setup.
**Should:** discount, round-off, customer save + ledger, hold/park bill, quick favourites.
**Later:** stock tracking, returns, multi-price, reminders.
