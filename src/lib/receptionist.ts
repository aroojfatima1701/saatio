import { freeSlots, type State } from './store';
import { addDays, fmtDate, fmtTime, money, weekday, type Booking } from './data';

/* ---------------------------------------------------------------------------------------------
   Saatio receptionist (demo engine)
   The product uses an AI model with tools (check availability, book, move, cancel, hand over).
   This offline stand-in covers the common requests so the demo behaves like the real thing:
   English, Arabic and Roman Urdu, typos, follow-up messages, "yes" to accept, "other times",
   cancelling and moving existing bookings, and asking new clients for their name.
--------------------------------------------------------------------------------------------- */

export type Lang = 'en' | 'ar' | 'ur';
export type Slot = { date: string; start: number; staffId: string };
export type Choice = { label: string; kind: 'slot'; slot: Slot } | { label: string; kind: 'cancel' | 'move'; id: string };
export interface Ctx {
  lang: Lang; serviceId?: string; date?: string; range?: [number, number];
  offered?: Slot[]; mode?: 'book' | 'move'; moveId?: string; listing?: 'cancel' | 'move';
  awaitingName?: boolean; pending?: Slot; name?: string;
}
export interface Env { today: string; now: number; clientId: string | null; clientName: string | null }
export interface Out { text: string; choices?: Choice[]; ctx: Ctx; log?: string; pick?: Slot; handoff?: boolean }

/* ---------- Text helpers ---------- */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function norm(t: string) {
  return t.toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[^\p{L}\p{N}\s:]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function tokens(t: string) {
  const out = new Set<string>();
  for (const w of t.split(' ')) { if (!w) continue; out.add(w); if (/[؀-ۿ]/.test(w)) { const s = w.replace(/^(و|ف)?(ب|ل|ك)?(ال)?/, ''); if (s.length > 1) out.add(s); } }
  return [...out];
}
/** Edit distance that counts a swap of two letters as one mistake ("facail" → "facial"). */
function dist(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
function has(tk: string[], text: string, words: string[]) {
  for (const raw of words) {
    const w = norm(raw);
    if (w.includes(' ')) { if (` ${text} `.includes(` ${w} `)) return true; continue; }
    for (const t of tk) {
      if (t === w) return true;
      if (w.length >= 5 && t.length >= 4 && Math.abs(t.length - w.length) <= 2 && dist(t, w) <= (w.length >= 8 ? 2 : 1)) return true;
    }
  }
  return false;
}

/* ---------- Vocabulary ---------- */
const SERVICES: [string, string[]][] = [
  ['balayage', ['balayage', 'highlights', 'highlight', 'بالياج', 'هايلايت', 'هاي لايت']],
  ['colour', ['colour', 'color', 'dye', 'hair colour', 'rang', 'colouring', 'صبغه', 'صبغ', 'لون الشعر']],
  ['blow', ['blowdry', 'blow dry', 'blowout', 'blow', 'sushwar', 'سشوار', 'استشوار', 'بلودراي', 'سيشوار']],
  ['cut', ['haircut', 'hair cut', 'cut', 'trim', 'baal', 'bal katwane', 'hair', 'قص', 'شعر', 'قصه', 'تصفيف']],
  ['mani', ['manicure', 'mani', 'nails', 'nail', 'gel', 'nakhun', 'nakhoon', 'مناكير', 'منيكير', 'اظافر', 'جل']],
  ['pedi', ['pedicure', 'pedi', 'feet', 'باديكير', 'بديكير', 'پیڈیکیور']],
  ['facial', ['facial', 'face', 'skin', 'cleanup', 'clean up', 'chehra', 'فيشل', 'بشره', 'تنظيف بشره', 'تنظيف']],
  ['brows', ['brow', 'brows', 'eyebrow', 'eyebrows', 'threading', 'abru', 'bhaven', 'حواجب', 'حاجب']],
  ['lash', ['lash', 'lashes', 'lash lift', 'eyelashes', 'palkein', 'رموش', 'رمش']],
];
const AR_NAMES: Record<string, string> = { cut: 'قص وتصفيف الشعر', blow: 'سشوار', colour: 'صبغة الشعر', balayage: 'بالياج', mani: 'مناكير جل', pedi: 'باديكير', facial: 'تنظيف البشرة', brows: 'تشكيل الحواجب', lash: 'رفع الرموش' };
const W = {
  greet: ['hi', 'hello', 'hey', 'salam', 'salaam', 'assalam', 'aoa', 'assalamualaikum', 'good morning', 'good evening', 'مرحبا', 'السلام', 'سلام', 'هلا', 'اهلا', 'مساء الخير', 'صباح الخير'],
  thanks: ['thanks', 'thank', 'thx', 'shukriya', 'shukria', 'jazakallah', 'شكرا', 'مشكور', 'مشكوره', 'يعطيك العافيه'],
  price: ['price', 'prices', 'cost', 'how much', 'rate', 'rates', 'charges', 'fee', 'kitne', 'kitna', 'kitni', 'qeemat', 'كم', 'سعر', 'السعر', 'بكم', 'اسعار', 'الاسعار'],
  hours: ['open', 'close', 'closing', 'hours', 'timing', 'timings', 'kab tak', 'kab khulta', 'band', 'متى', 'الدوام', 'دوام', 'ساعات', 'تفتح', 'تسكر', 'تغلق', 'تفتحون'],
  offers: ['discount', 'discounts', 'offer', 'offers', 'special offer', 'deal', 'deals', 'promo', 'promotion', 'promotions', 'sale', 'coupon', 'voucher', 'package', 'packages', 'riyayat', 'rayat', 'sasta', 'خصم', 'خصومات', 'عرض', 'عروض', 'تخفيض', 'تخفيضات', 'كوبون', 'باقه', 'باقات'],
  where: ['where', 'location', 'address', 'located', 'kahan', 'kidhar', 'parking', 'وين', 'فين', 'العنوان', 'الموقع', 'موقعكم', 'مكانكم'],
  cancel: ['cancel', 'cancellation', 'nahi aa sakti', 'nahi aa sakta', 'nahi aaungi', 'nahi aaunga', 'الغاء', 'الغي', 'الغيه', 'كنسل'],
  move: ['reschedule', 'move', 'change time', 'change my', 'postpone', 'shift', 'time change', 'badal', 'badalna', 'تغيير', 'تاجيل', 'اجل', 'اغير', 'غير الموعد', 'نقل'],
  more: ['other time', 'other times', 'another time', 'more times', 'any other', 'later', 'earlier', 'koi aur', 'aur time', 'doosra', 'dusra', 'وقت ثاني', 'وقت اخر', 'موعد اخر', 'غير وقت', 'اوقات ثانيه'],
  yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'perfect', 'great', 'haan', 'han', 'ji', 'jee', 'theek', 'thik', 'confirm', 'done', 'book it', 'اي', 'ايوا', 'ايه', 'نعم', 'تمام', 'اوكي', 'اكيد', 'ماشي'],
  no: ['no', 'nope', 'nahi', 'nahin', 'لا', 'ما ابي'],
  human: ['human', 'staff', 'manager', 'call me', 'real person', 'baat karni', 'insaan', 'موظف', 'شخص', 'اكلم', 'كلموني'],
  usual: ['same as last time', 'the usual', 'usual', 'same again', 'pichli dafa', 'pichli baar', 'wahi', 'نفس المره', 'نفس الخدمه', 'مثل اخر مره'],
  today: ['today', 'tonight', 'aaj', 'aj', 'اليوم', 'الليله'],
  tomorrow: ['tomorrow', 'tmrw', 'tmr', 'tomoro', 'kal', 'kl', 'بكره', 'بكرا', 'غدا', 'باكر'],
  after2: ['day after tomorrow', 'parson', 'parso', 'بعد بكره'],
  morning: ['morning', 'subah', 'subha', 'صباح', 'الصبح', 'صباحا'],
  afternoon: ['afternoon', 'dopahar', 'dopehar', 'lunch', 'ظهر', 'الظهر', 'العصر', 'عصر'],
  evening: ['evening', 'shaam', 'sham', 'night', 'raat', 'after work', 'مساء', 'المساء', 'مسا', 'الليل', 'بالليل'],
};
const URDU = ['kal', 'aaj', 'baje', 'bje', 'karwana', 'karwani', 'chahiye', 'chahye', 'hai', 'mujhe', 'mjhe', 'kya', 'kitne', 'shaam', 'subah', 'haan', 'nahi', 'theek', 'aur', 'ho', 'sakta', 'sakti', 'karna', 'karni', 'mera', 'meri', 'ka', 'ki', 'ke', 'se', 'dein', 'kab', 'koi', 'hain', 'milega', 'milta', 'milti', 'abhi'];
const WEEK: string[][] = [
  ['sunday', 'sun', 'itwar', 'itwaar', 'الاحد', 'احد'], ['monday', 'mon', 'peer', 'pir', 'الاثنين', 'اثنين'], ['tuesday', 'tue', 'tues', 'mangal', 'الثلاثاء', 'ثلاثاء'],
  ['wednesday', 'wed', 'budh', 'budhwar', 'الاربعاء', 'اربعاء'], ['thursday', 'thu', 'thur', 'thurs', 'jumerat', 'jumeraat', 'الخميس', 'خميس'],
  ['friday', 'fri', 'jumma', 'juma', 'jummah', 'الجمعه', 'جمعه'], ['saturday', 'sat', 'sanichar', 'weekend', 'السبت', 'سبت'],
];

export function detectLang(text: string): Lang {
  if (/[؀-ۿ]/.test(text)) return 'ar';
  const tk = norm(text).split(' ');
  return tk.filter((t) => URDU.includes(t)).length >= 2 || tk.some((t) => ['baje', 'bje', 'karwana', 'karwani', 'karwane', 'chahiye', 'chahye', 'mujhe', 'shaam', 'subah', 'kitne', 'haan', 'theek', 'nahi', 'shukriya', 'parson', 'riyayat', 'koi'].includes(t)) ? 'ur' : 'en';
}

/* ---------- Replies in three languages ---------- */
type Key = 'offers' | 'noOffers' | 'priceOne' | 'priceTailOffered' | 'priceTailBook' | 'greet' | 'askService' | 'offer' | 'prePrice' | 'preFull' | 'preMove' | 'noSlots' | 'askName' | 'booked' | 'taken' | 'prices' | 'hours' | 'where' | 'thanks'
  | 'human' | 'chooseCancel' | 'chooseMove' | 'noBookings' | 'cancelled' | 'moved' | 'decline' | 'fallback' | 'noUsual';
const TXT: Record<Key, Record<Lang, string>> = {
  offers: { en: 'Yes! Here’s what’s on right now:{list}Would you like to book?', ar: 'أكيد! عروضنا الحالية:{list}تحبين تحجزين؟', ur: 'Ji haan! Abhi yeh offers chal rahe hain:{list}Booking karni hai?' },
  noOffers: { en: 'We don’t have any offers running right now, but all our prices are on the booking page. Would you like to book?', ar: 'ما عندنا عروض حالياً، بس كل الأسعار موجودة في صفحة الحجز. تحبين تحجزين؟', ur: 'Abhi koi offer nahi chal raha, lekin saari prices booking page par hain. Booking karni hai?' },
  priceOne: { en: 'A {svc} is {price} and takes {mins}. {tail}', ar: 'سعر {svc} {price} ومدته {mins}. {tail}', ur: '{svc} {price} ki hai aur is mein {mins} lagta hai. {tail}' },
  priceTailOffered: { en: 'Shall I book one of the times above?', ar: 'أحجز لك أحد الأوقات اللي فوق؟', ur: 'Upar wale times mein se koi book kar dun?' },
  priceTailBook: { en: 'Would you like to book it?', ar: 'تحبين أحجز لك؟', ur: 'Book kar dun?' },
  greet: { en: 'Hi{name}! 👋 Welcome to {biz}. I can book, move or cancel appointments and answer questions about prices and timings. What would you like?', ar: 'أهلاً{name}! 👋 معك {biz}. أقدر أحجز لك موعد أو أغيّره أو ألغيه، وأجاوب عن الأسعار والأوقات. كيف أقدر أساعدك؟', ur: 'Assalam o alaikum{name}! 👋 {biz} mein khush aamdeed. Main appointment book, change ya cancel kar sakti hun, aur prices aur timings bata sakti hun. Kya chahiye?' },
  askService: { en: 'Sure! Which service would you like? For example a haircut, blow-dry, gel manicure, facial or lash lift.', ar: 'أكيد! أي خدمة تحبين؟ مثلاً قص شعر، سشوار، مناكير جل، تنظيف بشرة أو رفع رموش.', ur: 'Zaroor! Kaunsi service chahiye? Jaise haircut, blow-dry, gel manicure, facial ya lash lift.' },
  offer: { en: '{pre}{who} can do your {svc} {day} at {times}. Which time suits you?', ar: '{pre}{who} متاحة لـ{svc} {day} الساعة {times}. أي وقت يناسبك؟', ur: '{pre}{who} {day} {times} par aap ki {svc} kar sakti hain. Kaunsa time theek rahega?' },
  prePrice: { en: 'A {svc} is {price} and takes {mins}. ', ar: 'سعر {svc} {price} ومدته {mins}. ', ur: '{svc} {price} ki hai aur is mein {mins} lagta hai. ' },
  preFull: { en: 'That time is fully booked, but ', ar: 'هذا الوقت محجوز، بس ', ur: 'Woh time booked hai, lekin ' },
  preMove: { en: 'No problem, let’s move it. ', ar: 'ولا يهمك، خلينا نغيّر الموعد. ', ur: 'Koi masla nahi, time badal dete hain. ' },
  noSlots: { en: 'We’re fully booked for {svc} {day}. Would another day work?', ar: 'للأسف ما في مواعيد لـ{svc} {day}. يناسبك يوم ثاني؟', ur: '{day} {svc} ke liye koi slot khaali nahi. Koi aur din chalega?' },
  askName: { en: 'Lovely! May I have your name for the booking?', ar: 'تمام! ممكن اسمك للحجز؟', ur: 'Bohat achha! Booking ke liye apna naam bata dein?' },
  booked: { en: 'Done ✅ {svc} with {who}, {day} at {time}. I’ll remind you the day before. See you soon, {name}!', ar: 'تم ✅ {svc} مع {who}، {day} الساعة {time}. راح أرسل لك تذكير قبلها بيوم. نشوفك قريب يا {name}!', ur: 'Ho gaya ✅ {svc} {who} ke saath, {day} {time} baje. Ek din pehle reminder bhej dungi. Milte hain, {name}!' },
  taken: { en: 'Sorry, that time was just taken. ', ar: 'آسفين، هذا الوقت انحجز الحين. ', ur: 'Maazrat, woh time abhi abhi book ho gaya. ' },
  prices: { en: 'Here are some of our prices: {list}. Which one would you like?', ar: 'هذي بعض أسعارنا: {list}. أي خدمة تحبين؟', ur: 'Hamari kuch prices: {list}. Kaunsi service chahiye?' },
  hours: { en: 'We’re open every day from {open} to {close} in {area}. Would you like to book?', ar: 'نفتح كل يوم من {open} إلى {close} في {area}. تحبين تحجزين؟', ur: 'Hum rozana {open} se {close} tak khule hain, {area} mein. Booking karni hai?' },
  where: { en: 'We’re in {area}, {city}, with free parking for clients. Shall I book you in?', ar: 'موقعنا في {area}، {city}، وفي مواقف مجانية للعملاء. أحجز لك؟', ur: 'Hum {area}, {city} mein hain, clients ke liye parking free hai. Booking kar dun?' },
  thanks: { en: 'You’re welcome! Anything else I can help with?', ar: 'العفو! في شي ثاني أقدر أساعدك فيه؟', ur: 'Koi baat nahi! Aur kuch madad chahiye?' },
  human: { en: 'Of course. I’ve asked the team to reply here, someone will message you in a few minutes.', ar: 'أكيد. طلبت من الفريق يردون عليك هنا خلال دقائق.', ur: 'Zaroor. Team ko bata diya hai, kuch minute mein yahin jawab dein ge.' },
  chooseCancel: { en: 'Which booking would you like to cancel?', ar: 'أي حجز تبين تلغين؟', ur: 'Kaunsi booking cancel karni hai?' },
  chooseMove: { en: 'Which booking would you like to move?', ar: 'أي حجز تبين تغيّرين موعده؟', ur: 'Kaunsi booking ka time badalna hai?' },
  noBookings: { en: 'I can’t see any upcoming bookings for this number. Would you like to make one?', ar: 'ما لقيت أي حجز قادم على هذا الرقم. تحبين تحجزين موعد؟', ur: 'Is number par koi aane wali booking nahi mili. Nayi booking karni hai?' },
  cancelled: { en: 'Done, your {svc} {day} at {time} is cancelled. Hope to see you again soon!', ar: 'تم إلغاء موعد {svc} {day} الساعة {time}. نتمنى نشوفك قريب!', ur: 'Aap ki {svc} ({day}, {time}) cancel ho gayi. Umeed hai jald milenge!' },
  moved: { en: 'All set ✅ Your {svc} is now {day} at {time} with {who}.', ar: 'تم ✅ موعد {svc} صار {day} الساعة {time} مع {who}.', ur: 'Ho gaya ✅ Aap ki {svc} ab {day} {time} baje {who} ke saath hai.' },
  decline: { en: 'No problem. Tell me another day or time that suits you.', ar: 'ولا يهمك. قولي لي يوم أو وقت ثاني يناسبك.', ur: 'Koi masla nahi. Koi aur din ya time bata dein.' },
  fallback: { en: 'Sorry, I didn’t quite get that. I can book, move or cancel an appointment, or tell you our prices and timings. I’ve also flagged your message for the team.', ar: 'آسفة، ما فهمت عليك تماماً. أقدر أحجز أو أغيّر أو ألغي موعد، أو أعطيك الأسعار والأوقات. وبلّغت الفريق برسالتك.', ur: 'Maazrat, theek se samajh nahi aaya. Main booking kar sakti hun, time badal ya cancel kar sakti hun, ya prices aur timings bata sakti hun. Aap ka message team ko bhi bhej diya hai.' },
  noUsual: { en: 'I don’t have a previous visit for this number yet. Which service would you like?', ar: 'ما عندي زيارة سابقة على هذا الرقم. أي خدمة تحبين؟', ur: 'Is number par pichli koi visit nahi mili. Kaunsi service chahiye?' },
};
const cap = (x: string) => x.replace(/^(\s*)(\p{Ll})/u, (_, a: string, c: string) => a + c.toUpperCase()).replace(/(✅ |\. )(\p{Ll})/gu, (_, a: string, c: string) => a + c.toUpperCase());
const fill = (k: Key, lang: Lang, v: Record<string, string> = {}) => cap(Object.entries(v).reduce((s, [a, b]) => s.split(`{${a}}`).join(b), TXT[k][lang]));

const AR_STAFF: Record<string, string> = { sara: 'سارة', maya: 'مايا', leila: 'ليلى', hana: 'هناء' };
export const staffName = (s: State, id: string, lang: Lang) => (lang === 'ar' && AR_STAFF[id] ? AR_STAFF[id] : s.staff.find((x) => x.id === id)!.name.split(' ')[0]);
export const priceL = (v: number, cur: 'AED' | 'USD', lang: Lang) => (lang === 'ar' ? (cur === 'AED' ? `${v} درهم` : `${v} دولار`) : money(v, cur));
const AR_PLACES: Record<string, string> = { 'Dubai Marina': 'دبي مارينا', Dubai: 'دبي', 'Abu Dhabi': 'أبوظبي', Sharjah: 'الشارقة' };
const placeL = (x: string, lang: Lang) => (lang === 'ar' ? AR_PLACES[x] ?? x : x);
export function durL(m: number, lang: Lang) {
  const h = m / 60;
  return m % 60 === 0 ? { en: `${h} hr`, ar: h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`, ur: `${h} ghanta` }[lang] : { en: `${m} min`, ar: `${m} دقيقة`, ur: `${m} minute` }[lang];
}
const AR_OFFERS: Record<string, string> = { '15% off your first visit': 'خصم 15% على زيارتك الأولى', '20% off blow-dries on weekdays before 1 PM': 'خصم 20% على السشوار أيام الأسبوع قبل الساعة 1 الظهر', 'A free brow tint with any signature facial': 'صبغة حواجب مجانية مع أي جلسة تنظيف بشرة' };
const UR_OFFERS: Record<string, string> = { '15% off your first visit': 'pehli visit par 15% off', '20% off blow-dries on weekdays before 1 PM': 'weekdays par 1 baje se pehle blow-dry par 20% off', 'A free brow tint with any signature facial': 'signature facial ke saath brow tint free' };
export function svcName(s: State, id: string, lang: Lang) { const sv = s.services.find((x) => x.id === id)!; return lang === 'ar' && AR_NAMES[id] ? AR_NAMES[id] : sv.name.toLowerCase(); }
export function timeL(m: number, lang: Lang) { const t = fmtTime(m); return lang === 'ar' ? t.replace(' AM', ' ص').replace(' PM', ' م') : t; }
export function dayL(d: string, today: string, lang: Lang) {
  if (d === today) return { en: 'today', ar: 'اليوم', ur: 'aaj' }[lang];
  if (d === addDays(today, 1)) return { en: 'tomorrow', ar: 'بكرة', ur: 'kal' }[lang];
  if (lang === 'ar') return new Intl.DateTimeFormat('ar-AE-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
  return `${lang === 'ur' ? '' : 'on '}${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' })}`;
}
const first = (n: string) => n.split(' ')[0];
const join = (a: string[], lang: Lang) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ${{ en: 'or', ar: 'أو', ur: 'ya' }[lang]} ${a[a.length - 1]}`);

/* ---------- Understanding ---------- */
function parseDay(tk: string[], text: string, today: string): string | null {
  if (has(tk, text, W.after2)) return addDays(today, 2);
  if (has(tk, text, W.today)) return today;
  if (has(tk, text, W.tomorrow)) return addDays(today, 1);
  for (let i = 0; i < 7; i++) if (has(tk, text, WEEK[i])) { for (let k = 1; k <= 7; k++) if (weekday(addDays(today, k)) === i) return addDays(today, k); }
  return null;
}
function parseTime(tk: string[], text: string, open: number, close: number): [number, number] | null {
  const NUM: Record<string, string> = { ek: '1', do: '2', teen: '3', char: '4', chaar: '4', paanch: '5', panch: '5', chhe: '6', che: '6', saat: '7', aath: '8', nau: '9', das: '10', gyarah: '11', barah: '12' };
  text = text.replace(/\b(ek|do|teen|chaar|char|paanch|panch|chhe|che|saat|aath|nau|das|gyarah|barah)\s+(baje|bje|bajay|bajy)\b/g, (_, w: string, b: string) => `${NUM[w]} ${b}`);
  const pm = has(tk, text, W.evening) || has(tk, text, W.afternoon) || /\bpm\b|\bم\b/.test(text);
  const m = text.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|bje|bajay|bajy|ص|م)?(?=\s|$)/);
  if (m && !/\s(din|days?|ayam|ايام|يوم)\b/.test(text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 6))) {
    let h = Number(m[1]); if (h > 23) return null;
    const ap = m[3] === 'am' || m[3] === 'ص' ? 'am' : m[3] === 'pm' || m[3] === 'م' || pm ? 'pm' : h < 9 ? 'pm' : h === 12 ? 'pm' : h > 12 ? 'pm' : 'am';
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    const base = h * 60 + Number(m[2] ?? 0);
    if (/\b(after|baad|بعد)\b/.test(text)) return [base, close];
    if (/\b(before|pehle|qabl|قبل)\b/.test(text)) return [open, base];
    return [base - 30, base + 90];
  }
  if (has(tk, text, W.morning)) return [open, 12 * 60];
  if (has(tk, text, W.afternoon)) return [12 * 60, 17 * 60];
  if (has(tk, text, W.evening)) return [17 * 60, close];
  return null;
}
export function findService(s: State, text: string): string | null {
  const t = norm(text); const tk = tokens(t);
  for (const [id, words] of SERVICES) if (s.services.some((x) => x.id === id && x.active) && has(tk, t, words)) return id;
  for (const sv of s.services) if (sv.active && t.includes(norm(sv.name))) return sv.id; // services added in the dashboard
  return null;
}
export function upcoming(s: State, env: Env): Booking[] {
  if (!env.clientId) return [];
  return s.bookings.filter((b) => b.customerId === env.clientId && b.status === 'confirmed' && (b.date > env.today || (b.date === env.today && b.start > env.now)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 4);
}

/** Offer up to three free times for a service, starting from a date and preferred time range. */
export function offer(s: State, env: Env, ctx: Ctx, opts: { serviceId: string; date?: string; range?: [number, number] | null; after?: Slot; pre?: string; ignore?: string }): Out {
  const lang = ctx.lang; const sv = s.services.find((x) => x.id === opts.serviceId)!;
  const base = opts.ignore ? { ...s, bookings: s.bookings.filter((b) => b.id !== opts.ignore) } : s;
  const startDay = opts.after ? opts.after.date : opts.date ?? env.today;
  const days = opts.date && !opts.after ? [opts.date] : Array.from({ length: 7 }, (_, i) => addDays(startDay, i));
  for (const d of days) {
    const all = freeSlots(base, d, sv.id, 'any').filter((x) => (d !== env.today || x.start > env.now + 45) && (!opts.after || d > opts.after.date || x.start > opts.after.start + 15));
    if (!all.length) continue;
    const fit = opts.range ? all.filter((x) => x.start >= opts.range![0] && x.start <= opts.range![1]) : all;
    const spaced = (l: typeof all) => l.filter((x, i, a) => i === 0 || a[i - 1].start + 30 <= x.start);
    // If the asked-for time is taken, offer the free times closest to it.
    const mid = opts.range ? (opts.range[0] + opts.range[1]) / 2 : 0;
    const pick = (fit.length ? spaced(fit).slice(0, 3) : opts.range ? spaced(all).sort((a, z) => Math.abs(a.start - mid) - Math.abs(z.start - mid)).slice(0, 3).sort((a, z) => a.start - z.start) : spaced(all).slice(0, 3)).map((x) => ({ ...x, date: d }));
    const who = join([...new Set(pick.map((p) => staffName(s, p.staffId, lang)))], lang);
    const pre = (opts.pre ?? '') + (opts.range && !fit.length && !opts.after ? TXT.preFull[lang] : '');
    return {
      text: fill('offer', lang, { pre, who, svc: svcName(s, sv.id, lang), day: dayL(d, env.today, lang), times: join(pick.map((p) => timeL(p.start, lang)), lang) }),
      choices: pick.map((p) => ({ kind: 'slot', slot: p, label: timeL(p.start, lang) })),
      ctx: { ...ctx, serviceId: sv.id, date: d, range: opts.range ?? undefined, offered: pick }, log: `Checked live availability for ${sv.name}`,
    };
  }
  return { text: fill('noSlots', lang, { svc: svcName(s, sv.id, lang), day: opts.date ? dayL(opts.date, env.today, lang) : { en: 'this week', ar: 'هذا الأسبوع', ur: 'is hafte' }[lang] }), ctx: { ...ctx, serviceId: sv.id, offered: undefined } };
}

export function bookingChoices(s: State, list: Booking[], kind: 'cancel' | 'move', env: Env, lang: Lang): Choice[] {
  return list.map((b) => ({ kind, id: b.id, label: cap(`${svcName(s, b.serviceId, lang)} · ${dayL(b.date, env.today, lang).replace(/^on /, '')} ${timeL(b.start, lang)}`) }));
}

/** Read one client message and decide what to say or do next. */
export function respond(s: State, text: string, env: Env, prev: Ctx): Out {
  // Short replies like "ok" or "1:30" keep the language the conversation is already in.
  let lang = detectLang(text);
  const short = norm(text); const shortTk = tokens(short);
  if (lang === 'en' && prev.lang !== 'en' && short.split(' ').length <= 2 && (has(shortTk, short, [...W.yes, ...W.no, ...W.more]) || /^[\d:\s]*(am|pm)?$/.test(short))) lang = prev.lang;
  const ctx: Ctx = { ...prev, lang };
  const t = norm(text); const tk = tokens(t); const b = s.business; const cur = b.currency;

  if (ctx.awaitingName) {
    const name = text.replace(/^(my name is|it'?s|i am|i'm|this is|mera naam|mera nam|main|اسمي|انا)\s+/i, '').replace(/\s+(hai|he|hun|hoon)$/i, '').trim();
    if (name.length >= 2 && name.length <= 40 && !findService(s, text)) return { text: '', ctx: { ...ctx, awaitingName: false, name: name.replace(/\b\w/g, (c) => c.toUpperCase()) }, pick: ctx.pending };
  }
  if (has(tk, t, W.human)) return { text: fill('human', lang), ctx, handoff: true, log: 'Handed the conversation to your team' };
  if (has(tk, t, W.cancel)) {
    const list = upcoming(s, env);
    if (!list.length) return { text: fill('noBookings', lang), ctx };
    return { text: fill('chooseCancel', lang), choices: bookingChoices(s, list, 'cancel', env, lang), ctx: { ...ctx, listing: 'cancel' }, log: 'Looked up the client’s bookings' };
  }
  if (has(tk, t, W.move)) {
    const list = upcoming(s, env);
    if (!list.length) return { text: fill('noBookings', lang), ctx };
    if (list.length === 1) {
      const bk = list[0];
      return offer(s, env, { ...ctx, mode: 'move', moveId: bk.id }, { serviceId: bk.serviceId, date: parseDay(tk, t, env.today) ?? undefined, range: parseTime(tk, t, b.open, b.close), pre: TXT.preMove[lang], ignore: bk.id });
    }
    return { text: fill('chooseMove', lang), choices: bookingChoices(s, list, 'move', env, lang), ctx: { ...ctx, listing: 'move' }, log: 'Looked up the client’s bookings' };
  }

  let serviceId = findService(s, text);
  if (!serviceId && has(tk, t, W.usual) && env.clientId) {
    const last = s.bookings.filter((x) => x.customerId === env.clientId && x.status === 'completed').sort((a, z) => z.date.localeCompare(a.date))[0];
    if (!last) return { text: fill('noUsual', lang), ctx };
    serviceId = last.serviceId;
  }
  const date = parseDay(tk, t, env.today); const range = parseTime(tk, t, b.open, b.close);
  const asksPrice = has(tk, t, W.price);

  if (!serviceId && ctx.offered?.length && has(tk, t, W.yes) && !date && !range) return { text: '', ctx, pick: ctx.offered[0] };
  if (!serviceId && ctx.offered?.length && has(tk, t, W.more)) return offer(s, env, ctx, { serviceId: ctx.serviceId!, after: ctx.offered[ctx.offered.length - 1], range: ctx.range, ignore: ctx.mode === 'move' ? ctx.moveId : undefined });
  if (!serviceId && ctx.offered?.length && has(tk, t, W.no) && !date && !range) return { text: fill('decline', lang), ctx: { ...ctx, offered: undefined } };

  // Discounts and offers come before anything else that could match ("special offer" is not a location question).
  if (has(tk, t, W.offers) && !serviceId) {
    const list = (b.offers ?? []).map((o) => (lang === 'ar' ? AR_OFFERS[o] ?? o : lang === 'ur' ? UR_OFFERS[o] ?? o : o));
    return list.length ? { text: fill('offers', lang, { list: '\n' + list.map((o) => `• ${o}`).join('\n') + '\n' }), ctx, log: 'Shared current offers' } : { text: fill('noOffers', lang), ctx, log: 'Answered a question about offers' };
  }
  // "How much is it?" while talking about one service: price that service only.
  const wantsMenu = has(tk, t, ['list', 'menu', 'all', 'sab', 'saari', 'sari', 'tamam', 'قائمة', 'كل', 'الكل']);
  if (!serviceId && asksPrice && !wantsMenu && ctx.serviceId && s.services.some((x) => x.id === ctx.serviceId)) {
    const sv = s.services.find((x) => x.id === ctx.serviceId)!;
    return { text: fill('priceOne', lang, { svc: svcName(s, sv.id, lang), price: priceL(sv.price, cur, lang), mins: durL(sv.minutes, lang), tail: TXT[ctx.offered?.length ? 'priceTailOffered' : 'priceTailBook'][lang] }), ctx, log: `Shared the price of ${sv.name}` };
  }
  if (!serviceId && asksPrice) {
    const list = s.services.filter((x) => x.active).slice(0, 6).map((x) => `${svcName(s, x.id, lang)} ${priceL(x.price, cur, lang)}`).join(lang === 'ar' ? '، ' : ', ');
    return { text: fill('prices', lang, { list }), ctx, log: 'Shared prices' };
  }
  if (!serviceId && has(tk, t, W.hours)) return { text: fill('hours', lang, { open: timeL(b.open, lang), close: timeL(b.close, lang), area: placeL(b.area, lang) }), ctx, log: 'Answered a question about opening hours' };
  if (!serviceId && has(tk, t, W.where)) return { text: fill('where', lang, { area: placeL(b.area, lang), city: placeL(b.city, lang) }), ctx, log: 'Shared the location' };
  if (!serviceId && has(tk, t, W.thanks)) return { text: fill('thanks', lang), ctx };

  // Follow-ups like "what about Saturday?" or "kal shaam ko?" keep the service from earlier in the chat.
  const sid = serviceId ?? ((date || range) ? ctx.serviceId : undefined);
  if (sid) {
    const sv = s.services.find((x) => x.id === sid)!;
    const mins = durL(sv.minutes, lang);
    const pre = asksPrice ? fill('prePrice', lang, { svc: svcName(s, sid, lang), price: priceL(sv.price, cur, lang), mins }) : '';
    const moving = ctx.mode === 'move' && !serviceId;
    return offer(s, env, { ...ctx, mode: moving ? 'move' : 'book', moveId: moving ? ctx.moveId : undefined }, { serviceId: sid, date: date ?? (range ? ctx.date : undefined), range, pre, ignore: moving ? ctx.moveId : undefined });
  }
  if (has(tk, t, W.greet) || date || range || has(tk, t, W.yes)) {
    if (has(tk, t, W.greet) && !date && !range) return { text: fill('greet', lang, { name: env.clientName ? ` ${first(env.clientName)}` : '', biz: b.name }), ctx };
    return { text: fill('askService', lang), ctx: { ...ctx, date: date ?? ctx.date, range: range ?? ctx.range } };
  }
  return { text: fill('fallback', lang), ctx, handoff: true, log: 'Couldn’t answer, so flagged it for your team' };
}

export const say = fill;
