import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";  
import { createClient } from "@supabase/supabase-js";  
import {  
  Plus, Minus, X, Send, CheckCircle2, Clock, ChefHat,  
  UtensilsCrossed, Receipt, Bike, BarChart3, Lock, Printer,  
  UserCheck, Wallet, Tag, Tv, Percent, Users, Archive  
} from "lucide-react";  

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────  
const supabaseUrl = "https://tgzxcmorfgpblfsgwcgv.supabase.co";  
const supabaseKey = "sb_publishable_BDJcoHqoybh94C8tm0AoLg_rsQuZ51P";  
const supabase = createClient(supabaseUrl, supabaseKey);  
const RECORD_ID = "main";  

const RESTAURANT_NAME = "El Sabor de lo Nuestro Masatepe";  
const SHIFT_START = "17:00";  
const SHIFT_END = "21:00";  
const LATE_GRACE_MIN = 10;  
const DEFAULT_PIN = "1234";  
const POLL_MS = 4000;  

// ─── MENÚ ────────────────────────────────────────────────────────────  
const MENU = [  
  { id: "b1", name: "Hamburguesa Clásica", price: 190, cat: "Hamburguesas" },  
  { id: "b2", name: "Kryspi Burguer", price: 200, cat: "Hamburguesas" },  
  { id: "b3", name: "Big Campeona", price: 250, cat: "Hamburguesas" },  
  { id: "f1", name: "Pingüi Frapp", price: 120, cat: "Frappés" },  
  { id: "f2", name: "Fresa Frapp", price: 120, cat: "Frappés" },  
  { id: "f3", name: "Oreo Frapp", price: 120, cat: "Frappés" },  
  { id: "f4", name: "Chocolate Frapp", price: 120, cat: "Frappés" },  
  { id: "c1", name: "Dedos de Pollo (6u)", price: 200, cat: "Chicken Mood" },  
  { id: "c2", name: "Alitas x6", price: 230, cat: "Chicken Mood" },  
  { id: "c3", name: "Alitas x12", price: 450, cat: "Chicken Mood" },  
  { id: "p1", name: "Panini de Pollo", price: 235, cat: "Paninis" },  
  { id: "p2", name: "Panini de Jamón", price: 190, cat: "Paninis" },  
  { id: "e1", name: "Papas Francesas", price: 50, cat: "Extras" },  
  { id: "e2", name: "Papas Cheddar", price: 100, cat: "Extras" },  
  { id: "e3", name: "Salchipapas", price: 160, cat: "Extras" },  
  { id: "s1", name: "Salsa BBQ", price: 30, cat: "Salsas" },  
  { id: "s2", name: "Salsa Buffalo", price: 30, cat: "Salsas" },  
  { id: "s3", name: "Salsa Ranch", price: 30, cat: "Salsas" },  
  { id: "s4", name: "Salsa de la Casa", price: 30, cat: "Salsas" },  
  { id: "d1", name: "Soda", price: 40, cat: "Bebidas" },  
  { id: "d2", name: "Té de Limón", price: 30, cat: "Bebidas" },  
  { id: "d3", name: "Jugo de Naranja", price: 40, cat: "Bebidas" },  
  { id: "d4", name: "Hi-C", price: 30, cat: "Bebidas" },  
];  

const CAT_ICONS = {  
  "Hamburguesas": "🍔", "Frappés": "🥤", "Chicken Mood": "🍗",  
  "Paninis": "🥪", "Extras": "🍟", "Salsas": "🥫", "Bebidas": "🧃"  
};  
const CATS = ["Hamburguesas", "Frappés", "Chicken Mood", "Paninis", "Extras", "Salsas", "Bebidas"];  

// ─── UTILIDADES ─────────────────────────────────────────────────────  
function money(n) {  
  return "C$" + (n || 0).toLocaleString("es-NI", {  
    minimumFractionDigits: 2,  
    maximumFractionDigits: 2,  
  });  
}  
function orderTotal(items) {  
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);  
}  
function emptyTables() {  
  return Array.from({ length: 5 }, (_, i) => ({  
    id: i + 1, status: "libre", kitchenStatus: null, items: [],  
  }));  
}  
function initialState() {  
  return {  
    tables: emptyTables(),  
    deliveries: [],  
    sales: [],  
    expenses: [],  
    employees: [],  
    clockRecords: [],  
    promotions: [],  
    salesLog: [],  
    expensesLog: [],  
    payments: [],  
    cashSessions: [],  
    pin: DEFAULT_PIN,  
  };  
}  
function todayStr() {  
  return new Date().toDateString();  
}  

// ─── ESTILOS GLOBALES ────────────────────────────────────────────────  
const inp = {  
  width: "100%", padding: 9, borderRadius: 6,  
  border: "1px solid #E5D9C3", fontSize: 14, boxSizing: "border-box",  
};  
const lbl = { display: "block", fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 };  
const iconBtn = {  
  width: 24, height: 24, borderRadius: 6, border: "1px solid #E5D9C3",  
  background: "#fff", cursor: "pointer", display: "flex",  
  alignItems: "center", justifyContent: "center",  
};  
const statCard = { background: "#fff", border: "1px solid #E5D9C3", borderRadius: 10, padding: 14 };  
const statLabel = { fontSize: 12, color: "#8a7a63", marginBottom: 4 };  
const statValue = { fontSize: 22, fontWeight: 800 };  

const AVATAR_COLORS = ["#C1272D", "#2E7D32", "#E8A33D", "#1565C0", "#6A1B9A", "#00838F"];  
function avatarColor(name) {  
  let hash = 0;  
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);  
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];  
}  
function initials(name) {  
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();  
}  

function statusStyle(kitchenStatus, hasItems) {  
  if (!hasItems)  
    return { grad: "linear-gradient(135deg, #26A65B, #158A4A)", text: "#fff", label: "Libre", icon: "🟢", glow: "rgba(38,166,91,0.4)" };  
  if (!kitchenStatus)  
    return { grad: "linear-gradient(135deg, #FFC107, #FF8F00)", text: "#2B2118", label: "Armando orden", icon: "📝", glow: "rgba(255,143,0,0.4)" };  
  if (kitchenStatus === "pendiente")  
    return { grad: "linear-gradient(135deg, #FF5722, #D84315)", text: "#fff", label: "En cocina", icon: "🆕", glow: "rgba(216,67,21,0.45)" };  
  if (kitchenStatus === "preparando")  
    return { grad: "linear-gradient(135deg, #E53935, #B71C1C)", text: "#fff", label: "Preparando", icon: "🔥", glow: "rgba(183,28,28,0.5)" };  
  if (kitchenStatus === "listo")  
    return { grad: "linear-gradient(135deg, #00E676, #00A152)", text: "#fff", label: "¡Listo!", icon: "✅", glow: "rgba(0,161,82,0.55)" };  
  return { grad: "linear-gradient(135deg, #26A65B, #158A4A)", text: "#fff", label: "Libre", icon: "🟢", glow: "rgba(38,166,91,0.4)" };  
}  

// ════════════════════════════════════════════════════════════════════  
//                        COMPONENTE PRINCIPAL  
// ════════════════════════════════════════════════════════════════════  
export default function App() {  
  const [state, setState] = useState(initialState());  
  const [loaded, setLoaded] = useState(false);  
  const [view, setView] = useState(() => {  
    const p = new URLSearchParams(window.location.search).get("pantalla");  
    return p === "cocina" || p === "menutv" ? p : "mesas";  
  });  
  const [activeTable, setActiveTable] = useState(null);  
  const [activeDelivery, setActiveDelivery] = useState(null);  
  const [showNewDelivery, setShowNewDelivery] = useState(false);  
  const [cajaUnlocked, setCajaUnlocked] = useState(false);  
  const [receiptFor, setReceiptFor] = useState(null);  
  const [connStatus, setConnStatus] = useState("Conectando…");  
  const [connError, setConnError] = useState(null);  
  const [lastSync, setLastSync] = useState(null);  
  const [readyToast, setReadyToast] = useState(null);  
  const [audioReady, setAudioReady] = useState(false);  
  const skipNextPoll = useRef(false);  
  const initRef = useRef(false);  
  const audioCtxRef = useRef(null);  
  const prevStatusRef = useRef(null);  
  const toastTimerRef = useRef(null);  

  // ─── Activar audio al primer click ─────────────────────────────  
  useEffect(() => {  
    function unlock() {  
      let ctx = audioCtxRef.current;  
      if (!ctx) {  
        try {  
          ctx = new (window.AudioContext || window.webkitAudioContext)();  
          audioCtxRef.current = ctx;  
        } catch (e) { return; }  
      }  
      if (ctx.state === "suspended") ctx.resume();  
      try {  
        const osc = ctx.createOscillator();  
        const gain = ctx.createGain();  
        osc.connect(gain);  
        gain.connect(ctx.destination);  
        gain.gain.value = 0.0001;  
        osc.frequency.value = 440;  
        osc.start();  
        osc.stop(ctx.currentTime + 0.05);  
        setAudioReady(true);  
      } catch (e) {}  
    }  
    window.addEventListener("click", unlock);  
    window.addEventListener("touchstart", unlock);  
    return () => {  
      window.removeEventListener("click", unlock);  
      window.removeEventListener("touchstart", unlock);  
    };  
  }, []);  

  // ─── Sonidos ────────────────────────────────────────────────────  
  function playReadyBeep() {  
    const ctx = audioCtxRef.current;  
    if (!ctx) return;  
    if (ctx.state === "suspended") ctx.resume();  
    const now = ctx.currentTime;  
    [0, 0.28].forEach((offset) => {  
      const osc = ctx.createOscillator();  
      const gain = ctx.createGain();  
      osc.connect(gain);  
      gain.connect(ctx.destination);  
      osc.type = "sine";  
      osc.frequency.value = 1046.5;  
      gain.gain.setValueAtTime(0.0001, now + offset);  
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);  
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.24);  
      osc.start(now + offset);  
      osc.stop(now + offset + 0.26);  
    });  
  }  

  function playNewOrderBeep() {  
    const ctx = audioCtxRef.current;  
    if (!ctx) return;  
    if (ctx.state === "suspended") ctx.resume();  
    const now = ctx.currentTime;  
    [0, 0.15, 0.3].forEach((offset) => {  
      const osc = ctx.createOscillator();  
      const gain = ctx.createGain();  
      osc.connect(gain);  
      gain.connect(ctx.destination);  
      osc.type = "square";  
      osc.frequency.value = 660;  
      gain.gain.setValueAtTime(0.0001, now + offset);  
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.01);  
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);  
      osc.start(now + offset);  
      osc.stop(now + offset + 0.15);  
    });  
  }  

  // ─── Persistencia en Supabase ───────────────────────────────────  
  const persist = useCallback(async (next) => {  
    setState(next);  
    skipNextPoll.current = true;  
    const { error } = await supabase.from("pos_state").upsert({  
      id: RECORD_ID,  
      value: JSON.stringify(next),  
      updated_at: new Date().toISOString(),  
    });  
    if (error) {  
      setConnStatus("Error al guardar");  
      setConnError(error.message || JSON.stringify(error));  
    } else {  
      setConnStatus("Conectado");  
      setConnError(null);  
      setLastSync(new Date());  
    }  
  }, []);  

  // ─── Carga inicial + polling ────────────────────────────────────  
  useEffect(() => {  
    let alive = true;  
    async function load() {  
      const { data, error } = await supabase  
        .from("pos_state")  
        .select("value")  
        .eq("id", RECORD_ID)  
        .maybeSingle();  
      if (error) {  
        setConnStatus("Error al cargar");  
        setConnError(error.message || JSON.stringify(error));  
      } else if (data && alive) {  
        setState(JSON.parse(data.value));  
        setConnStatus("Conectado");  
        setConnError(null);  
        setLastSync(new Date());  
      } else {  
        setConnStatus("Conectado (sin datos aún)");  
      }  
      if (alive) setLoaded(true);  
    }  
    load();  
    const iv = setInterval(async () => {  
      if (skipNextPoll.current) {  
        skipNextPoll.current = false;  
        return;  
      }  
      const { data, error } = await supabase  
        .from("pos_state")  
        .select("value")  
        .eq("id", RECORD_ID)  
        .maybeSingle();  
      if (error) {  
        setConnStatus("Error al sincronizar");  
        setConnError(error.message || JSON.stringify(error));  
      } else if (data && alive) {  
        setState(JSON.parse(data.value));  
        setConnStatus("Conectado");  
        setConnError(null);  
        setLastSync(new Date());  
      }  
    }, POLL_MS);  
    return () => {  
      alive = false;  
      clearInterval(iv);  
    };  
  }, []);  

  // ─── Inicializar registro en Supabase ──────────────────────────  
  useEffect(() => {  
    if (loaded && !initRef.current) {  
      initRef.current = true;  
      supabase  
        .from("pos_state")  
        .select("id")  
        .eq("id", RECORD_ID)  
        .maybeSingle()  
        .then(({ data, error }) => {  
          if (error) {  
            setConnStatus("Error al inicializar");  
            setConnError(error.message || JSON.stringify(error));  
            return;  
          }  
          if (!data) {  
            supabase  
              .from("pos_state")  
              .insert({ id: RECORD_ID, value: JSON.stringify(state) })  
              .then(({ error: insErr }) => {  
                if (insErr) {  
                  setConnStatus("Error al crear registro inicial");  
                  setConnError(insErr.message || JSON.stringify(insErr));  
                } else setConnStatus("Conectado");  
              });  
          }  
        });  
    }  
  }, [loaded]);  

  const {  
    tables, deliveries, sales = [], expenses = [],  
    employees = [], clockRecords = [], promotions = [],  
    salesLog = [], expensesLog = [], payments = [],  
    cashSessions = [], pin,  
  } = state;  

  // ─── Detectar cambios de estado (notificaciones) ──────────────  
  useEffect(() => {  
    const current = {};  
    tables.forEach((t) => {  
      if (t.items.length)  
        current["table" + t.id] = { status: t.kitchenStatus, label: `Mesa ${t.id}` };  
    });  
    deliveries.forEach((d) => {  
      if (d.items.length)  
        current["delivery" + d.id] = { status: d.kitchenStatus, label: d.customer };  
    });  
    if (prevStatusRef.current) {  
      let readyFound = null;  
      let newOrderFound = null;  
      for (const key in current) {  
        const prev = prevStatusRef.current[key];  
        if (current[key].status === "listo" && (!prev || prev.status !== "listo"))  
          readyFound = current[key].label;  
        if (current[key].status === "pendiente" && (!prev || prev.status !== "pendiente"))  
          newOrderFound = current[key].label;  
      }  
      if (newOrderFound) {  
        playNewOrderBeep();  
        setReadyToast(`🆕 Nuevo pedido: ${newOrderFound}`);  
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);  
        toastTimerRef.current = setTimeout(() => setReadyToast(null), 6000);  
      } else if (readyFound) {  
        playReadyBeep();  
        setReadyToast(`✅ ${readyFound} está listo`);  
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);  
        toastTimerRef.current = setTimeout(() => setReadyToast(null), 6000);  
      }  
    }  
    prevStatusRef.current = current;  
  }, [tables, deliveries]);  

  // ─── Funciones auxiliares de estado ──────────────────────────────  
  function withTables(fn) {  
    persist({ ...state, tables: fn(tables) });  
  }  
  function withDeliveries(fn) {  
    persist({ ...state, deliveries: fn(deliveries) });  
  }  

  function addItemToOrder(kind, id, menuItem) {  
    const addFn = (items) => {  
      const existing = items.find((it) => it.menuId === menuItem.id);  
      if (existing)  
        return items.map((it) =>  
          it.menuId === menuItem.id ? { ...it, qty: it.qty + 1 } : it  
        );  
      return [  
        ...items,  
        { menuId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1, notes: "" },  
      ];  
    };  
    if (kind === "table") {  
      withTables((ts) =>  
        ts.map((t) =>  
          t.id === id ? { ...t, items: addFn(t.items), status: "ocupada" } : t  
        )  
      );  
    } else {  
      withDeliveries((ds) =>  
        ds.map((d) => (d.id === id ? { ...d, items: addFn(d.items) } : d))  
      );  
    }  
  }  

  function changeQty(kind, id, menuId, delta) {  
    const changeFn = (items) =>  
      items  
        .map((it) => (it.menuId === menuId ? { ...it, qty: it.qty + delta } : it))  
        .filter((it) => it.qty > 0);  
    if (kind === "table")  
      withTables((ts) =>  
        ts.map((t) => (t.id === id ? { ...t, items: changeFn(t.items) } : t))  
      );  
    else  
      withDeliveries((ds) =>  
        ds.map((d) => (d.id === id ? { ...d, items: changeFn(d.items) } : d))  
      );  
  }  

  function setNote(kind, id, menuId, note) {  
    const noteFn = (items) =>  
      items.map((it) =>  
        it.menuId === menuId ? { ...it, notes: note } : it  
      );  
    if (kind === "table")  
      withTables((ts) =>  
        ts.map((t) => (t.id === id ? { ...t, items: noteFn(t.items) } : t))  
      );  
    else  
      withDeliveries((ds) =>  
        ds.map((d) => (d.id === id ? { ...d, items: noteFn(d.items) } : d))  
      );  
  }  

  function sendToKitchen(kind, id) {  
    const stamp = (x) => ({  
      ...x,  
      kitchenStatus: "pendiente",  
      kitchenSentAt: x.kitchenSentAt || new Date().toISOString(),  
    });  
    if (kind === "table")  
      withTables((ts) => ts.map((t) => (t.id === id ? stamp(t) : t)));  
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? stamp(d) : d)));  
  }  

  function advanceKitchen(kind, id, next) {  
    const stamp = (x) => ({  
      ...x,  
      kitchenStatus: next,  
      kitchenSentAt: new Date().toISOString(),  
    });  
    if (kind === "table")  
      withTables((ts) => ts.map((t) => (t.id === id ? stamp(t) : t)));  
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? stamp(d) : d)));  
  }  

  function closeTicket(kind, id, method, discount) {  
    const disc = discount && discount.value > 0 ? discount : null;  
    function computeTotal(items) {  
      const sub = orderTotal(items);  
      if (!disc) return { subtotal: sub, discountAmount: 0, total: sub };  
      const discountAmount =  
        disc.type === "percent"  
          ? Math.round(sub * (disc.value / 100))  
          : Math.min(disc.value, sub);  
      return { subtotal: sub, discountAmount, total: Math.max(0, sub - discountAmount) };  
    }  

    if (kind === "table") {  
      const t = tables.find((t) => t.id === id);  
      if (!t.items.length) return;  
      const { subtotal, discountAmount, total } = computeTotal(t.items);  
      const sale = {  
        id: Date.now(),  
        kind: "mesa",  
        ref: `Mesa ${t.id}`,  
        items: t.items,  
        subtotal,  
        discountAmount,  
        discountLabel: disc  
          ? disc.type === "percent"  
            ? `${disc.value}%`  
            : money(disc.value)  
          : null,  
        total,  
        method,  
        time: new Date().toISOString(),  
      };  
      const next = {  
        ...state,  
        sales: [...sales, sale],  
        salesLog: [...salesLog, sale],  
        tables: tables.map((x) =>  
          x.id === id  
            ? { ...x, status: "libre", kitchenStatus: null, items: [], kitchenSentAt: null }  
            : x  
        ),  
      };  
      persist(next);  
      setActiveTable(null);  
      setReceiptFor(sale);  
    } else {  
      const d = deliveries.find((d) => d.id === id);  
      if (!d.items.length) return;  
      const { subtotal, discountAmount, total } = computeTotal(d.items);  
      const sale = {  
        id: Date.now(),  
        kind: "delivery",  
        ref: d.customer,  
        phone: d.phone,  
        items: d.items,  
        subtotal,  
        discountAmount,  
        discountLabel: disc  
          ? disc.type === "percent"  
            ? `${disc.value}%`  
            : money(disc.value)  
          : null,  
        total,  
        method,  
        time: new Date().toISOString(),  
      };  
      const next = {  
        ...state,  
        sales: [...sales, sale],  
        salesLog: [...salesLog, sale],  
        deliveries: deliveries.map((x) =>  
          x.id === id ? { ...x, kitchenStatus: "entregado" } : x  
        ),  
      };  
      persist(next);  
      setActiveDelivery(null);  
      setReceiptFor(sale);  
    }  
  }  

  function addExpense(exp) {  
    const record = { id: Date.now(), ...exp, time: new Date().toISOString() };  
    persist({  
      ...state,  
      expenses: [...expenses, record],  
      expensesLog: [...expensesLog, record],  
    });  
  }  

  function addEmployee(name, dailyWage) {  
    if (!name.trim()) return;  
    persist({  
      ...state,  
      employees: [  
        ...employees,  
        { id: Date.now(), name: name.trim(), dailyWage: Number(dailyWage) || 0 },  
      ],  
    });  
  }  

  function clockIn(employeeName) {  
    const now = new Date();  
    const [sh, sm] = SHIFT_START.split(":").map(Number);  
    const shiftMinutes = sh * 60 + sm;  
    const nowMinutes = now.getHours() * 60 + now.getMinutes();  
    const late = nowMinutes > shiftMinutes + LATE_GRACE_MIN;  
    const minsLate = late ? nowMinutes - shiftMinutes : 0;  
    persist({  
      ...state,  
      clockRecords: [  
        ...clockRecords,  
        { id: Date.now(), employee: employeeName, time: now.toISOString(), late, minsLate },  
      ],  
    });  
  }  

  function addPromotion(promo) {  
    persist({ ...state, promotions: [...promotions, { id: Date.now(), ...promo }] });  
  }  

  function addPayment(employeeName, amount, note) {  
    persist({  
      ...state,  
      payments: [  
        ...payments,  
        { id: Date.now(), employeeName, amount: Number(amount), note: note || "", time: new Date().toISOString() },  
      ],  
    });  
  }  

  function deletePayment(id) {  
    persist({ ...state, payments: payments.filter((p) => p.id !== id) });  
  }  

  function openCashSession(openedBy, openingAmount) {  
    persist({  
      ...state,  
      cashSessions: [  
        ...cashSessions,  
        {  
          id: Date.now(),  
          openedBy,  
          openingAmount: Number(openingAmount) || 0,  
          openedAt: new Date().toISOString(),  
          closedAt: null,  
        },  
      ],  
    });  
  }  

  function closeCashSession(sessionId, countedCash, expectedCash, notes) {  
    persist({  
      ...state,  
      cashSessions: cashSessions.map((s) =>  
        s.id === sessionId  
          ? {  
              ...s,  
              closedAt: new Date().toISOString(),  
              countedCash: Number(countedCash),  
              expectedCash,  
              difference: Number(countedCash) - expectedCash,  
              notes: notes || "",  
            }  
          : s  
      ),  
    });  
  }  

  function deletePromotion(id) {  
    persist({ ...state, promotions: promotions.filter((p) => p.id !== id) });  
  }  

  function deleteSale(id) {  
    persist({ ...state, sales: sales.filter((s) => s.id !== id) });  
  }  

  function deleteExpense(id) {  
    persist({ ...state, expenses: expenses.filter((e) => e.id !== id) });  
  }  

  function clearDay(dayStr) {  
    persist({  
      ...state,  
      sales: sales.filter((s) => new Date(s.time).toDateString() !== dayStr),  
      expenses: expenses.filter((e) => new Date(e.time).toDateString() !== dayStr),  
    });  
  }  

  function clearMonth(monthKey) {  
    persist({  
      ...state,  
      sales: sales.filter((s) => s.time.slice(0, 7) !== monthKey),  
      expenses: expenses.filter((e) => e.time.slice(0, 7) !== monthKey),  
    });  
  }  

  // ─── Navegación ──────────────────────────────────────────────────  
  const nav = [  
    { id: "mesas", label: "Mesas", icon: UtensilsCrossed },  
    { id: "cocina", label: "Cocina", icon: ChefHat },  
    { id: "caja", label: "Caja", icon: Receipt },  
    { id: "delivery", label: "Delivery", icon: Bike },  
    { id: "promos", label: "Promos", icon: Tag },  
    { id: "clientes", label: "Clientes", icon: Users },  
    { id: "empleados", label: "Empleados", icon: UserCheck },  
    { id: "reportes", label: "Reportes", icon: BarChart3 },  
    { id: "historial", label: "Historial", icon: Archive },  
    { id: "menutv", label: "Menú TV", icon: Tv },  
  ];  

  const kiosk = !!new URLSearchParams(window.location.search).get("pantalla");  

  if (!loaded) {  
    return (  
      <div style={{ padding: 40, textAlign: "center", color: "#8a7a63" }}>  
        Cargando…  
      </div>  
    );  
  }  

  return (  
    <div  
      style={{  
        fontFamily: "'Segoe UI', Arial, sans-serif",  
        background: "#FFF8ED",  
        minHeight: "100vh",  
        color: "#2B2118",  
      }}  
    >  
      {/* ─── Toast de notificaciones ───────────────────────────── */}  
      {readyToast && (  
        <div  
          onClick={() => setReadyToast(null)}  
          style={{  
            position: "fixed",  
            top: 14,  
            left: "50%",  
            transform: "translateX(-50%)",  
            zIndex: 100,  
            background: "linear-gradient(135deg, #00E676, #00A152)",  
            color: "#fff",  
            fontWeight: 800,  
            fontSize: 14,  
            padding: "12px 22px",  
            borderRadius: 30,  
            boxShadow: "0 6px 20px rgba(0,161,82,0.5)",  
            cursor: "pointer",  
          }}  
        >  
          🔔 {readyToast}  
        </div>  
      )}  

      {/* ─── Botón de sonido flotante ──────────────────────────── */}  
      <button  
        onClick={() => {  
          if (!audioCtxRef.current) {  
            try {  
              audioCtxRef.current = new (window.AudioContext ||  
                window.webkitAudioContext)();  
              setAudioReady(true);  
            } catch (e) {}  
          } else if (audioCtxRef.current.state === "suspended") {  
            audioCtxRef.current.resume();  
          }  
          playReadyBeep();  
        }}  
        title="Tocar para activar/probar el sonido"  
        style={{  
          position: "fixed",  
          bottom: 16,  
          right: 16,  
          zIndex: 100,  
          width: 52,  
          height: 52,  
          borderRadius: "50%",  
          border: "none",  
          cursor: "pointer",  
          fontSize: 22,  
          display: "flex",  
          alignItems: "center",  
          justifyContent: "center",  
          background: audioReady ? "#2E7D32" : "#C1272D",  
          color: "#fff",  
          boxShadow: "0 4px 14px rgba(0,0,0,0.
