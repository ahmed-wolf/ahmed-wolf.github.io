// الإعدادات والدوال المشتركة بين المتجر ومنيو الكراسي وشاشة البارتنر
const FB_SUPABASE_URL = "https://rjhsjekwixavydzkghqt.supabase.co";
const FB_SUPABASE_KEY = "sb_publishable_lHjuLBBq_tr59ziXYvFSag_UMPkGMkj";

const sb = window.supabase.createClient(FB_SUPABASE_URL, FB_SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

const FB_FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect width='100%25' height='100%25' fill='%23F4EFE2'/%3E%3Ccircle cx='200' cy='118' r='44' fill='%23235848' fill-opacity='0.12'/%3E%3Ctext x='200' y='132' text-anchor='middle' font-size='44'%3E%F0%9F%A5%90%3C/text%3E%3Ctext x='200' y='198' text-anchor='middle' font-family='Cairo,sans-serif' font-size='16' fill='%23235848' font-weight='700'%3EFamily Bakery%3C/text%3E%3C/svg%3E";

const DEFAULT_STORE_SETTINGS = {
  id: 1,
  store_status: "open",
  whatsapp_phone: "201030981097",
  instapay_number: "01030981097",
  wallet_number: "01224770477",
  landline_old_branch: "0222699900",
  landline_bahr_branch: "",
  tiktok_url: "https://www.tiktok.com/@family_bakeryy",
  facebook_url: "https://www.facebook.com/familybakeryegy",
  instagram_url: "https://www.instagram.com/family_bakery_1",
  maps_url: "https://maps.app.goo.gl/MenFJr5FBtiSbntGA",
  popup_active: false,
  popup_text: "",
  upsell_active: false,
  upsell_name: "",
  upsell_price: 0,
  upsell_icon: "🥐",
  upsell_msg: ""
};

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeGetStr(key, fallback = "") {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
  } catch {}
}

function isValidEgyptianPhone(phone) {
  return /^01[0125][0-9]{8}$/.test(String(phone || "").trim());
}

function generateTrackingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "FB-";
  const arr = new Uint8Array(6);
  if (window.crypto && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 6; i++) out += chars[arr[i] % chars.length];
  return out;
}

function simpleHash(str) {
  str = String(str || "");
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

async function loadStoreSettings() {
  try {
    const { data, error } = await sb
      .from("web_store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) return { ...DEFAULT_STORE_SETTINGS, ...data };
  } catch {}
  return { ...DEFAULT_STORE_SETTINGS };
}

function formatPaymentLabel(method) {
  if (method === "instapay") return "إنستا باي 📱";
  if (method === "wallet") return "محفظة إلكترونية 👛";
  return "كاش 💵";
}

function formatStatusInfo(status, estimatedMinutes) {
  const map = {
    pending: {
      label: estimatedMinutes
        ? `تم التوجيه للفرع (التحضير المتوقع ${estimatedMinutes} د)`
        : "تم استلام الطلب وبانتظار التأكيد ⏳",
      step: 1,
      cls: "st-pending"
    },
    accepted: {
      label: estimatedMinutes
        ? `الفرع استلم الطلب وجاري التحضير (${estimatedMinutes} د) 🔥`
        : "الفرع استلم الطلب وجاري التحضير 🔥",
      step: 2,
      cls: "st-preparing"
    },
    preparing: {
      label: estimatedMinutes
        ? `جاري التجهيز في المخبز (${estimatedMinutes} د) 👨‍🍳`
        : "جاري التجهيز في المخبز 👨‍🍳",
      step: 2,
      cls: "st-preparing"
    },
    ready: {
      label: "طلبك جاهز / في الطريق إليك 🛵",
      step: 3,
      cls: "st-ready"
    },
    delivered: {
      label: "تم التسليم بنجاح ✅",
      step: 4,
      cls: "st-done"
    },
    rejected: {
      label: "عذراً، تم رفض الطلب ❌",
      step: 0,
      cls: "st-rejected"
    },
    cancelled: {
      label: "تم إلغاء الطلب ❌",
      step: 0,
      cls: "st-rejected"
    }
  };
  return map[status] || map.pending;
}

// تجهيز نص منسق لعمود notes حتى يقرأه ويطبعه pos_1.html مباشرة بدون تعديل
function formatOrderNotesForPOS({ orderType, tableNo, phone, address, paymentMethod, items, promoCode, discountAmount, trackingCode, extraNotes }) {
  const lines = [];
  if (orderType === "dine_in") {
    lines.push(`🪑 طلب ترابيزة رقم: ${tableNo || "-"}`);
  } else if (orderType === "pickup") {
    lines.push("🛍️ استلام من الفرع");
  } else {
    lines.push("🛵 طلب دليفري");
  }
  if (trackingCode) lines.push(`كود: ${trackingCode}`);
  if (phone) lines.push(`تليفون: ${phone}`);
  if (address && orderType === "delivery") lines.push(`العنوان: ${address}`);
  lines.push(`الدفع: ${formatPaymentLabel(paymentMethod)}`);
  lines.push("----------");
  items.forEach((it) => {
    const qtyLabel = it.isWeight ? `${it.quantity} ك` : `${it.quantity}`;
    lines.push(`• ${it.name} × ${qtyLabel} = ${Math.round(it.price * it.quantity)} ج`);
  });
  if (discountAmount > 0) {
    lines.push(`🎁 خصم (${promoCode || ""}): -${Math.round(discountAmount)} ج`);
  }
  if (extraNotes) lines.push(`ملاحظة: ${extraNotes}`);
  return lines.join("\n");
}

function showToast(msg, isError = false) {
  let el = document.getElementById("fb-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "fb-toast";
    el.className = "fb-toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("error", Boolean(isError));
  el.classList.add("show");
  clearTimeout(window.__fbToastTimer);
  window.__fbToastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function playNotificationChime(urgent = false) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!window.__fbAudioCtx) window.__fbAudioCtx = new Ctx();
    const ctx = window.__fbAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const notes = urgent ? [880, 1175, 880, 1175] : [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = urgent ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.2);
    });
  } catch {}
}