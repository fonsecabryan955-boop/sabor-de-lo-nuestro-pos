import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Minus, X, Send, CheckCircle2, Clock, ChefHat, UtensilsCrossed, Receipt, Bike, BarChart3, Lock, Printer, UserCheck, Wallet, Tag, Tv, Percent, Users, Archive, ClipboardList } from "lucide-react";

const supabaseUrl = "https://tgzxcmorfgpblfsgwcgv.supabase.co";
const supabaseKey = "sb_publishable_BDJcoHqoybh94C8tm0AoLg_rsQuZ51P";
const supabase = createClient(supabaseUrl, supabaseKey);
const RECORD_ID = "main"; // ✅ Versión verificada y consolidada — sin errores de sintaxis

const RESTAURANT_NAME = "El Sabor de lo Nuestro Masatepe";
const SHIFT_START = "17:00";
const SHIFT_END = "21:00";
const LATE_GRACE_MIN = 10;
const DEFAULT_PIN = "1234";
const POLL_MS = 4000;
const PAYDAY_DAYS = [15, 30]; // días del mes en que aparece el aviso de pago (quincenal)

// Semilla inicial del menú — a partir de aquí el menú se administra desde la app (botón "Gestionar menú" en Mesas)
const DEFAULT_MENU = [
  { id: "b1", name: "Hamburguesa Clásica", price: 190, cat: "Hamburguesas", active: true },
  { id: "b2", name: "Kryspi Burguer", price: 200, cat: "Hamburguesas", active: true },
  { id: "b3", name: "Big Campeona", price: 250, cat: "Hamburguesas", active: true },
  { id: "f1", name: "Pingüi Frapp", price: 120, cat: "Frappés", active: true },
  { id: "f2", name: "Fresa Frapp", price: 120, cat: "Frappés", active: true },
  { id: "f3", name: "Oreo Frapp", price: 120, cat: "Frappés", active: true },
  { id: "f4", name: "Chocolate Frapp", price: 120, cat: "Frappés", active: true },
  { id: "c1", name: "Dedos de Pollo (6u)", price: 200, cat: "Chicken Mood", active: true },
  { id: "c2", name: "Alitas x6", price: 230, cat: "Chicken Mood", active: true },
  { id: "c3", name: "Alitas x12", price: 450, cat: "Chicken Mood", active: true },
  { id: "c4", name: "Alitas Fritas", price: 220, price12: 430, cat: "Chicken Mood", active: true },
  { id: "a1", name: "Hotdog", price: 60, cat: "Antojitos", active: true },
  { id: "a2", name: "Tacos al Pastor", price: 195, cat: "Antojitos", active: true },
  { id: "p1", name: "Panini de Pollo", price: 235, cat: "Paninis", active: true },
  { id: "p2", name: "Panini de Jamón", price: 190, cat: "Paninis", active: true },
  { id: "e1", name: "Papas Francesas", price: 50, cat: "Extras", active: true },
  { id: "e2", name: "Papas Cheddar", price: 100, cat: "Extras", active: true },
  { id: "e3", name: "Salchipapas", price: 160, cat: "Extras", active: true },
  { id: "s1", name: "Salsa BBQ", price: 30, cat: "Salsas", active: true },
  { id: "s2", name: "Salsa Buffalo", price: 30, cat: "Salsas", active: true },
  { id: "s3", name: "Salsa Ranch", price: 30, cat: "Salsas", active: true },
  { id: "s4", name: "Salsa de la Casa", price: 30, cat: "Salsas", active: true },
  { id: "d1", name: "Soda", price: 40, cat: "Bebidas", active: true },
  { id: "d2", name: "Té de Limón", price: 30, cat: "Bebidas", active: true },
  { id: "d3", name: "Jugo de Naranja", price: 40, cat: "Bebidas", active: true },
  { id: "d4", name: "Hi-C", price: 30, cat: "Bebidas", active: true },
];

const DEFAULT_CATS = [
  { name: "Hamburguesas", icon: "🍔" },
  { name: "Frappés", icon: "🥤" },
  { name: "Chicken Mood", icon: "🍗" },
  { name: "Antojitos", icon: "🌮" },
  { name: "Paninis", icon: "🥪" },
  { name: "Extras", icon: "🍟" },
  { name: "Salsas", icon: "🥫" },
  { name: "Bebidas", icon: "🧃" },
];

const INVENTORY_UNITS = ["unidad", "lb", "kg", "g", "litro", "ml", "paquete"];
const WING_SAUCES = [
  { id: "bbq", label: "BBQ" },
  { id: "buffalo", label: "Buffalo" },
  { id: "ranch", label: "Ranch" },
  { id: "casa", label: "Salsa de la Casa" },
];

function money(n) {
  return "C$" + (n || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function orderTotal(items) {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}
function emptyTables() {
  return Array.from({ length: 5 }, (_, i) => ({ id: i + 1, status: "libre", kitchenStatus: null, items: [] }));
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
    salesGoal: 0,
    pin: DEFAULT_PIN,
    menuItems: DEFAULT_MENU,
    menuCats: DEFAULT_CATS,
    inventory: [],
    inventoryLog: [],
  };
}
function todayStr() {
  return new Date().toDateString();
}

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
  const [menuManagerOpen, setMenuManagerOpen] = useState(false);
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

  useEffect(() => {
    function unlock() {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; } catch (e) { return; }
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

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from("pos_state").select("value").eq("id", RECORD_ID).maybeSingle();
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
      const { data, error } = await supabase.from("pos_state").select("value").eq("id", RECORD_ID).maybeSingle();
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
            supabase.from("pos_state").insert({ id: RECORD_ID, value: JSON.stringify(state) }).then(({ error: insErr }) => {
              if (insErr) {
                setConnStatus("Error al crear registro inicial");
                setConnError(insErr.message || JSON.stringify(insErr));
              } else {
                setConnStatus("Conectado");
              }
            });
          }
        });
    }
  }, [loaded]);

  const tables = Array.isArray(state.tables) ? state.tables : emptyTables();
  const deliveries = Array.isArray(state.deliveries) ? state.deliveries : [];
  const sales = Array.isArray(state.sales) ? state.sales : [];
  const expenses = Array.isArray(state.expenses) ? state.expenses : [];
  const employees = Array.isArray(state.employees) ? state.employees : [];
  const clockRecords = Array.isArray(state.clockRecords) ? state.clockRecords : [];
  const promotions = Array.isArray(state.promotions) ? state.promotions : [];
  const salesLog = Array.isArray(state.salesLog) ? state.salesLog : [];
  const expensesLog = Array.isArray(state.expensesLog) ? state.expensesLog : [];
  const payments = Array.isArray(state.payments) ? state.payments : [];
  const cashSessions = Array.isArray(state.cashSessions) ? state.cashSessions : [];
  const salesGoal = state.salesGoal || 0;
  const pin = state.pin || DEFAULT_PIN;
  const menuItems = Array.isArray(state.menuItems) && state.menuItems.length ? state.menuItems : DEFAULT_MENU;
  const menuCats = Array.isArray(state.menuCats) && state.menuCats.length ? state.menuCats : DEFAULT_CATS;
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const inventoryLog = Array.isArray(state.inventoryLog) ? state.inventoryLog : [];

  useEffect(() => {
    const current = {};
    tables.forEach((t) => { if (t.items.length) current["table" + t.id] = { status: t.kitchenStatus, label: `Mesa ${t.id}` }; });
    deliveries.forEach((d) => { if (d.items.length) current["delivery" + d.id] = { status: d.kitchenStatus, label: d.customer }; });
    if (prevStatusRef.current) {
      let readyFound = null;
      let newOrderFound = null;
      for (const key in current) {
        const prev = prevStatusRef.current[key];
        if (current[key].status === "listo" && (!prev || prev.status !== "listo")) {
          readyFound = current[key].label;
        }
        if (current[key].status === "pendiente" && (!prev || prev.status !== "pendiente")) {
          newOrderFound = current[key].label;
        }
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

  function withTables(fn) {
    persist({ ...state, tables: fn(tables) });
  }
  function withDeliveries(fn) {
    persist({ ...state, deliveries: fn(deliveries) });
  }

  function addItemToOrder(kind, id, menuItem) {
    const addFn = (items) => {
      const existing = items.find((it) => it.menuId === menuItem.id);
      if (existing) return items.map((it) => (it.menuId === menuItem.id ? { ...it, qty: it.qty + 1 } : it));
      return [...items, { menuId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1, notes: "" }];
    };
    if (kind === "table") {
      withTables((ts) => ts.map((t) => (t.id === id ? { ...t, items: addFn(t.items), status: "ocupada", occupiedAt: t.occupiedAt || new Date().toISOString() } : t)));
    } else {
      withDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, items: addFn(d.items) } : d)));
    }
  }
  function changeQty(kind, id, menuId, delta) {
    const changeFn = (items) => items.map((it) => (it.menuId === menuId ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0);
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? { ...t, items: changeFn(t.items) } : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, items: changeFn(d.items) } : d)));
  }
  function setNote(kind, id, menuId, note) {
    const noteFn = (items) => items.map((it) => (it.menuId === menuId ? { ...it, notes: note } : it));
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? { ...t, items: noteFn(t.items) } : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, items: noteFn(d.items) } : d)));
  }
  function sendToKitchen(kind, id) {
    const stamp = (x) => ({ ...x, kitchenStatus: "pendiente", kitchenSentAt: x.kitchenSentAt || new Date().toISOString() });
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? stamp(t) : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? stamp(d) : d)));
  }
  function advanceKitchen(kind, id, next) {
    const stamp = (x) => ({ ...x, kitchenStatus: next, kitchenSentAt: new Date().toISOString() });
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? stamp(t) : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? stamp(d) : d)));
  }
  function closeTicket(kind, id, method, discount, tip, itemMenuIds) {
    const disc = discount && discount.value > 0 ? discount : null;
    const tipAmount = Number(tip) || 0;
    function computeTotal(items) {
      const sub = orderTotal(items);
      if (!disc) return { subtotal: sub, discountAmount: 0, total: sub };
      const discountAmount = disc.type === "percent" ? Math.round(sub * (disc.value / 100)) : Math.min(disc.value, sub);
      return { subtotal: sub, discountAmount, total: Math.max(0, sub - discountAmount) };
    }
    if (kind === "table") {
      const t = tables.find((t) => t.id === id);
      if (!t.items.length) return;
      const splitting = itemMenuIds && itemMenuIds.length > 0 && itemMenuIds.length < t.items.length;
      const chargedItems = splitting ? t.items.filter((it) => itemMenuIds.includes(it.menuId)) : t.items;
      const remainingItems = splitting ? t.items.filter((it) => !itemMenuIds.includes(it.menuId)) : [];
      if (!chargedItems.length) return;
      const { subtotal, discountAmount, total } = computeTotal(chargedItems);
      const sale = { id: Date.now(), folio: salesLog.length + 1, kind: "mesa", ref: `Mesa ${t.id}${splitting ? " (parte)" : ""}`, items: chargedItems, subtotal, discountAmount, discountLabel: disc ? (disc.type === "percent" ? `${disc.value}%` : money(disc.value)) : null, total, tip: tipAmount, method, time: new Date().toISOString() };
      const invResult = deductInventoryForSale(chargedItems);
      const next = {
        ...state,
        sales: [...sales, sale],
        salesLog: [...salesLog, sale],
        tables: tables.map((x) => (x.id === id ? (remainingItems.length ? { ...x, items: remainingItems } : { ...x, status: "libre", kitchenStatus: null, items: [], kitchenSentAt: null, occupiedAt: null }) : x)),
        ...(invResult || {}),
      };
      persist(next);
      if (!remainingItems.length) setActiveTable(null);
      setReceiptFor(sale);
    } else {
      const d = deliveries.find((d) => d.id === id);
      if (!d.items.length) return;
      const { subtotal, discountAmount, total } = computeTotal(d.items);
      const sale = { id: Date.now(), folio: salesLog.length + 1, kind: "delivery", ref: d.customer, phone: d.phone, items: d.items, subtotal, discountAmount, discountLabel: disc ? (disc.type === "percent" ? `${disc.value}%` : money(disc.value)) : null, total, tip: tipAmount, method, time: new Date().toISOString() };
      const invResult = deductInventoryForSale(d.items);
      const next = {
        ...state,
        sales: [...sales, sale],
        salesLog: [...salesLog, sale],
        deliveries: deliveries.map((x) => (x.id === id ? { ...x, kitchenStatus: "entregado" } : x)),
        ...(invResult || {}),
      };
      persist(next);
      setActiveDelivery(null);
      setReceiptFor(sale);
    }
  }
  function addExpense(exp) {
    const record = { id: Date.now(), ...exp, time: exp.time || new Date().toISOString() };
    persist({ ...state, expenses: [...expenses, record], expensesLog: [...expensesLog, record] });
  }
  function addEmployee(name, dailyWage, role, phone) {
    if (!name.trim()) return;
    persist({ ...state, employees: [...employees, { id: Date.now(), name: name.trim(), dailyWage: Number(dailyWage) || 0, role: role || "Personal", phone: phone || "", hireDate: new Date().toISOString(), active: true }] });
  }
  function toggleEmployeeActive(id) {
    persist({ ...state, employees: employees.map((e) => (e.id === id ? { ...e, active: !e.active } : e)) });
  }
  function deleteEmployee(id) {
    persist({ ...state, employees: employees.filter((e) => e.id !== id) });
  }
  function updateEmployee(id, patch) {
    persist({ ...state, employees: employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
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
  function addMenuItem(item) {
    persist({ ...state, menuItems: [...menuItems, { id: `m${Date.now()}`, active: true, ...item }] });
  }
  function updateMenuItem(id, patch) {
    persist({ ...state, menuItems: menuItems.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function deleteMenuItem(id) {
    persist({ ...state, menuItems: menuItems.filter((m) => m.id !== id) });
  }
  function addMenuCategory(name, icon) {
    const clean = (name || "").trim();
    if (!clean) return;
    if (menuCats.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return;
    persist({ ...state, menuCats: [...menuCats, { name: clean, icon: icon || "🍽️" }] });
  }
  function addInventoryItem(item) {
    persist({ ...state, inventory: [...inventory, { id: `inv${Date.now()}`, stock: 0, minStock: 0, ...item }] });
  }
  function updateInventoryItem(id, patch) {
    persist({ ...state, inventory: inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }
  function deleteInventoryItem(id) {
    persist({ ...state, inventory: inventory.filter((i) => i.id !== id) });
  }
  function adjustStock(id, qty, type, note, effectiveDate) {
    const item = inventory.find((i) => i.id === id);
    if (!item) return;
    const delta = type === "salida" ? -Math.abs(qty) : Math.abs(qty);
    const time = effectiveDate ? new Date(effectiveDate + "T12:00:00").toISOString() : new Date().toISOString();
    const logEntry = { id: Date.now(), itemId: id, itemName: item.name, type, qty: Math.abs(qty), note: note || "", time };
    persist({
      ...state,
      inventory: inventory.map((i) => (i.id === id ? { ...i, stock: Math.max(0, (i.stock || 0) + delta) } : i)),
      inventoryLog: [...inventoryLog, logEntry],
    });
  }
  function setItemRecipe(menuItemId, recipe) {
    persist({ ...state, menuItems: menuItems.map((m) => (m.id === menuItemId ? { ...m, recipe } : m)) });
  }
  function deductInventoryForSale(items) {
    let nextInventory = inventory;
    const newLogs = [];
    items.forEach((soldItem) => {
      const menuDef = menuItems.find((m) => m.id === soldItem.menuId || soldItem.menuId.startsWith(String(m.id) + "-"));
      if (!menuDef || !menuDef.recipe || !menuDef.recipe.length) return;
      menuDef.recipe.forEach((r) => {
        const invItem = nextInventory.find((i) => i.id === r.invId);
        if (!invItem) return;
        const consumed = r.qty * soldItem.qty;
        nextInventory = nextInventory.map((i) => (i.id === r.invId ? { ...i, stock: Math.max(0, (i.stock || 0) - consumed) } : i));
        newLogs.push({ id: Date.now() + Math.random(), itemId: r.invId, itemName: invItem.name, type: "venta", qty: consumed, note: `Venta: ${soldItem.name}`, time: new Date().toISOString() });
      });
    });
    if (newLogs.length) {
      return { inventory: nextInventory, inventoryLog: [...inventoryLog, ...newLogs] };
    }
    return null;
  }
  function addPromotion(promo) {
    persist({ ...state, promotions: [...promotions, { id: Date.now(), ...promo }] });
  }
  function deletePromotion(id) {
    persist({ ...state, promotions: promotions.filter((p) => p.id !== id) });
  }
  function addPayment(employeeName, amount, note, extra) {
    persist({ ...state, payments: [...payments, { id: Date.now(), employeeName, amount: Number(amount), note: note || "", time: new Date().toISOString(), ...(extra || {}) }] });
  }
  function deletePayment(id) {
    persist({ ...state, payments: payments.filter((p) => p.id !== id) });
  }
  function openCashSession(openedBy, openingAmount) {
    persist({ ...state, cashSessions: [...cashSessions, { id: Date.now(), openedBy, openingAmount: Number(openingAmount) || 0, openedAt: new Date().toISOString(), closedAt: null }] });
  }
  function closeCashSession(sessionId, countedCash, expectedCash, notes) {
    persist({
      ...state,
      cashSessions: cashSessions.map((s) => (s.id === sessionId ? { ...s, closedAt: new Date().toISOString(), countedCash: Number(countedCash), expectedCash, difference: Number(countedCash) - expectedCash, notes: notes || "" } : s)),
    });
  }
  function setSalesGoal(amount) {
    persist({ ...state, salesGoal: Number(amount) || 0 });
  }
  function deleteSale(id) {
    persist({ ...state, sales: sales.filter((s) => s.id !== id) });
  }
  function deleteSalesLogEntry(id) {
    persist({ ...state, salesLog: salesLog.filter((s) => s.id !== id) });
  }
  function deleteExpensesLogEntry(id) {
    persist({ ...state, expensesLog: expensesLog.filter((e) => e.id !== id) });
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

  const nav = [
    { id: "mesas", label: "Mesas", icon: UtensilsCrossed },
    { id: "cocina", label: "Cocina", icon: ChefHat },
    { id: "caja", label: "Caja", icon: Receipt },
    { id: "delivery", label: "Delivery", icon: Bike },
    { id: "promos", label: "Promos", icon: Tag },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "empleados", label: "Empleados", icon: UserCheck },
    { id: "inventario", label: "Inventario", icon: ClipboardList },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "historial", label: "Historial", icon: Archive },
    { id: "menutv", label: "Menú TV", icon: Tv },
  ];

  const kiosk = !!new URLSearchParams(window.location.search).get("pantalla");

  if (!loaded) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a7a63" }}>Cargando…</div>;
  }

  return (
    <div style={{
      fontFamily: "Arial, sans-serif", background: "#FFF8ED", color: "#2B2118",
      ...(view === "menutv" ? { position: "fixed", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" } : { minHeight: "100vh" }),
    }}>
      {readyToast && (
        <div
          onClick={() => setReadyToast(null)}
          style={{
            position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 100,
            background: "linear-gradient(135deg, #00E676, #00A152)", color: "#fff", fontWeight: 800, fontSize: 14,
            padding: "12px 22px", borderRadius: 30, boxShadow: "0 6px 20px rgba(0,161,82,0.5)", cursor: "pointer",
          }}
        >
          🔔 {readyToast}
        </div>
      )}
      <button
        onClick={() => {
          if (!audioCtxRef.current) {
            try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); setAudioReady(true); } catch (e) {}
          } else if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume();
          }
          playReadyBeep();
        }}
        title="Tocar para activar/probar el sonido"
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 100, width: 52, height: 52, borderRadius: "50%",
          border: "none", cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
          background: audioReady ? "#2E7D32" : "#C1272D", color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        }}
      >
        {audioReady ? "🔊" : "🔇"}
      </button>
      {!kiosk && view !== "menutv" && (
        <>
          <div style={{
            background: connError ? "#C1272D" : "#2E7D32", color: "#fff", fontSize: 12, fontWeight: 700,
            padding: "6px 14px", textAlign: "center", flexShrink: 0,
          }}>
            {connError ? `⚠️ ${connStatus}: ${connError}` : `✅ ${connStatus}${lastSync ? " · última sync " + lastSync.toLocaleTimeString("es-NI") : ""}`}
          </div>
          <div style={{ background: "#2B2118", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
            <h1 style={{ color: "#FFF8ED", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.5 }}>
              🍔🍗 {RESTAURANT_NAME}
            </h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {nav.map((n) => {
                const Icon = n.icon;
                const active = view === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setView(n.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none",
                      cursor: "pointer", fontWeight: 700, fontSize: 13,
                      background: active ? "#E8A33D" : "#3d2f22", color: active ? "#2B2118" : "#F2C879",
                    }}
                  >
                    <Icon size={16} /> {n.label}
                  </button>
                );
              })}
              <button
                onClick={() => { playReadyBeep(); }}
                title="Probar sonido"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: audioReady ? "#2E7D32" : "#8a7a63", color: "#fff",
                }}
              >
                {audioReady ? "🔊" : "🔇"} Probar sonido
              </button>
            </div>
          </div>
        </>
      )}

      <div style={view === "menutv" ? { padding: 0, flex: 1, minHeight: 0, width: "100%", boxSizing: "border-box", overflow: "hidden" } : { padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        {view === "mesas" && <MesasView tables={tables} onOpen={(id) => setActiveTable(id)} onManageMenu={() => setMenuManagerOpen(true)} />}

        {view === "cocina" && <CocinaView tables={tables} deliveries={deliveries} onAdvance={advanceKitchen} kiosk={kiosk} />}

        {view === "caja" &&
          (cajaUnlocked ? (
            <CajaView tables={tables} deliveries={deliveries} sales={sales} expenses={expenses} employees={employees} cashSessions={cashSessions} onOpenSession={openCashSession} onCloseSession={closeCashSession} onCharge={closeTicket} pin={pin} onChangePin={(p) => persist({ ...state, pin: p })} salesGoal={salesGoal} onSetGoal={setSalesGoal} />
          ) : (
            <PinGate pin={pin} onUnlock={() => setCajaUnlocked(true)} />
          ))}

        {view === "delivery" && (
          <DeliveryView deliveries={deliveries} onNew={() => setShowNewDelivery(true)} onOpen={(id) => setActiveDelivery(id)} />
        )}

        {view === "promos" && <PromoView promotions={promotions} onAdd={addPromotion} onDelete={deletePromotion} />}

        {view === "clientes" && <ClientesView salesLog={salesLog} />}

        {view === "empleados" && (
          <EmpleadosView employees={employees} clockRecords={clockRecords} payments={payments} onAdd={addEmployee} onClockIn={clockIn} onAddPayment={addPayment} onDeletePayment={deletePayment} onToggleActive={toggleEmployeeActive} onDeleteEmployee={deleteEmployee} onUpdateEmployee={updateEmployee} />
        )}

        {view === "inventario" && (
          <InventoryView
            inventory={inventory}
            inventoryLog={inventoryLog}
            menuItems={menuItems}
            onAdd={addInventoryItem}
            onUpdate={updateInventoryItem}
            onDelete={deleteInventoryItem}
            onAdjust={adjustStock}
            onSetRecipe={setItemRecipe}
          />
        )}

        {view === "reportes" && <ReportesView sales={sales} expenses={expenses} payments={payments} salesLog={salesLog} expensesLog={expensesLog} onAddExpense={addExpense} onDeleteSale={deleteSale} onDeleteExpense={deleteExpense} onClearDay={clearDay} onClearMonth={clearMonth} clockRecords={clockRecords} />}

        {view === "historial" && <HistorialView salesLog={salesLog} expensesLog={expensesLog} payments={payments} onDeleteSale={deleteSalesLogEntry} onDeleteExpense={deleteExpensesLogEntry} />}

        {view === "menutv" && <MenuBoardView promotions={promotions} menuItems={menuItems} menuCats={menuCats} kiosk={kiosk} />}
      </div>

      {activeTable && (
        <OrderModal
          title={`Mesa ${activeTable}`}
          items={tables.find((t) => t.id === activeTable).items}
          kitchenStatus={tables.find((t) => t.id === activeTable).kitchenStatus}
          promotions={promotions}
          menuItems={menuItems}
          menuCats={menuCats}
          onAdd={(item) => addItemToOrder("table", activeTable, item)}
          onQty={(menuId, d) => changeQty("table", activeTable, menuId, d)}
          onNote={(menuId, note) => setNote("table", activeTable, menuId, note)}
          onSend={() => sendToKitchen("table", activeTable)}
          onClose={() => setActiveTable(null)}
        />
      )}

      {activeDelivery && (
        <OrderModal
          title={`Delivery — ${deliveries.find((d) => d.id === activeDelivery).customer}`}
          items={deliveries.find((d) => d.id === activeDelivery).items}
          kitchenStatus={deliveries.find((d) => d.id === activeDelivery).kitchenStatus}
          promotions={promotions}
          menuItems={menuItems}
          menuCats={menuCats}
          onAdd={(item) => addItemToOrder("delivery", activeDelivery, item)}
          onQty={(menuId, d) => changeQty("delivery", activeDelivery, menuId, d)}
          onNote={(menuId, note) => setNote("delivery", activeDelivery, menuId, note)}
          onSend={() => sendToKitchen("delivery", activeDelivery)}
          onClose={() => setActiveDelivery(null)}
        />
      )}

      {showNewDelivery && (
        <NewDeliveryModal
          pickupCount={deliveries.filter((d) => d.type === "pickup").length}
          onCreate={(data) => {
            const id = Date.now();
            persist({ ...state, deliveries: [...deliveries, { id, ...data, items: [], kitchenStatus: null }] });
            setShowNewDelivery(false);
            setActiveDelivery(id);
          }}
          onClose={() => setShowNewDelivery(false)}
        />
      )}

      {receiptFor && <ReceiptModal sale={receiptFor} onClose={() => setReceiptFor(null)} />}

      {menuManagerOpen && (
        <MenuManagerModal
          menuItems={menuItems}
          menuCats={menuCats}
          onAddItem={addMenuItem}
          onUpdateItem={updateMenuItem}
          onDeleteItem={deleteMenuItem}
          onAddCategory={addMenuCategory}
          onClose={() => setMenuManagerOpen(false)}
        />
      )}
    </div>
  );
}

function statusStyle(kitchenStatus, hasItems) {
  if (!hasItems) return { grad: "linear-gradient(135deg, #26A65B, #158A4A)", text: "#fff", label: "Libre", icon: "🟢", glow: "rgba(38,166,91,0.4)" };
  if (!kitchenStatus) return { grad: "linear-gradient(135deg, #FFC107, #FF8F00)", text: "#2B2118", label: "Armando orden", icon: "📝", glow: "rgba(255,143,0,0.4)" };
  if (kitchenStatus === "pendiente") return { grad: "linear-gradient(135deg, #FF5722, #D84315)", text: "#fff", label: "En cocina", icon: "🆕", glow: "rgba(216,67,21,0.45)" };
  if (kitchenStatus === "preparando") return { grad: "linear-gradient(135deg, #E53935, #B71C1C)", text: "#fff", label: "Preparando", icon: "🔥", glow: "rgba(183,28,28,0.5)" };
  if (kitchenStatus === "listo") return { grad: "linear-gradient(135deg, #00E676, #00A152)", text: "#fff", label: "¡Listo!", icon: "✅", glow: "rgba(0,161,82,0.55)" };
  return { grad: "linear-gradient(135deg, #26A65B, #158A4A)", text: "#fff", label: "Libre", icon: "🟢", glow: "rgba(38,166,91,0.4)" };
}

function PinGate({ pin, onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div style={{ maxWidth: 320, margin: "60px auto", textAlign: "center" }}>
      <Lock size={32} style={{ marginBottom: 12 }} />
      <h3 style={{ marginTop: 0 }}>Caja protegida</h3>
      <p style={{ fontSize: 13, color: "#8a7a63" }}>Ingresa el PIN para acceder</p>
      <input
        type="password"
        inputMode="numeric"
        value={val}
        onChange={(e) => { setVal(e.target.value); setErr(false); }}
        style={{ width: "100%", padding: 12, fontSize: 20, textAlign: "center", letterSpacing: 6, borderRadius: 8, border: "1px solid #E5D9C3", boxSizing: "border-box" }}
      />
      {err && <p style={{ color: "#C1272D", fontSize: 12, marginTop: 6 }}>PIN incorrecto</p>}
      <button
        onClick={() => (val === pin ? onUnlock() : setErr(true))}
        style={{ marginTop: 12, width: "100%", padding: 12, border: "none", borderRadius: 8, background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer" }}
      >
        Entrar
      </button>
    </div>
  );
}

function TableElapsed({ occupiedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);
  if (!occupiedAt) return null;
  const mins = Math.max(0, Math.floor((now - new Date(occupiedAt).getTime()) / 60000));
  return <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>⏱ {mins} min ocupada</span>;
}

function MesasView({ tables, onOpen, onManageMenu }) {
  const libres = tables.filter((t) => t.items.length === 0).length;
  const ocupadas = tables.length - libres;
  const floorTotal = tables.reduce((sum, t) => sum + orderTotal(t.items), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 21, fontWeight: 800, margin: 0, letterSpacing: 0.2 }}>🍽️ Piso del restaurante</h2>
          <div style={{ fontSize: 12, color: "#8a7a63", marginTop: 2 }}>{RESTAURANT_NAME}</div>
        </div>
        <button
          onClick={onManageMenu}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, background: "linear-gradient(135deg, #2B2118, #3d2f22)", color: "#F2C879", boxShadow: "0 3px 10px rgba(43,33,24,0.25)" }}
        >
          🍔 Gestionar menú
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7a63", letterSpacing: 0.5, marginBottom: 4 }}>MESAS TOTALES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#2B2118" }}>{tables.length}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #FF5722, #D84315)", borderRadius: 12, padding: "14px 16px", color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, opacity: 0.9 }}>OCUPADAS</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{ocupadas}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #26A65B, #158A4A)", borderRadius: 12, padding: "14px 16px", color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, opacity: 0.9 }}>LIBRES</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{libres}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 12, padding: "14px 16px", color: "#F2C879" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, opacity: 0.9 }}>EN MESA AHORA</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(floorTotal)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 16 }}>
        {tables.map((t) => {
          const st = statusStyle(t.kitchenStatus, t.items.length > 0);
          const total = orderTotal(t.items);
          const itemCount = t.items.reduce((s, it) => s + it.qty, 0);
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              style={{
                background: st.grad, border: "none", borderRadius: 18, padding: "22px 16px", cursor: "pointer",
                textAlign: "left", color: st.text, boxShadow: `0 8px 20px ${st.glow}`, position: "relative", overflow: "hidden",
                transition: "transform 0.15s ease",
              }}
            >
              <div style={{ position: "absolute", top: -18, right: -18, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ fontSize: 24, position: "absolute", top: 12, right: 14, opacity: 0.9 }}>{st.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, letterSpacing: 1 }}>MESA</div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, marginTop: -2 }}>{t.id}</div>
              <div style={{
                fontSize: 11, fontWeight: 800, marginTop: 10, textTransform: "uppercase", letterSpacing: 0.5,
                display: "inline-block", background: "rgba(0,0,0,0.15)", padding: "3px 10px", borderRadius: 20,
              }}>{st.label}</div>
              {t.items.length > 0 && (
                <>
                  <div style={{ fontSize: 19, marginTop: 12, fontWeight: 800 }}>{money(total)}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{itemCount} ítem{itemCount !== 1 ? "s" : ""}</div>
                  <div style={{ marginTop: 4 }}><TableElapsed occupiedAt={t.occupiedAt} /></div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MenuManagerModal({ menuItems, menuCats, onAddItem, onUpdateItem, onDeleteItem, onAddCategory, onClose }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [price12, setPrice12] = useState("");
  const [cat, setCat] = useState(menuCats[0]?.name || "");
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🍽️");
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  function handleAdd() {
    if (!name.trim() || !price) return;
    onAddItem({ name: name.trim(), price: Number(price), ...(price12 ? { price12: Number(price12) } : {}), cat });
    setName(""); setPrice(""); setPrice12("");
  }
  function handleAddCat() {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatIcon);
    setCat(newCatName.trim());
    setNewCatName(""); setNewCatMode(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ background: "#FFF8ED", borderRadius: 18, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", color: "#FFF8ED", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🍔 Gestionar menú</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#FFF8ED", cursor: "pointer", padding: 6 }}><X size={20} /></button>
        </div>

        <div style={{ padding: 18, overflow: "auto" }}>
          <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>➕ Agregar platillo nuevo</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <input placeholder="Nombre del platillo" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, maxWidth: 200 }} />
              <input placeholder="Precio (C$)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inp, maxWidth: 120 }} />
              <input placeholder="Precio alterno (opcional)" type="number" value={price12} onChange={(e) => setPrice12(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {!newCatMode ? (
                <>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inp, maxWidth: 200 }}>
                    {menuCats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <button onClick={() => setNewCatMode(true)} style={{ fontSize: 12, background: "none", border: "1px dashed #C1272D", color: "#C1272D", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>
                    + Nueva categoría
                  </button>
                  <button onClick={handleAdd} disabled={!name || !price} style={{ marginLeft: "auto", padding: "0 18px", height: 38, border: "none", borderRadius: 8, background: "#2E7D32", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: name && price ? 1 : 0.5 }}>
                    Agregar platillo
                  </button>
                </>
              ) : (
                <>
                  <input placeholder="Emoji" value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} style={{ ...inp, maxWidth: 60, textAlign: "center" }} />
                  <input placeholder="Nombre de la categoría (ej: Postres)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} style={{ ...inp, maxWidth: 220 }} />
                  <button onClick={handleAddCat} disabled={!newCatName.trim()} style={{ padding: "0 16px", height: 38, border: "none", borderRadius: 8, background: "#2B2118", color: "#F2C879", fontWeight: 800, cursor: "pointer", opacity: newCatName.trim() ? 1 : 0.5 }}>
                    Crear categoría
                  </button>
                  <button onClick={() => setNewCatMode(false)} style={{ padding: "0 12px", height: 38, border: "1px solid #E5D9C3", borderRadius: 8, background: "#fff", cursor: "pointer" }}>
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>

          {menuCats.map((c) => {
            const items = menuItems.filter((m) => m.cat === c.name);
            if (!items.length) return null;
            return (
              <div key={c.name} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#5a4c3a", marginBottom: 8, letterSpacing: 0.3 }}>{c.icon} {c.name.toUpperCase()}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {items.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #F0E8D8", borderRadius: 10, padding: "8px 12px", opacity: m.active === false ? 0.5 : 1 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.name}{m.price12 ? ` (x12: ${money(m.price12)})` : ""}</span>
                      {editingId === m.id ? (
                        <>
                          <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ ...inp, maxWidth: 90, padding: 6 }} />
                          <button onClick={() => { onUpdateItem(m.id, { price: Number(editPrice) }); setEditingId(null); }} style={{ fontSize: 11, background: "#2E7D32", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontWeight: 700 }}>Guardar</button>
                        </>
                      ) : (
                        <span onClick={() => { setEditingId(m.id); setEditPrice(String(m.price)); }} style={{ fontSize: 13, fontWeight: 800, color: "#C1272D", cursor: "pointer" }} title="Click para editar precio">{money(m.price)} ✏️</span>
                      )}
                      <button onClick={() => onUpdateItem(m.id, { active: m.active === false ? true : false })} title={m.active === false ? "Activar" : "Desactivar"} style={{ background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: "#8a7a63" }}>
                        {m.active === false ? "Activar" : "Ocultar"}
                      </button>
                      <button onClick={() => { if (window.confirm(`¿Eliminar "${m.name}" del menú?`)) onDeleteItem(m.id); }} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer" }}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: 14, borderTop: "1px solid #E5D9C3", background: "#fff" }}>
          <button onClick={onClose} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #E5D9C3", background: "#fff", fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function StockBar({ stock, minStock }) {
  const low = minStock > 0 && stock <= minStock;
  const pct = minStock > 0 ? Math.min(100, Math.round((stock / (minStock * 2 || 1)) * 100)) : 100;
  return (
    <div style={{ background: "#F0E8D8", borderRadius: 6, height: 8, overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: low ? "linear-gradient(90deg, #E53935, #C1272D)" : "linear-gradient(90deg, #26A65B, #158A4A)", borderRadius: 6 }} />
    </div>
  );
}

function StockAdjustForm({ item, onAdjust }) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  });
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <input type="number" placeholder="Cantidad" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inp, maxWidth: 100, padding: 7 }} />
      <input placeholder="Nota (ej: compra, merma)" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, maxWidth: 180, padding: 7 }} />
      <div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Fecha a la que corresponde este movimiento" style={{ ...inp, maxWidth: 145, padding: 7 }} />
      </div>
      <button
        disabled={!qty}
        onClick={() => { onAdjust(item.id, Number(qty), "entrada", note, date); setQty(""); setNote(""); }}
        style={{ fontSize: 12, background: "#2E7D32", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontWeight: 700, opacity: qty ? 1 : 0.5 }}
      >
        + Entrada
      </button>
      <button
        disabled={!qty}
        onClick={() => { onAdjust(item.id, Number(qty), "salida", note, date); setQty(""); setNote(""); }}
        style={{ fontSize: 12, background: "#C1272D", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontWeight: 700, opacity: qty ? 1 : 0.5 }}
      >
        − Salida
      </button>
    </div>
  );
}

function InventoryView({ inventory, inventoryLog, menuItems, onAdd, onUpdate, onDelete, onAdjust, onSetRecipe }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(INVENTORY_UNITS[0]);
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [recipeFor, setRecipeFor] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const lowStock = inventory.filter((i) => i.minStock > 0 && i.stock <= i.minStock);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>📦 Inventario de insumos</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 16 }}>
        Llevá el control de tus insumos y ligalos a los platillos para que el stock se descuente solo con cada venta.
      </p>

      {lowStock.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #C1272D, #E8A33D)", borderRadius: 14, padding: 16, marginBottom: 20, color: "#fff", boxShadow: "0 6px 18px rgba(193,39,45,0.3)" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>⚠️ Stock bajo — hay que comprar pronto</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {lowStock.map((i) => (
              <span key={i.id} style={{ background: "rgba(255,255,255,0.22)", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                {i.name}: {i.stock} {i.unit} (mín. {i.minStock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>➕ Agregar insumo nuevo</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Nombre (ej: Pechuga de pollo)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, maxWidth: 220 }} />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inp, maxWidth: 110 }}>
            {INVENTORY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <input placeholder="Stock inicial" type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={{ ...inp, maxWidth: 130 }} />
          <input placeholder="Stock mínimo (alerta)" type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} style={{ ...inp, maxWidth: 150 }} />
          <button
            disabled={!name}
            onClick={() => { onAdd({ name: name.trim(), unit, stock: Number(stock) || 0, minStock: Number(minStock) || 0 }); setName(""); setStock(""); setMinStock(""); }}
            style={{ padding: "0 16px", border: "none", borderRadius: 8, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: name ? 1 : 0.5 }}
          >
            Agregar
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginBottom: 10 }}>Insumos ({inventory.length})</h3>
      {inventory.length === 0 && <p style={{ color: "#8a7a63" }}>Todavía no agregás ningún insumo.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {inventory.map((item) => {
          const low = item.minStock > 0 && item.stock <= item.minStock;
          const linkedItems = menuItems.filter((m) => (m.recipe || []).some((r) => r.invId === item.id));
          return (
            <div key={item.id} style={{ background: "#fff", border: low ? "2px solid #E8A33D" : "1px solid #E5D9C3", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7a63" }}>Mínimo: {item.minStock} {item.unit}{linkedItems.length > 0 ? ` · ligado a ${linkedItems.length} platillo${linkedItems.length !== 1 ? "s" : ""}` : ""}</div>
                  <StockBar stock={item.stock} minStock={item.minStock} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: low ? "#C1272D" : "#2B2118" }}>{item.stock} {item.unit}</div>
                  {low && <div style={{ fontSize: 10, color: "#C1272D", fontWeight: 700 }}>⚠️ Stock bajo</div>}
                </div>
              </div>
              <StockAdjustForm item={item} onAdjust={onAdjust} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setRecipeFor(recipeFor === item.id ? null : item.id)} style={{ fontSize: 11, background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#5a4c3a", fontWeight: 700 }}>
                  🔗 Ligar a platillos
                </button>
                <button onClick={() => { if (window.confirm(`¿Eliminar "${item.name}" del inventario?`)) onDelete(item.id); }} style={{ fontSize: 11, background: "none", border: "1px solid #C1272D", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#C1272D", fontWeight: 700 }}>
                  Eliminar insumo
                </button>
              </div>
              {recipeFor === item.id && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7a63", marginBottom: 6 }}>Platillos que usan este insumo:</div>
                  {menuItems.map((m) => {
                    const line = (m.recipe || []).find((r) => r.invId === item.id);
                    return (
                      <MenuRecipeLine key={m.id} menuItem={m} inventoryItem={item} qty={line?.qty || ""} onSetRecipe={onSetRecipe} />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {inventoryLog.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setShowLog((s) => !s)} style={{ fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#8a7a63", fontWeight: 700 }}>
            📜 {showLog ? "Ocultar" : "Ver"} historial de movimientos ({inventoryLog.length})
          </button>
          {showLog && (
            <div style={{ marginTop: 10, background: "#fff", border: "1px solid #E5D9C3", borderRadius: 12, padding: "4px 14px", maxHeight: 300, overflowY: "auto" }}>
              {inventoryLog.slice().reverse().map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5EEE0", fontSize: 12 }}>
                  <span>
                    {l.type === "entrada" ? "🟢" : l.type === "venta" ? "🛒" : "🔴"} <strong>{l.itemName}</strong>
                    {l.note ? <span style={{ color: "#8a7a63" }}> — {l.note}</span> : ""}
                  </span>
                  <span style={{ fontWeight: 700, color: l.type === "entrada" ? "#2E7D32" : "#C1272D" }}>
                    {l.type === "entrada" ? "+" : "-"}{l.qty} · {new Date(l.time).toLocaleDateString("es-NI")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuRecipeLine({ menuItem, inventoryItem, qty, onSetRecipe }) {
  const [val, setVal] = useState(qty);
  const linked = qty !== "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
      <span style={{ flex: 1 }}>{linked ? "✅" : "⬜"} {menuItem.name}</span>
      <input
        type="number"
        placeholder="cant."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{ ...inp, maxWidth: 70, padding: 5 }}
      />
      <button
        onClick={() => {
          const recipe = menuItem.recipe || [];
          const next = val
            ? (recipe.some((r) => r.invId === inventoryItem.id) ? recipe.map((r) => (r.invId === inventoryItem.id ? { ...r, qty: Number(val) } : r)) : [...recipe, { invId: inventoryItem.id, qty: Number(val) }])
            : recipe.filter((r) => r.invId !== inventoryItem.id);
          onSetRecipe(menuItem.id, next);
        }}
        style={{ fontSize: 11, background: "#2B2118", color: "#F2C879", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}
      >
        Guardar
      </button>
    </div>
  );
}

function WingOptionsModal({ item, onConfirm, onClose }) {
  const needsQty = !!item.price12;
  const [qty, setQty] = useState(6);
  const [sauce, setSauce] = useState(WING_SAUCES[0]);
  const [pres, setPres] = useState("Bañadas");
  const finalPrice = needsQty && qty === 12 ? item.price12 : item.price;
  const finalName = needsQty ? `${item.name} x${qty}` : item.name;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>🍗 {item.name}</h3>
        <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0 }}>Elige {needsQty ? "cantidad, salsa y presentación" : "la salsa y cómo las quieren"}</p>

        {needsQty && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5a4c3a", marginBottom: 6 }}>Cantidad</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[6, 12].map((q) => (
                <button
                  key={q}
                  onClick={() => setQty(q)}
                  style={{
                    flex: 1, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                    background: qty === q ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0",
                    color: qty === q ? "#fff" : "#5a4c3a",
                  }}
                >
                  {q} pzas · {money(q === 12 ? item.price12 : item.price)}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: "#5a4c3a", marginBottom: 6 }}>Salsa</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {WING_SAUCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSauce(s)}
              style={{
                padding: 10, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: sauce.id === s.id ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0",
                color: sauce.id === s.id ? "#fff" : "#5a4c3a",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#5a4c3a", marginBottom: 6 }}>Presentación</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["Bañadas", "Salsa aparte"].map((p) => (
            <button
              key={p}
              onClick={() => setPres(p)}
              style={{
                flex: 1, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: pres === p ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0",
                color: pres === p ? "#fff" : "#5a4c3a",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer" }}>Cancelar</button>
          <button
            onClick={() => onConfirm({ id: `${item.id}-${qty}-${sauce.id}-${pres === "Bañadas" ? "banadas" : "aparte"}`, name: `${finalName} · ${sauce.label} (${pres})`, price: finalPrice })}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ title, items, kitchenStatus, promotions, menuItems, menuCats, onAdd, onQty, onNote, onSend, onClose }) {
  const activeItems = menuItems.filter((m) => m.active !== false);
  const catsWithItems = menuCats.filter((c) => activeItems.some((m) => m.cat === c.name));
  const allCatNames = promotions && promotions.length > 0 ? [...catsWithItems.map((c) => c.name), "Promociones"] : catsWithItems.map((c) => c.name);
  const [cat, setCat] = useState(allCatNames[0] || "Promociones");
  const [search, setSearch] = useState("");
  const [wingItem, setWingItem] = useState(null);
  const total = orderTotal(items);
  const itemCount = items.reduce((s, it) => s + it.qty, 0);
  const baseList = cat === "Promociones" ? promotions : activeItems.filter((m) => m.cat === cat);
  const listForCat = search ? baseList.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) : baseList;
  const cartQtyFor = (menuId) => items.filter((it) => it.menuId === menuId || String(it.menuId).startsWith(String(menuId) + "-")).reduce((s, it) => s + it.qty, 0);

  function handleItemClick(m) {
    if (m.cat === "Chicken Mood" && m.name.toLowerCase().includes("alita")) {
      setWingItem(m);
    } else {
      onAdd(m);
    }
  }

  // Paleta cálida y refinada
  const CREAM = "#FBF3E7";
  const CREAM_DEEP = "#F5E6D5";
  const CARD = "#FFFDF9";
  const TERRACOTTA = "#B85C38";
  const TERRACOTTA_DEEP = "#8C4530";
  const ESPRESSO = "#4A3728";
  const GOLD = "#C9A66B";
  const MUTED = "#9A8776";
  const LINE = "#E9DCC8";

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Work+Sans:wght@400;500;600;700&display=swap');
      @keyframes soModalIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      .so-elite:active { transform: scale(0.985); }
    `}</style>
    <div style={{ position: "fixed", inset: 0, background: "rgba(58,42,28,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{
        fontFamily: "'Work Sans', Arial, sans-serif",
        background: CREAM, borderRadius: 20, width: "100%", maxWidth: 980, height: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 60px rgba(74,55,40,0.28)", animation: "soModalIn 0.32s cubic-bezier(.2,.9,.3,1)",
        border: `1px solid ${LINE}`,
      }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(160deg, ${CREAM_DEEP}, ${CREAM})`, padding: "20px 28px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: "uppercase", marginBottom: 4 }}>
              {kitchenStatus ? "Actualizando pedido" : "Armando pedido"}
            </div>
            <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26, letterSpacing: 0.2, lineHeight: 1, color: ESPRESSO }}>
              {title}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${LINE}`, borderRadius: "50%", color: ESPRESSO, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={17} />
          </button>
        </div>

        {/* Cuerpo: 3 columnas — categorías | productos | pedido (siempre visible) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Columna 1: categorías */}
          <div style={{ width: 168, borderRight: `1px solid ${LINE}`, flexShrink: 0, background: CREAM, padding: "14px 10px", overflow: "auto" }}>
            {allCatNames.map((c) => {
              const active = cat === c;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                    border: "none", borderLeft: active ? `3px solid ${TERRACOTTA}` : "3px solid transparent", cursor: "pointer",
                    background: active ? "rgba(184,92,56,0.09)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                    {c === "Promociones" ? "🏷️" : (menuCats.find((mc) => mc.name === c)?.icon || "🍽️")}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, letterSpacing: 0.2, color: active ? TERRACOTTA_DEEP : MUTED }}>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Columna 2: productos */}
          <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
            <input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 13, boxSizing: "border-box", marginBottom: 16, background: CARD, fontFamily: "inherit", color: ESPRESSO }}
            />
            {cat === "Promociones" && listForCat.length === 0 && !search && (
              <p style={{ fontSize: 13, color: MUTED }}>No hay promociones activas. Agrégalas en la pestaña "Promos".</p>
            )}
            {search && listForCat.length === 0 && (
              <p style={{ fontSize: 13, color: MUTED }}>Sin resultados para "{search}".</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
              {listForCat.map((m) => {
                const inCart = cartQtyFor(m.id);
                return (
                  <button
                    key={m.id}
                    className="so-elite"
                    onClick={() => handleItemClick(m)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: "16px 16px", borderRadius: 14,
                      border: `1px solid ${inCart > 0 ? "rgba(184,92,56,0.35)" : LINE}`, cursor: "pointer", fontSize: 14, textAlign: "left", position: "relative",
                      background: cat === "Promociones" ? "linear-gradient(160deg, #FBEEE2, #F5DCC4)" : CARD,
                      boxShadow: "0 2px 10px rgba(74,55,40,0.06)", transition: "border-color 0.15s ease, transform 0.12s ease",
                    }}
                  >
                    {inCart > 0 && (
                      <span style={{
                        position: "absolute", top: 12, right: 12, color: "#fff", background: TERRACOTTA, borderRadius: "50%",
                        width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700,
                      }}>
                        {inCart}
                      </span>
                    )}
                    <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, color: ESPRESSO, fontSize: 15.5, lineHeight: 1.3, paddingRight: inCart > 0 ? 22 : 0 }}>{m.name}</span>
                    <span style={{ width: 22, height: 1, background: GOLD, opacity: 0.6 }} />
                    <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, color: TERRACOTTA, fontSize: 15 }}>
                      {money(m.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna 3: pedido — siempre visible, como una terminal de punto de venta */}
          <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${LINE}`, background: CARD, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Pedido actual</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 15, color: ESPRESSO, marginTop: 2 }}>
                {itemCount} ítem{itemCount !== 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 10px", color: MUTED, fontSize: 13 }}>
                  Tocá un producto <br />para agregarlo aquí.
                </div>
              )}
              {items.map((it) => (
                <div key={it.menuId} style={{ marginBottom: 8, background: CREAM, borderRadius: 12, padding: "11px 12px", border: `1px solid ${LINE}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: ESPRESSO, lineHeight: 1.3 }}>{it.name}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 14, color: TERRACOTTA, whiteSpace: "nowrap" }}>{money(it.price * it.qty)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <button onClick={() => onQty(it.menuId, -1)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${TERRACOTTA}`, background: "transparent", color: TERRACOTTA, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={11} /></button>
                    <span style={{ minWidth: 14, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: ESPRESSO }}>{it.qty}</span>
                    <button onClick={() => onQty(it.menuId, 1)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${TERRACOTTA}`, background: "transparent", color: TERRACOTTA, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={11} /></button>
                  </div>
                  <input placeholder="Nota (ej: sin cebolla)" value={it.notes} onChange={(e) => onNote(it.menuId, e.target.value)} style={{ marginTop: 7, width: "100%", fontSize: 11.5, padding: "6px 9px", borderRadius: 7, border: `1px solid ${LINE}`, boxSizing: "border-box", fontFamily: "inherit", background: CARD }} />
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${LINE}`, background: `linear-gradient(160deg, ${CREAM_DEEP}, #EFD9C4)`, flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.5, color: MUTED, textTransform: "uppercase" }}>Total</span>
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, color: ESPRESSO }}>{money(total)}</span>
              </div>
              <button
                onClick={onSend}
                disabled={!items.length}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 12, border: "none",
                  cursor: items.length ? "pointer" : "not-allowed",
                  background: items.length ? TERRACOTTA : "rgba(74,55,40,0.15)",
                  color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: "'Work Sans', sans-serif",
                  boxShadow: items.length ? "0 8px 20px rgba(140,69,48,0.28)" : "none",
                }}
              >
                <Send size={15} /> {kitchenStatus ? "Actualizar cocina" : "Enviar a cocina"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    {wingItem && (
      <WingOptionsModal
        item={wingItem}
        onConfirm={(customItem) => { onAdd(customItem); setWingItem(null); }}
        onClose={() => setWingItem(null)}
      />
    )}
    </>
  );
}

const iconBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

function ElapsedBadge({ sentAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(iv);
  }, []);
  if (!sentAt) return null;
  const mins = Math.max(0, Math.floor((now - new Date(sentAt).getTime()) / 60000));
  const urgent = mins >= 10;
  return (
    <span style={{
      fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
      background: urgent ? "#C1272D" : "rgba(255,255,255,0.25)", color: "#fff",
      animation: urgent ? "pulseBadge 1.2s infinite" : "none",
    }}>
      ⏱ {mins} min
    </span>
  );
}

function CocinaView({ tables, deliveries, onAdvance }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const nuevos = [
    ...tables.filter((t) => t.kitchenStatus === "pendiente").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.kitchenStatus === "pendiente").map((d) => ({ kind: "delivery", id: d.id, label: d.type === "pickup" ? "🥡 Para llevar" : "🛵 Delivery", ...d })),
  ];
  const preparando = [
    ...tables.filter((t) => t.kitchenStatus === "preparando").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.kitchenStatus === "preparando").map((d) => ({ kind: "delivery", id: d.id, label: d.type === "pickup" ? "🥡 Para llevar" : "🛵 Delivery", ...d })),
  ];
  const listos = [
    ...tables.filter((t) => t.kitchenStatus === "listo").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.kitchenStatus === "listo").map((d) => ({ kind: "delivery", id: d.id, label: d.type === "pickup" ? "🥡 Para llevar" : "🛵 Delivery", ...d })),
  ];

  const columns = [
    { key: "nuevos", title: "NUEVOS", emoji: "🆕", items: nuevos, accent: "#FF5252", action: "preparando", actionLabel: "Empezar a preparar" },
    { key: "preparando", title: "PREPARANDO", emoji: "🔥", items: preparando, accent: "#FFB300", action: "listo", actionLabel: "Marcar listo" },
    { key: "listos", title: "LISTOS", emoji: "✅", items: listos, accent: "#00E676", action: null, actionLabel: null },
  ];

  return (
    <div style={{ background: "radial-gradient(circle at top, #2d2418, #16110c)", borderRadius: 20, padding: "22px 20px", margin: "-4px", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes pulseBadge { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes cardIn { from { transform: scale(0.94) translateY(6px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes liveDot { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,230,118,0.5); } 50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(0,230,118,0); } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#00E676", animation: "liveDot 1.6s infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#00E676" }}>EN VIVO</span>
          </div>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 28, margin: 0, color: "#F2C879", letterSpacing: 0.5, textTransform: "uppercase" }}>Pantalla de Cocina</h2>
          <div style={{ fontSize: 11, color: "#9a8a6f", letterSpacing: 1 }}>{RESTAURANT_NAME.toUpperCase()}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", fontFamily: "'Anton', sans-serif", textShadow: "0 0 20px rgba(242,200,121,0.35)" }}>{now.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 11, color: "#9a8a6f", textTransform: "capitalize" }}>{now.toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {nuevos.length === 0 && preparando.length === 0 && listos.length === 0 && (
        <div style={{ textAlign: "center", padding: "70px 20px", color: "#7a6c56" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🍽️</div>
          <p style={{ fontSize: 15 }}>Todo tranquilo — no hay pedidos en cocina.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18, alignItems: "start" }}>
        {columns.map((col) => (
          <div key={col.key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 18, border: `1px solid ${col.accent}33`, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `2px solid ${col.accent}`, background: `${col.accent}14` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Anton', sans-serif", fontSize: 16, letterSpacing: 1.2, color: col.accent }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: col.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{col.emoji}</span>
                {col.title}
              </span>
              <span style={{ background: col.accent, color: "#1a1410", borderRadius: 20, padding: "2px 13px", fontSize: 13, fontFamily: "'Anton', sans-serif" }}>{col.items.length}</span>
            </div>
            <div style={{ padding: 12, minHeight: 100, display: "flex", flexDirection: "column", gap: 12 }}>
              {col.items.length === 0 && <div style={{ fontSize: 12, color: "#5a4c3a", textAlign: "center", padding: "20px 0", fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }}>— vacío —</div>}
              {col.items.map((o) => (
                <div
                  key={o.kind + o.id}
                  style={{
                    background: "linear-gradient(160deg, #262019, #1d1712)", borderRadius: 16, padding: 16, color: "#F5ECD9",
                    animation: "cardIn 0.3s ease", border: `1px solid ${col.accent}55`, borderLeft: `5px solid ${col.accent}`,
                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <strong style={{ fontFamily: "'Anton', sans-serif", fontSize: 19, letterSpacing: 0.3, fontWeight: 400 }}>{o.label}</strong>
                    <ElapsedBadge sentAt={o.kitchenSentAt} />
                  </div>
                  <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: "#E4D8C0" }}>
                    {o.items.map((it) => (
                      <li key={it.menuId}>
                        <strong style={{ color: "#F2C879" }}>{it.qty}x</strong> {it.name}
                        {it.notes && <div style={{ fontSize: 12, color: "#C1531F", fontStyle: "italic" }}>↳ {it.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  {col.action && (
                    <button
                      onClick={() => onAdvance(o.kind, o.id, col.action)}
                      style={{ width: "100%", padding: "12px 0", border: "none", borderRadius: 12, background: col.accent, color: "#1a1410", fontFamily: "'Anton', sans-serif", fontSize: 14, cursor: "pointer", letterSpacing: 0.3, boxShadow: `0 6px 14px ${col.accent}55` }}
                    >
                      {col.actionLabel} →
                    </button>
                  )}
                  {!col.action && (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: col.accent, letterSpacing: 0.5 }}>🔔 AVISAR AL MESERO</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorteCaja({ sales, expenses, employees, cashSessions, onOpenSession, onCloseSession }) {
  const active = cashSessions.find((s) => !s.closedAt);
  const [openedBy, setOpenedBy] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const closedSessions = cashSessions.filter((s) => s.closedAt).slice().reverse();

  if (!active) {
    return (
      <div style={{ background: "linear-gradient(160deg, #fff, #FFF8ED)", border: "2px dashed #C1272D", borderRadius: 16, padding: 22, marginBottom: 22, boxShadow: "0 6px 18px rgba(193,39,45,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #C1272D, #E8A33D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔓</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Abrir caja</div>
            <div style={{ fontSize: 11, color: "#8a7a63" }}>Necesario para empezar a cobrar en este turno</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={openedBy} onChange={(e) => setOpenedBy(e.target.value)} style={{ ...inp, maxWidth: 200 }}>
            <option value="">¿Quién abre la caja?</option>
            {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
          <input placeholder="Fondo inicial (C$)" type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
          <button
            disabled={!openedBy || !openingAmount}
            onClick={() => { onOpenSession(openedBy, openingAmount); setOpenedBy(""); setOpeningAmount(""); }}
            style={{ padding: "0 20px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #C1272D, #E8A33D)", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: openedBy && openingAmount ? 1 : 0.5, boxShadow: "0 3px 10px rgba(193,39,45,0.3)" }}
          >
            🔓 Abrir caja
          </button>
        </div>
        {closedSessions.length > 0 && (
          <button onClick={() => setShowHistory((s) => !s)} style={{ marginTop: 14, fontSize: 12, background: "none", border: "none", color: "#8a7a63", cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>
            📜 {showHistory ? "Ocultar" : "Ver"} historial de cortes anteriores ({closedSessions.length})
          </button>
        )}
        {showHistory && <SessionHistory sessions={closedSessions} sales={sales} expenses={expenses} />}
      </div>
    );
  }

  const cashSales = sales.filter((s) => new Date(s.time) >= new Date(active.openedAt) && s.method === "Efectivo").reduce((sum, s) => sum + s.total, 0);
  const cardSales = sales.filter((s) => new Date(s.time) >= new Date(active.openedAt) && s.method === "Tarjeta").reduce((sum, s) => sum + s.total, 0);
  const sessionSalesCount = sales.filter((s) => new Date(s.time) >= new Date(active.openedAt)).length;
  const sessionExpenses = expenses.filter((e) => new Date(e.time) >= new Date(active.openedAt)).reduce((sum, e) => sum + Number(e.amount), 0);
  const expectedCash = active.openingAmount + cashSales - sessionExpenses;
  const diff = counted !== "" ? Number(counted) - expectedCash : null;

  return (
    <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 18, padding: 22, marginBottom: 22, color: "#fff", boxShadow: "0 10px 24px rgba(0,0,0,0.25)", border: "1px solid rgba(242,200,121,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(242,200,121,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#F2C879" }}>Caja abierta — {active.openedBy}</div>
            <div style={{ fontSize: 11, color: "#C9BBA3" }}>Desde: {new Date(active.openedAt).toLocaleString("es-NI")}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: "#C9BBA3", letterSpacing: 0.5 }}>FONDO INICIAL</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{money(active.openingAmount)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, margin: "12px 0" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, borderLeft: "3px solid #26A65B" }}>
          <div style={{ fontSize: 10, color: "#C9BBA3" }}>💵 Ventas efectivo</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{money(cashSales)}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, borderLeft: "3px solid #1565C0" }}>
          <div style={{ fontSize: 10, color: "#C9BBA3" }}>💳 Ventas tarjeta</div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{money(cardSales)}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, borderLeft: "3px solid #FF5252" }}>
          <div style={{ fontSize: 10, color: "#C9BBA3" }}>📤 Gastos del turno</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#FF8A80" }}>-{money(sessionExpenses)}</div>
        </div>
        <div style={{ background: "#F2C879", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, color: "#2B2118", fontWeight: 700 }}>💰 EFECTIVO ESPERADO</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#2B2118" }}>{money(expectedCash)}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#C9BBA3", marginBottom: 16 }}>📋 {sessionSalesCount} venta{sessionSalesCount !== 1 ? "s" : ""} en este turno · Total general: <strong style={{ color: "#F2C879" }}>{money(cashSales + cardSales)}</strong></div>

      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", marginBottom: 10, letterSpacing: 0.5 }}>🧮 CONTEO FÍSICO PARA CERRAR</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Efectivo contado" type="number" value={counted} onChange={(e) => setCounted(e.target.value)} style={{ ...inp, maxWidth: 190, color: "#2B2118", fontWeight: 700 }} />
          <input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inp, maxWidth: 180, color: "#2B2118" }} />
        </div>

        {counted !== "" && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 14, textAlign: "center",
            background: diff === 0 ? "rgba(0,230,118,0.15)" : diff > 0 ? "rgba(242,200,121,0.15)" : "rgba(255,82,82,0.15)",
            color: diff === 0 ? "#00E676" : diff > 0 ? "#F2C879" : "#FF5252",
            border: `1px solid ${diff === 0 ? "#00E676" : diff > 0 ? "#F2C879" : "#FF5252"}44`,
          }}>
            {diff === 0 ? "✅ Cuadra exacto" : diff > 0 ? `📈 Sobran ${money(diff)}` : `📉 Faltan ${money(Math.abs(diff))}`}
          </div>
        )}

        <button
          disabled={counted === ""}
          onClick={() => { if (window.confirm("¿Cerrar la caja con estos datos?")) onCloseSession(active.id, counted, expectedCash, notes); }}
          style={{ marginTop: 14, width: "100%", padding: 13, border: "none", borderRadius: 10, background: counted !== "" ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 800, cursor: counted !== "" ? "pointer" : "not-allowed", fontSize: 14, letterSpacing: 0.3 }}
        >
          🔒 Cerrar caja
        </button>
      </div>
    </div>
  );
}

function printSessionReport(session, sales, expenses) {
  const start = new Date(session.openedAt);
  const end = session.closedAt ? new Date(session.closedAt) : new Date();
  const sessionSales = sales.filter((s) => new Date(s.time) >= start && new Date(s.time) <= end);
  const sessionExpenses = expenses.filter((e) => new Date(e.time) >= start && new Date(e.time) <= end);
  const cash = sessionSales.filter((s) => s.method === "Efectivo").reduce((sum, s) => sum + s.total, 0);
  const card = sessionSales.filter((s) => s.method === "Tarjeta").reduce((sum, s) => sum + s.total, 0);
  const expensesTotal = sessionExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const rows = sessionSales.map((s) => `
    <tr>
      <td>#${String(s.folio || s.id).padStart(5, "0")}</td>
      <td>${s.ref}</td>
      <td>${s.method}</td>
      <td style="text-align:right">${money(s.total)}</td>
    </tr>`).join("");

  const expenseRows = sessionExpenses.map((e) => `
    <tr><td colspan="3">${e.description}</td><td style="text-align:right">-${money(e.amount)}</td></tr>`).join("");

  const html = `
    <html><head><title>Corte de Caja</title><style>
      body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; color: #2B2118; }
      h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
      .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 4px 2px; border-bottom: 1px dashed #ccc; text-align: left; }
      .totals td { border: none; font-weight: bold; }
      .big { font-size: 15px; }
      hr { border: none; border-top: 2px dashed #333; margin: 10px 0; }
      @page { margin: 10mm; }
    </style></head><body>
      <h1>🍔🍗 ${RESTAURANT_NAME}</h1>
      <div class="sub">CORTE DE CAJA · MASATEPE, MASAYA</div>
      <div>Abierta por: <strong>${session.openedBy}</strong></div>
      <div>Desde: ${start.toLocaleString("es-NI")}</div>
      <div>Hasta: ${end.toLocaleString("es-NI")}</div>
      <hr/>
      <table>
        <tr><th>Ticket</th><th>Ref</th><th>Pago</th><th style="text-align:right">Total</th></tr>
        ${rows || '<tr><td colspan="4">Sin ventas registradas</td></tr>'}
      </table>
      <hr/>
      <table class="totals">
        <tr><td>Fondo inicial</td><td colspan="2"></td><td style="text-align:right">${money(session.openingAmount)}</td></tr>
        <tr><td>Ventas efectivo</td><td colspan="2"></td><td style="text-align:right">${money(cash)}</td></tr>
        <tr><td>Ventas tarjeta</td><td colspan="2"></td><td style="text-align:right">${money(card)}</td></tr>
        <tr><td>Gastos</td><td colspan="2"></td><td style="text-align:right">-${money(expensesTotal)}</td></tr>
        <tr class="big"><td>EFECTIVO ESPERADO</td><td colspan="2"></td><td style="text-align:right">${money(session.expectedCash != null ? session.expectedCash : session.openingAmount + cash - expensesTotal)}</td></tr>
        ${session.countedCash != null ? `<tr class="big"><td>EFECTIVO CONTADO</td><td colspan="2"></td><td style="text-align:right">${money(session.countedCash)}</td></tr>
        <tr class="big"><td>DIFERENCIA</td><td colspan="2"></td><td style="text-align:right">${session.difference >= 0 ? "+" : ""}${money(session.difference)}</td></tr>` : ""}
      </table>
      ${sessionExpenses.length ? `<hr/><div style="font-weight:bold;margin-bottom:4px;">Gastos del turno</div><table>${expenseRows}</table>` : ""}
      <hr/>
      <div style="text-align:center;margin-top:10px;">${sessionSales.length} ventas registradas · Generado ${new Date().toLocaleString("es-NI")}</div>
    </body></html>`;

  const w = window.open("", "_blank", "width=380,height=650");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function SessionHistory({ sessions, sales, expenses }) {
  return (
    <div style={{ marginTop: 12, background: "#fff", borderRadius: 12, padding: "6px 14px", border: "1px solid #F0E8D8" }}>
      {sessions.map((s) => (
        <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #F5EEE0", fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>{s.openedBy}</strong> · {new Date(s.openedAt).toLocaleDateString("es-NI")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontWeight: 800, padding: "2px 10px", borderRadius: 20,
                background: s.difference === 0 ? "#E8F5E9" : s.difference > 0 ? "#FFF8E1" : "#FCE8E8",
                color: s.difference === 0 ? "#2E7D32" : s.difference > 0 ? "#C99A1E" : "#C1272D",
              }}>
                {s.difference === 0 ? "Cuadró" : s.difference > 0 ? `+${money(s.difference)}` : `-${money(Math.abs(s.difference))}`}
              </span>
              <button onClick={() => printSessionReport(s, sales, expenses)} title="Imprimir corte" style={{ background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#8a7a63" }}>
                <Printer size={13} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#8a7a63", marginTop: 3 }}>Fondo: {money(s.openingAmount)} · Esperado: {money(s.expectedCash)} · Contado: {money(s.countedCash)}{s.notes ? ` · ${s.notes}` : ""}</div>
        </div>
      ))}
    </div>
  );
}

function GoalBar({ sales, salesGoal, onSetGoal }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(salesGoal || "");
  const today = todayStr();
  const todayTotal = sales.filter((s) => new Date(s.time).toDateString() === today).reduce((sum, s) => sum + s.total, 0);
  const pct = salesGoal > 0 ? Math.min(100, Math.round((todayTotal / salesGoal) * 100)) : 0;
  const reached = salesGoal > 0 && todayTotal >= salesGoal;

  if (!salesGoal || editing) {
    return (
      <div style={{ background: "#fff", border: "2px dashed #E8A33D", borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#5a4c3a" }}>Meta de ventas de hoy:</span>
        <input type="number" placeholder="Ej: 5000" value={val} onChange={(e) => setVal(e.target.value)} style={{ ...inp, maxWidth: 130 }} />
        <button
          disabled={!val}
          onClick={() => { onSetGoal(val); setEditing(false); }}
          style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: "linear-gradient(135deg, #C1272D, #E8A33D)", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: val ? 1 : 0.5 }}
        >
          Guardar meta
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: reached ? "linear-gradient(135deg, #00C853, #009624)" : "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 14, padding: 16, marginBottom: 18, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>{reached ? "🎉 ¡META ALCANZADA!" : "🎯 META DE VENTAS DE HOY"}</span>
        <button onClick={() => { setVal(salesGoal); setEditing(true); }} style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", color: "#fff" }}>✏️ Cambiar</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 22 }}>{money(todayTotal)}</span>
        <span style={{ fontSize: 13, opacity: 0.85 }}>de {money(salesGoal)} ({pct}%)</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, height: 14, overflow: "hidden" }}>
        <div style={{ background: reached ? "#fff" : "linear-gradient(90deg, #E8A33D, #F2C879)", height: "100%", width: `${pct}%`, borderRadius: 20, transition: "width 0.5s ease" }} />
      </div>
      {!reached && salesGoal > todayTotal && (
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.85 }}>Faltan {money(salesGoal - todayTotal)} para la meta</div>
      )}
    </div>
  );
}

function changeBreakdown(amount) {
  const denoms = [1000, 500, 200, 100, 50, 20, 10, 5, 1];
  let remaining = Math.round(amount);
  const result = [];
  for (const d of denoms) {
    const count = Math.floor(remaining / d);
    if (count > 0) {
      result.push({ denom: d, count });
      remaining -= count * d;
    }
  }
  return result;
}

function playChaChing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [[1568, 0], [2093, 0.08]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
      osc.start(now + offset);
      osc.stop(now + offset + 0.32);
    });
  } catch (e) {}
}

function CashKeypad({ value, onChange }) {
  function press(k) {
    if (k === "C") return onChange("");
    if (k === "⌫") return onChange(String(value).slice(0, -1));
    onChange(String(value) + k);
  }
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          style={{
            padding: "14px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 17,
            background: k === "C" ? "#FCE8E8" : k === "⌫" ? "#FFF3E0" : "#fff",
            color: k === "C" ? "#C1272D" : k === "⌫" ? "#C1531F" : "#2B2118",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function CajaView({ tables, deliveries, sales, expenses, employees, cashSessions, onOpenSession, onCloseSession, onCharge, pin, onChangePin, salesGoal, onSetGoal }) {
  const abiertas = [
    ...tables.filter((t) => t.items.length > 0).map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.items.length > 0 && d.kitchenStatus !== "entregado").map((d) => ({ kind: "delivery", id: d.id, label: `${d.customer}`, ...d })),
  ];
  const [method, setMethod] = useState({});
  const [discountOpen, setDiscountOpen] = useState({});
  const [discountType, setDiscountType] = useState({});
  const [discountValue, setDiscountValue] = useState({});
  const [tipValue, setTipValue] = useState({});
  const [cashGiven, setCashGiven] = useState({});
  const [splitMode, setSplitMode] = useState({});
  const [splitSelected, setSplitSelected] = useState({});
  const [evenSplitN, setEvenSplitN] = useState({});
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [accountTab, setAccountTab] = useState("todas");
  const grandTotal = abiertas.reduce((sum, o) => sum + orderTotal(o.items), 0);

  const INK = "#15100B";
  const CARD = "#1E1611";
  const CARD2 = "#251C15";
  const GOLD = "#F2C879";
  const EMBER = "#C1272D";
  const AMBER = "#E8A33D";
  const CREAM = "#F5ECD9";
  const MUTED = "#A8977E";
  const LINE = "rgba(242,200,121,0.14)";
  const BLUE = "#3E7FD9";

  function getDiscount(key) {
    const val = Number(discountValue[key] || 0);
    if (!val) return null;
    return { type: discountType[key] || "percent", value: val };
  }
  function discountedTotal(items, key) {
    const sub = orderTotal(items);
    const disc = getDiscount(key);
    if (!disc) return sub;
    const amt = disc.type === "percent" ? Math.round(sub * (disc.value / 100)) : Math.min(disc.value, sub);
    return Math.max(0, sub - amt);
  }

  const mesasAbiertas = abiertas.filter((o) => o.kind === "table").length;
  const deliveryAbiertos = abiertas.filter((o) => o.kind === "delivery").length;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@500;600&display=swap');
        @keyframes cajaFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cajaShine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes cajaPulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .caja-card { animation: cajaFadeUp 0.35s ease; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .caja-card:hover { transform: translateY(-3px); box-shadow: 0 16px 34px rgba(0,0,0,0.4); }
        .caja-tab { transition: all 0.18s ease; }
        .caja-tab:hover { transform: translateY(-1px); }
        .caja-pay-btn { transition: all 0.15s ease; }
        .caja-pay-btn:hover { transform: translateY(-2px); }
        .caja-charge-btn { position: relative; overflow: hidden; transition: transform 0.12s ease; }
        .caja-charge-btn:hover { transform: translateY(-2px); }
        .caja-charge-btn::after {
          content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
          background-size: 200% 100%; animation: cajaShine 3.5s linear infinite;
        }
        .caja-chip { transition: all 0.15s ease; }
        .caja-chip:hover { transform: translateY(-1px); filter: brightness(1.08); }
      `}</style>

      <div style={{
        background: `linear-gradient(160deg, ${INK}, #211710 60%, ${INK})`,
        borderRadius: 22, padding: "26px 28px", marginBottom: 22, position: "relative", overflow: "hidden",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)", border: `1px solid ${LINE}`,
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,200,121,0.10), transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(193,39,45,0.10), transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", animation: "cajaPulseDot 1.6s infinite" }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, color: "#8FD9A8", textTransform: "uppercase" }}>Terminal en vivo</span>
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 30, margin: 0, color: CREAM, letterSpacing: 0.2 }}>Caja</h2>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{RESTAURANT_NAME}</div>
          </div>
          <button
            onClick={() => setShowPinSettings((s) => !s)}
            className="caja-chip"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: `1px solid ${LINE}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, background: "rgba(255,255,255,0.04)", color: GOLD }}
          >
            <Lock size={14} /> Cambiar PIN
          </button>
        </div>

        {abiertas.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 22, position: "relative" }}>
            {[
              { label: "CUENTAS ABIERTAS", value: abiertas.length, accent: GOLD },
              { label: "MESAS", value: mesasAbiertas, accent: "#E8846B" },
              { label: "DELIVERY", value: deliveryAbiertos, accent: BLUE },
              { label: "TOTAL A COBRAR", value: money(grandTotal), accent: "#4ADE80", big: true },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 16px", borderLeft: `3px solid ${s.accent}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: s.big ? 22 : 24, fontWeight: 800, color: CREAM, fontFamily: s.big ? "'Anton', sans-serif" : "inherit" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPinSettings && (
        <div style={{ marginBottom: 18 }}>
          <ChangePin current={pin} onChange={(p) => { onChangePin(p); setShowPinSettings(false); }} />
        </div>
      )}

      <GoalBar sales={sales} salesGoal={salesGoal} onSetGoal={onSetGoal} />

      <CorteCaja sales={sales} expenses={expenses} employees={employees} cashSessions={cashSessions} onOpenSession={onOpenSession} onCloseSession={onCloseSession} />

      {abiertas.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED, background: CARD, borderRadius: 20, border: `1px dashed ${LINE}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: CREAM, margin: 0 }}>No hay cuentas abiertas</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Las mesas y pedidos con productos aparecerán aquí para cobrar.</p>
        </div>
      )}

      {abiertas.length > 0 && (() => {
        const mesasList = abiertas.filter((o) => o.kind === "table");
        const deliveryList = abiertas.filter((o) => o.kind === "delivery" && o.type !== "pickup");
        const pickupList = abiertas.filter((o) => o.kind === "delivery" && o.type === "pickup");
        const tabs = [
          { id: "todas", label: "Todas", icon: "📋", list: abiertas },
          { id: "mesas", label: "Mesas", icon: "🍽️", list: mesasList },
          { id: "delivery", label: "Delivery", icon: "🛵", list: deliveryList },
          { id: "pickup", label: "Para llevar", icon: "🥡", list: pickupList },
        ].filter((t) => t.id === "todas" || t.list.length > 0);
        const activeList = (tabs.find((t) => t.id === accountTab) || tabs[0]).list;

        return (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAccountTab(t.id)}
                  className="caja-tab"
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 30, cursor: "pointer", fontWeight: 700, fontSize: 13,
                    background: accountTab === t.id ? `linear-gradient(135deg, ${EMBER}, ${AMBER})` : CARD,
                    color: accountTab === t.id ? "#fff" : MUTED,
                    boxShadow: accountTab === t.id ? "0 6px 16px rgba(193,39,45,0.35)" : "none",
                    border: accountTab === t.id ? "none" : `1px solid ${LINE}`,
                  }}
                >
                  {t.icon} {t.label}
                  <span style={{
                    background: accountTab === t.id ? "rgba(255,255,255,0.25)" : "rgba(242,200,121,0.12)",
                    color: accountTab === t.id ? "#fff" : GOLD,
                    borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 800,
                  }}>{t.list.length}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {activeList.map((o) => {
          const total = orderTotal(o.items);
          const key = o.kind + o.id;
          const m = method[key] || "Efectivo";
          const isSplitting = splitMode[key] === "items";
          const selectedIds = splitSelected[key] || [];
          const chargeItems = isSplitting ? o.items.filter((it) => selectedIds.includes(it.menuId)) : o.items;
          const chargeTotal = orderTotal(chargeItems);
          const finalTotal = isSplitting ? chargeTotal : discountedTotal(o.items, key);
          const hasDiscount = !isSplitting && finalTotal < total;
          const typeAccent = o.kind === "table" ? "#E8846B" : (o.type === "pickup" ? AMBER : BLUE);
          const typeIcon = o.kind === "table" ? "🍽️" : (o.type === "pickup" ? "🥡" : "🛵");

          function toggleItem(menuId) {
            setSplitSelected((s) => {
              const cur = s[key] || [];
              return { ...s, [key]: cur.includes(menuId) ? cur.filter((x) => x !== menuId) : [...cur, menuId] };
            });
          }

          return (
            <div key={key} className="caja-card" style={{ background: `linear-gradient(175deg, ${CARD}, ${CARD2})`, borderRadius: 20, overflow: "hidden", border: `1px solid ${LINE}`, gridColumn: o.items.length > 6 ? "span 2" : "span 1" }}>
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${LINE}`, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: `${typeAccent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{typeIcon}</span>
                  <span style={{ color: CREAM, fontWeight: 700, fontSize: 15.5, fontFamily: "'Fraunces', serif" }}>{o.label}</span>
                </div>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, background: "rgba(242,200,121,0.10)", padding: "4px 11px", borderRadius: 20 }}>{o.items.reduce((s, it) => s + it.qty, 0)} ítems</span>
              </div>

              <div style={{ padding: 20 }}>
                {o.kind === "table" && o.items.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <button
                      onClick={() => { setSplitMode((s) => ({ ...s, [key]: s[key] === "items" ? false : "items" })); setEvenSplitN((s) => ({ ...s, [key]: 0 })); }}
                      className="caja-chip"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, background: splitMode[key] === "items" ? BLUE : "rgba(62,127,217,0.10)", border: `1px solid ${BLUE}55`, color: splitMode[key] === "items" ? "#fff" : BLUE, borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
                    >
                      ✂️ {splitMode[key] === "items" ? "Cancelar división" : "Dividir por productos"}
                    </button>
                    <button
                      onClick={() => { setSplitMode((s) => ({ ...s, [key]: s[key] === "even" ? false : "even" })); setSplitSelected((s) => ({ ...s, [key]: [] })); }}
                      className="caja-chip"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, background: splitMode[key] === "even" ? "#9C63D8" : "rgba(156,99,216,0.10)", border: "1px solid #9C63D855", color: splitMode[key] === "even" ? "#fff" : "#C9A8ED", borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}
                    >
                      🧮 {splitMode[key] === "even" ? "Cancelar" : "Partes iguales"}
                    </button>
                  </div>
                )}

                {splitMode[key] === "even" && (
                  <div style={{ background: "rgba(156,99,216,0.08)", border: "1px solid #9C63D855", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#C9A8ED", marginBottom: 10, letterSpacing: 0.5 }}>¿ENTRE CUÁNTAS PERSONAS?</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                      {[2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => setEvenSplitN((s) => ({ ...s, [key]: n }))}
                          className="caja-chip"
                          style={{
                            width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 15,
                            background: evenSplitN[key] === n ? "linear-gradient(135deg, #9C63D8, #7A3FC0)" : "rgba(255,255,255,0.06)",
                            color: evenSplitN[key] === n ? "#fff" : "#C9A8ED",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {evenSplitN[key] > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, evenSplitN[key])}, 1fr)`, gap: 10 }}>
                        {Array.from({ length: evenSplitN[key] }, (_, i) => (
                          <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, margin: "0 auto 6px" }}>{i + 1}</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#C9A8ED" }}>{money(total / evenSplitN[key])}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{
                  fontFamily: "'Plus Jakarta Sans', monospace",
                  columnCount: o.items.length > 6 ? 2 : 1,
                  columnGap: 20,
                  maxHeight: o.items.length > 16 ? 260 : "none",
                  overflowY: o.items.length > 16 ? "auto" : "visible",
                }}>
                  {o.items.map((it) => (
                    <div key={it.menuId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: "#D9CBB4", breakInside: "avoid" }}>
                      {isSplitting && (<input type="checkbox" checked={selectedIds.includes(it.menuId)} onChange={() => toggleItem(it.menuId)} style={{ marginRight: 8 }} />)}
                      <span style={{ flex: 1 }}>{it.qty}× {it.name}</span>
                      <span style={{ color: MUTED }}>{money(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px dashed ${LINE}`, margin: "14px 0" }} />

                {isSplitting ? (
                  <div style={{ background: "rgba(62,127,217,0.08)", border: `1px solid ${BLUE}55`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <button onClick={() => setSplitSelected((s) => ({ ...s, [key]: o.items.map((it) => it.menuId) }))} className="caja-chip" style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 700 }}>Seleccionar todo</button>
                      <button onClick={() => setSplitSelected((s) => ({ ...s, [key]: [] }))} className="caja-chip" style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${MUTED}`, color: MUTED, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 700 }}>Limpiar</button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>SELECCIONADO ({selectedIds.length}/{o.items.length})</span>
                      <span style={{ fontWeight: 800, fontSize: 20, color: BLUE }}>{money(chargeTotal)}</span>
                    </div>
                    {selectedIds.length > 0 && selectedIds.length < o.items.length && (
                      <div style={{ fontSize: 11, color: "#D9CBB4", marginTop: 8, borderTop: `1px dashed ${BLUE}55`, paddingTop: 8 }}>
                        Quedará pendiente: <strong>{money(total - chargeTotal)}</strong> ({o.items.length - selectedIds.length} producto{o.items.length - selectedIds.length !== 1 ? "s" : ""})
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setDiscountOpen((s) => ({ ...s, [key]: !s[key] }))}
                      className="caja-chip"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, background: discountOpen[key] ? EMBER : "rgba(193,39,45,0.10)", border: `1px solid ${EMBER}55`, color: discountOpen[key] ? "#fff" : "#F09090", borderRadius: 10, padding: "7px 12px", cursor: "pointer", fontWeight: 700, marginBottom: 12 }}
                    >
                      <Percent size={12} /> {discountOpen[key] ? "Ocultar descuento" : "Aplicar descuento"}
                    </button>

                    {discountOpen[key] && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
                        <select value={discountType[key] || "percent"} onChange={(e) => setDiscountType((s) => ({ ...s, [key]: e.target.value }))} style={{ ...cajaInp(LINE, CREAM), maxWidth: 80 }}>
                          <option value="percent">%</option>
                          <option value="amount">C$</option>
                        </select>
                        <input type="number" placeholder="0" value={discountValue[key] || ""} onChange={(e) => setDiscountValue((s) => ({ ...s, [key]: e.target.value }))} style={cajaInp(LINE, CREAM)} />
                      </div>
                    )}

                    {hasDiscount ? (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, textDecoration: "line-through" }}>
                          <span>Subtotal</span><span>{money(total)}</span>
                        </div>
                        <div style={{ background: `linear-gradient(135deg, ${INK}, #2a1f16)`, borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 20, color: GOLD, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, border: `1px solid ${LINE}` }}>
                          <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, letterSpacing: 1 }}>TOTAL</span><span>{money(finalTotal)}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: `linear-gradient(135deg, ${INK}, #2a1f16)`, borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 20, color: GOLD, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, border: `1px solid ${LINE}` }}>
                        <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, letterSpacing: 1 }}>TOTAL</span><span>{money(total)}</span>
                      </div>
                    )}
                  </>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 8 }}>MÉTODO DE PAGO</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ id: "Efectivo", icon: "💵" }, { id: "Tarjeta", icon: "💳" }].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setMethod((s) => ({ ...s, [key]: opt.id }))}
                        className="caja-pay-btn"
                        style={{
                          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "13px 10px", borderRadius: 14, cursor: "pointer",
                          border: m === opt.id ? `2px solid ${GOLD}` : `1px solid ${LINE}`,
                          background: m === opt.id ? "rgba(242,200,121,0.10)" : "rgba(255,255,255,0.02)",
                          boxShadow: m === opt.id ? "0 6px 16px rgba(242,200,121,0.15)" : "none",
                        }}
                      >
                        <span style={{ fontSize: 21 }}>{opt.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 12.5, color: m === opt.id ? GOLD : CREAM }}>{opt.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {!isSplitting && (
                  <div style={{ marginBottom: 12 }}>
                    <input type="number" placeholder="🙌 Propina (opcional)" value={tipValue[key] || ""} onChange={(e) => setTipValue((s) => ({ ...s, [key]: e.target.value }))} style={{ ...cajaInp(LINE, CREAM), width: "100%", boxSizing: "border-box" }} />
                  </div>
                )}

                {m === "Efectivo" && (() => {
                  const dueTotal = finalTotal + (isSplitting ? 0 : (Number(tipValue[key]) || 0));
                  return (
                    <div style={{ background: "rgba(242,200,121,0.06)", border: `1.5px solid ${GOLD}55`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: GOLD, marginBottom: 10 }}>¿CON CUÁNTO PAGA EL CLIENTE?</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {[dueTotal, 100, 200, 500, 1000].filter((v, i, arr) => arr.indexOf(v) === i && v > 0).map((v) => (
                          <button
                            key={v}
                            onClick={() => setCashGiven((s) => ({ ...s, [key]: v }))}
                            className="caja-chip"
                            style={{
                              padding: "8px 13px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12,
                              background: v === dueTotal ? "linear-gradient(135deg, #34D399, #059669)" : "rgba(255,255,255,0.06)",
                              color: v === dueTotal ? "#fff" : CREAM,
                            }}
                          >
                            {v === dueTotal ? "✓ Exacto" : money(v)}
                          </button>
                        ))}
                      </div>
                      <input type="number" placeholder="O escribe otro monto" value={cashGiven[key] || ""} onChange={(e) => setCashGiven((s) => ({ ...s, [key]: e.target.value }))} style={{ ...cajaInp(LINE, CREAM), width: "100%", boxSizing: "border-box", marginBottom: 10, fontSize: 16, fontWeight: 700, textAlign: "center" }} />
                      <CashKeypad value={cashGiven[key] || ""} onChange={(v) => setCashGiven((s) => ({ ...s, [key]: v }))} />
                      {cashGiven[key] !== undefined && cashGiven[key] !== "" && (() => {
                        const change = Number(cashGiven[key]) - dueTotal;
                        const breakdown = change > 0 ? changeBreakdown(change) : [];
                        return (
                          <>
                            <div style={{
                              textAlign: "center", padding: "14px 0", borderRadius: 12, fontWeight: 800,
                              background: change >= 0 ? "linear-gradient(135deg, #34D399, #059669)" : "linear-gradient(135deg, #F87171, #DC2626)",
                              color: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                            }}>
                              <div style={{ fontSize: 10.5, opacity: 0.9, letterSpacing: 1 }}>{change >= 0 ? "VUELTO A ENTREGAR" : "AÚN FALTA"}</div>
                              <div style={{ fontSize: 26 }}>{money(Math.abs(change))}</div>
                            </div>
                            {breakdown.length > 0 && (
                              <div style={{ marginTop: 10, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, border: `1px solid ${LINE}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 8, letterSpacing: 0.5 }}>ENTREGAR:</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {breakdown.map((b) => (
                                    <span key={b.denom} style={{ fontSize: 12, background: "rgba(242,200,121,0.10)", borderRadius: 8, padding: "5px 11px", fontWeight: 700, color: GOLD }}>{b.count}× {money(b.denom)}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}

                {isSplitting ? (
                  <button
                    disabled={selectedIds.length === 0}
                    onClick={() => { playChaChing(); onCharge(o.kind, o.id, m, null, null, selectedIds); setSplitSelected((s) => ({ ...s, [key]: [] })); setSplitMode((s) => ({ ...s, [key]: false })); }}
                    className="caja-charge-btn"
                    style={{ width: "100%", padding: 15, border: "none", borderRadius: 14, background: selectedIds.length ? `linear-gradient(135deg, ${BLUE}, #2A5FB0)` : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 800, cursor: selectedIds.length ? "pointer" : "not-allowed", fontSize: 14.5, letterSpacing: 0.3 }}
                  >
                    ✂️ Cobrar seleccionados ({money(chargeTotal)})
                  </button>
                ) : (
                  <button
                    onClick={() => { playChaChing(); onCharge(o.kind, o.id, m, getDiscount(key), tipValue[key]); }}
                    className="caja-charge-btn"
                    style={{ width: "100%", padding: 15, border: "none", borderRadius: 14, background: `linear-gradient(135deg, ${EMBER}, ${AMBER})`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14.5, letterSpacing: 0.3, boxShadow: "0 8px 20px rgba(193,39,45,0.3)" }}
                  >
                    ✓ Cobrar y cerrar{tipValue[key] ? ` (+${money(Number(tipValue[key]))} propina)` : ""}
                  </button>
                )}
              </div>
            </div>
          );
        })}
            </div>
          </>
        );
      })()}
    </div>
  );
}

function cajaInp(line, cream) {
  return { padding: 9, borderRadius: 9, border: `1px solid ${line}`, background: "rgba(255,255,255,0.03)", color: cream, fontSize: 13, fontFamily: "inherit" };
}

function ChangePin({ current, onChange }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [err, setErr] = useState("");
  return (
    <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 10, padding: 12, marginBottom: 16, maxWidth: 320 }}>
      <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>Cambiar PIN de caja</p>
      <input placeholder="PIN actual" type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} style={inp} />
      <input placeholder="PIN nuevo" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} style={{ ...inp, marginTop: 6 }} />
      {err && <p style={{ color: "#C1272D", fontSize: 12 }}>{err}</p>}
      <button
        onClick={() => {
          if (oldPin !== current) return setErr("El PIN actual no coincide.");
          if (newPin.length < 4) return setErr("El PIN nuevo debe tener al menos 4 dígitos.");
          onChange(newPin);
        }}
        style={{ marginTop: 8, width: "100%", padding: 8, border: "none", borderRadius: 6, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer" }}
      >
        Guardar
      </button>
    </div>
  );
}

function DeliveryView({ deliveries, onNew, onOpen }) {
  const activos = deliveries.filter((d) => d.kitchenStatus !== "entregado");
  const delivery = activos.filter((d) => d.type !== "pickup");
  const pickup = activos.filter((d) => d.type === "pickup");

  function sendDispatchWhatsapp(d, e) {
    e.stopPropagation();
    const digits = (d.phone || "").replace(/[^0-9]/g, "");
    const msg = `¡Hola ${d.customer}! 🛵 Tu pedido de ${RESTAURANT_NAME} ya va en camino. ¡Que lo disfrutes! 🍔`;
    const url = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function Section({ title, icon, list, showDispatch }) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#8a7a63", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{icon} {title} ({list.length})</h3>
        {list.length === 0 && <p style={{ color: "#C9BBA3", fontSize: 13 }}>Sin pedidos activos.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
          {list.map((d) => {
            const st = statusStyle(d.kitchenStatus, d.items.length > 0);
            const canDispatch = showDispatch && d.kitchenStatus === "listo" && d.phone;
            return (
              <button key={d.id} onClick={() => onOpen(d.id)} style={{ textAlign: "left", background: st.grad, border: "none", borderRadius: 14, padding: 16, cursor: "pointer", color: st.text, boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong style={{ fontSize: 16 }}>{d.customer}</strong>
                  <span style={{ fontSize: 20 }}>{st.icon}</span>
                </div>
                {d.address && <p style={{ margin: "6px 0 2px", fontSize: 12, opacity: 0.9 }}>📍 {d.address}</p>}
                {d.phone && <p style={{ margin: "2px 0 8px", fontSize: 12, opacity: 0.9 }}>📞 {d.phone}</p>}
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, background: "rgba(255,255,255,0.3)", display: "inline-block", padding: "3px 10px", borderRadius: 20 }}>{st.label}</div>
                {canDispatch && (
                  <div
                    onClick={(e) => sendDispatchWhatsapp(d, e)}
                    style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#25D366", color: "#fff", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
                  >
                    📱 Avisar por WhatsApp
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🛵 Delivery &amp; Para llevar</h2>
        <button onClick={onNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #C1272D, #E8A33D)", color: "#fff", fontWeight: 800, cursor: "pointer", boxShadow: "0 3px 8px rgba(193,39,45,0.3)" }}>
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>
      {activos.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#8a7a63" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛵</div>
          <p>No hay pedidos activos.</p>
        </div>
      )}
      {activos.length > 0 && (
        <>
          <Section title="Delivery" icon="🛵" list={delivery} showDispatch />
          <Section title="Para llevar" icon="🥡" list={pickup} />
        </>
      )}
    </div>
  );
}

function NewDeliveryModal({ onCreate, onClose, pickupCount }) {
  const [type, setType] = useState("delivery");
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const valid = type === "delivery" ? customer && address : true;

  function handleCreate() {
    if (type === "pickup") {
      onCreate({ type: "pickup", customer: `Para llevar #${pickupCount + 1}`, phone: "", address: "" });
    } else {
      onCreate({ type: "delivery", customer, phone: "", address });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#FFF8ED", borderRadius: 12, width: "100%", maxWidth: 380, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Nuevo pedido</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setType("delivery")} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: type === "delivery" ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0", color: type === "delivery" ? "#fff" : "#5a4c3a" }}>🛵 Delivery</button>
          <button onClick={() => setType("pickup")} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: type === "pickup" ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0", color: type === "pickup" ? "#fff" : "#5a4c3a" }}>🥡 Para llevar</button>
        </div>
        {type === "delivery" ? (
          <>
            <label style={lbl}>Nombre del cliente</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inp} />
            <label style={lbl}>Dirección</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} style={inp} />
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#8a7a63", margin: "10px 0" }}>No se necesita ningún dato — solo confirma para crear el pedido.</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer" }}>Cancelar</button>
          <button disabled={!valid} onClick={handleCreate} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: valid ? 1 : 0.5 }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientesView({ salesLog }) {
  const [expanded, setExpanded] = useState(null);

  const customers = useMemo(() => {
    const map = {};
    salesLog.filter((s) => s.kind === "delivery" && s.ref).forEach((s) => {
      const key = s.ref;
      if (!map[key]) map[key] = { name: s.ref, orders: [], total: 0 };
      map[key].orders.push(s);
      map[key].total += s.total;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [salesLog]);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👥 Historial de Clientes</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 16 }}>
        Agrupa automáticamente los pedidos de Delivery y Para llevar por nombre de cliente, con lo que ha comprado cada vez.
      </p>

      {customers.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#8a7a63" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          <p>Aún no hay pedidos de delivery o para llevar registrados.</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {customers.map((c) => {
          const isOpen = expanded === c.name;
          return (
            <div key={c.name} style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, overflow: "hidden", boxShadow: "0 3px 8px rgba(0,0,0,0.06)" }}>
              <button
                onClick={() => setExpanded(isOpen ? null : c.name)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(c.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7a63" }}>{c.orders.length} pedido{c.orders.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 800, color: "#C1272D", fontSize: 15 }}>{money(c.total)}</div>
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #F0E8D8" }}>
                  {c.orders.slice().reverse().map((o) => (
                    <div key={o.id} style={{ padding: "10px 0", borderBottom: "1px solid #F5EEE0", fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>{new Date(o.time).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span style={{ fontWeight: 800 }}>{money(o.total)}</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, color: "#8a7a63" }}>
                        {o.items.map((it) => <li key={it.menuId}>{it.qty}x {it.name}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PromoView({ promotions, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Promociones</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0 }}>Agrega ofertas o combos temporales — aparecen en una pestaña extra al armar pedidos, sin tocar el menú fijo.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input placeholder="Nombre de la promoción (ej: Combo Familiar)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, maxWidth: 260 }} />
        <input placeholder="Precio" type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inp, maxWidth: 120 }} />
        <button
          disabled={!name || !price}
          onClick={() => { onAdd({ name, price: Number(price) }); setName(""); setPrice(""); }}
          style={{ padding: "0 16px", border: "none", borderRadius: 6, background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: name && price ? 1 : 0.5 }}
        >
          Agregar promoción
        </button>
      </div>

      {promotions.length === 0 && <p style={{ color: "#8a7a63" }}>No hay promociones activas por ahora.</p>}
      {promotions.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 8, background: "#fff", border: "1px solid #F0997B", borderRadius: 8 }}>
          <span style={{ fontWeight: 700 }}>🏷️ {p.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, color: "#C1272D" }}>{money(p.price)}</span>
            <button onClick={() => onDelete(p.id)} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer" }}><X size={18} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuBoardView({ promotions, menuItems, menuCats, kiosk }) {
  const activeItems = menuItems.filter((m) => m.active !== false);
  const catsWithItems = menuCats.filter((c) => activeItems.some((m) => m.cat === c.name));
  const GOLD = "#F2C879";
  const CREAM = "#F7F0E4";
  const INK = "#0F0C09";
  const EMBER = "#C1272D";
  const AMBER = "#E8A33D";
  const tickerMsgs = ["HECHO AL MOMENTO", "PÍDELO PICANTE", "DELIVERY DISPONIBLE", "MASATEPE · MASAYA", "SABOR CASERO DE VERDAD"];

  const slides = [
    ...catsWithItems.map((c) => ({ type: "cat", cat: c })),
    ...(promotions && promotions.length > 0 ? [{ type: "promo" }] : []),
  ];

  const SLIDE_SECONDS = 9;
  const [slide, setSlide] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const iv = setInterval(() => { setSlide((s) => (s + 1) % slides.length); setTick(0); }, SLIDE_SECONDS * 1000);
    return () => clearInterval(iv);
  }, [slides.length]);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => Math.min(100, t + (100 / (SLIDE_SECONDS * 10)))), 100);
    return () => clearInterval(iv);
  }, [slide]);

  const current = slides[Math.min(slide, slides.length - 1)] || null;
  const c = current && current.type === "cat" ? current.cat : null;
  const accent = c ? avatarColor(c.name) : GOLD;
  const items = c ? activeItems.filter((m) => m.cat === c.name) : [];
  const isPromoSlide = current && current.type === "promo";

  return (
    <div style={{
      background: INK,
      borderRadius: kiosk ? 0 : 16,
      height: "100%", width: "100%",
      display: "flex", flexDirection: "column",
      overflow: "hidden", boxSizing: "border-box",
      fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        @keyframes mbBgFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mbKickerIn { from { opacity: 0; letter-spacing: 8px; } to { opacity: 1; letter-spacing: 4px; } }
        @keyframes mbTitleIn { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mbRuleIn { from { width: 0; opacity: 0; } to { width: var(--rule-w, 90px); opacity: 1; } }
        @keyframes mbRowIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mbWatermarkDrift { 0% { transform: translate(0,0) rotate(-6deg) scale(1); } 100% { transform: translate(-1.5%,-1%) rotate(-4deg) scale(1.03); } }
        @keyframes mbCardIn { from { opacity: 0; transform: translateY(18px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mbTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes mbPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes mbShine { 0% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
        @keyframes mbBadgeGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(242,200,121,0.4); } 50% { box-shadow: 0 0 0 10px rgba(242,200,121,0); } }
      `}</style>

      {/* Fondo ambientado con el color de la categoría actual */}
      <div key={"bg" + slide} style={{
        position: "absolute", inset: 0, zIndex: 0, animation: "mbBgFade 0.8s ease",
        background: `radial-gradient(ellipse 90% 60% at 50% 0%, ${accent}3D, transparent 65%), radial-gradient(ellipse 70% 50% at 100% 100%, ${accent}22, transparent 60%), ${INK}`,
      }} />
      {/* Marca de agua grande del ícono de la categoría */}
      {c && (
        <div key={"wm" + slide} style={{
          position: "absolute", right: "-6%", top: "8%", fontSize: "min(46vh, 40vw)", opacity: 0.05, zIndex: 0,
          animation: "mbWatermarkDrift 9s ease-in-out infinite alternate, mbBgFade 1s ease",
          filter: "grayscale(1) brightness(2)",
        }}>{c.icon}</div>
      )}

      {/* Barra superior minimalista */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "clamp(14px, 2vh, 24px) clamp(24px, 3.2vw, 48px) clamp(6px, 1vh, 10px)", flexShrink: 0, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "clamp(19px, 2vw, 27px)" }}>🍔🍗</span>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(14px, 1.5vw, 20px)", color: CREAM, letterSpacing: 0.2 }}>{RESTAURANT_NAME}</div>
            <div style={{ fontSize: "clamp(7.5px, 0.7vw, 9.5px)", color: "#8A7A62", letterSpacing: 2.5, fontWeight: 700 }}>MASATEPE · MASAYA · NICARAGUA</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", animation: "mbPulse 1.6s infinite" }} />
          <span style={{ fontSize: "clamp(8px, 0.75vw, 10px)", color: "#7FCB93", fontWeight: 700, letterSpacing: 2 }}>MENÚ DIGITAL</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(24px, 4vw, 64px)", position: "relative", zIndex: 2 }}>

        {isPromoSlide ? (
          <div key="promo-slide">
            <div style={{ textAlign: "center", marginBottom: "clamp(20px, 3.2vh, 40px)" }}>
              <div style={{ fontSize: "clamp(9px, 0.85vw, 12px)", fontWeight: 800, color: GOLD, letterSpacing: 4, animation: "mbKickerIn 0.6s ease both" }}>OFERTAS ESPECIALES</div>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(30px, 4.4vw, 62px)", color: CREAM, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.02, marginTop: 6, animation: "mbTitleIn 0.6s ease 0.08s both" }}>
                Combos <span style={{ color: EMBER }}>de Hoy</span>
              </div>
              <div style={{ "--rule-w": "110px", height: 3, width: 110, background: `linear-gradient(90deg, ${EMBER}, ${AMBER})`, margin: "clamp(12px, 1.8vh, 18px) auto 0", borderRadius: 3, animation: "mbRuleIn 0.6s ease 0.2s both" }} />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: promotions.length > 3 ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "clamp(14px, 2vw, 24px)",
              maxWidth: 1100, margin: "0 auto", width: "100%",
            }}>
              {promotions.map((p, i) => (
                <div key={p.id} style={{
                  position: "relative", overflow: "hidden",
                  background: "linear-gradient(155deg, rgba(38,32,25,0.9), rgba(20,16,12,0.9))",
                  backdropFilter: "blur(6px)",
                  border: `1px solid ${GOLD}2A`, borderRadius: 20,
                  padding: "clamp(18px, 2.4vh, 26px) clamp(20px, 2.4vw, 28px)",
                  animation: `mbCardIn 0.5s ease ${0.15 + i * 0.08}s both`,
                  boxShadow: "0 18px 38px rgba(0,0,0,0.4)",
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
                    background: "linear-gradient(100deg, transparent 40%, rgba(242,200,121,0.07) 50%, transparent 60%)",
                    backgroundSize: "250% 100%", animation: "mbShine 5s linear infinite",
                  }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, position: "relative" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: "inline-block", fontSize: "clamp(8.5px, 0.78vw, 10.5px)", fontWeight: 800, letterSpacing: 1.5,
                        color: "#FF9A8B", background: "rgba(193,39,45,0.18)", padding: "3px 11px", borderRadius: 20, marginBottom: 11,
                      }}>COMBO ESPECIAL</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(17px, 2vw, 25px)", color: CREAM, lineHeight: 1.25 }}>{p.name}</div>
                    </div>
                    <div style={{
                      flexShrink: 0, textAlign: "center", background: `linear-gradient(160deg, ${AMBER}, ${EMBER})`,
                      borderRadius: 14, padding: "clamp(9px, 1.2vh, 13px) clamp(13px, 1.5vw, 19px)",
                      animation: "mbBadgeGlow 2.6s infinite",
                    }}>
                      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(17px, 2vw, 26px)", color: "#fff", lineHeight: 1 }}>{money(p.price)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : c && (
          <div key={c.name}>
            <div style={{ textAlign: "center", marginBottom: "clamp(20px, 3.4vh, 42px)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: "clamp(9px, 0.85vw, 12px)", fontWeight: 800, color: accent, letterSpacing: 4, animation: "mbKickerIn 0.6s ease both" }}>
                <span style={{ fontSize: "clamp(16px, 1.6vw, 22px)" }}>{c.icon}</span> CATEGORÍA DESTACADA
              </div>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(32px, 4.8vw, 68px)", color: CREAM, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.02, marginTop: 8, animation: "mbTitleIn 0.6s ease 0.08s both", textShadow: `0 6px 30px ${accent}55` }}>
                {c.name}
              </div>
              <div style={{ "--rule-w": "90px", height: 3, width: 90, background: `linear-gradient(90deg, ${accent}, ${GOLD})`, margin: "clamp(12px, 1.8vh, 18px) auto 0", borderRadius: 3, animation: "mbRuleIn 0.6s ease 0.2s both" }} />
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: items.length > 5 ? "1fr 1fr" : "1fr",
              gap: "0 clamp(36px, 4.5vw, 70px)",
              maxWidth: items.length > 5 ? 1180 : 780,
              margin: "0 auto", width: "100%",
            }}>
              {items.map((m, i) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "baseline", gap: 12,
                  padding: "clamp(9px, 1.5vh, 16px) clamp(6px,0.8vw,10px)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  animation: `mbRowIn 0.45s ease ${0.2 + i * 0.05}s both`,
                }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(16px, 1.85vw, 25px)", color: CREAM, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                  <span style={{ flex: 1, borderBottom: "2px dotted rgba(242,200,121,0.22)", marginBottom: 6, minWidth: 12 }} />
                  <span style={{ fontFamily: "'Anton', sans-serif", fontSize: "clamp(15px, 1.7vw, 23px)", color: GOLD, whiteSpace: "nowrap" }}>{money(m.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Indicador de progreso */}
      <div style={{ padding: "clamp(10px, 1.6vh, 18px) clamp(24px, 3.2vw, 48px) clamp(6px, 1vh, 10px)", flexShrink: 0, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 6, maxWidth: 640, margin: "0 auto" }}>
          {slides.map((sl, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, background: sl.type === "promo" ? EMBER : GOLD,
                width: i < slide ? "100%" : i === slide ? `${tick}%` : "0%",
                transition: i === slide ? "none" : "width 0.3s ease",
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Ticker inferior */}
      <div style={{ borderTop: "1px solid rgba(242,200,121,0.12)", background: "rgba(0,0,0,0.4)", padding: "clamp(7px, 1.1vh, 12px) 0", overflow: "hidden", flexShrink: 0, width: "100%", boxSizing: "border-box", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", width: "max-content", animation: "mbTicker 24s linear infinite" }}>
          {[...tickerMsgs, ...tickerMsgs, ...tickerMsgs].map((msg, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 2vw, 34px)", fontSize: "clamp(9.5px, 0.9vw, 12.5px)", color: "#8A7A62", letterSpacing: 2.5, fontWeight: 700, paddingRight: "clamp(16px, 2vw, 34px)", whiteSpace: "nowrap" }}>
              {msg} <span style={{ color: GOLD }}>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
function HistorialView({ salesLog, expensesLog, payments, onDeleteSale, onDeleteExpense }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quincenaMonth, setQuincenaMonth] = useState(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 7);
  });

  const inRange = (isoTime) => {
    const t = isoTime.slice(0, 10);
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  };

  const filteredSales = salesLog.filter((s) => inRange(s.time)).slice().reverse();
  const filteredExpenses = expensesLog.filter((e) => inRange(e.time)).slice().reverse();
  const totalIncome = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalSpent = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const [qYear, qMonth] = quincenaMonth.split("-").map(Number);
  const lastDay = new Date(qYear, qMonth, 0).getDate();
  function sumInDayRange(list, dayStart, dayEnd, key) {
    return (list || [])
      .filter((x) => {
        const t = new Date(x.time);
        if (t.getFullYear() !== qYear || t.getMonth() !== qMonth - 1) return false;
        const day = t.getDate();
        return day >= dayStart && day <= dayEnd;
      })
      .reduce((sum, x) => sum + Number(key === "sale" ? x.total : (key === "pay" ? x.amount : x.amount)), 0);
  }
  const q1Sold = sumInDayRange(salesLog, 1, 15, "sale");
  const q1Spent = sumInDayRange(expensesLog, 1, 15, "exp");
  const q1Payroll = sumInDayRange(payments, 1, 15, "pay");
  const q2Sold = sumInDayRange(salesLog, 16, lastDay, "sale");
  const q2Spent = sumInDayRange(expensesLog, 16, lastDay, "exp");
  const q2Payroll = sumInDayRange(payments, 16, lastDay, "pay");
  const monthLabel = new Date(qYear, qMonth - 1, 1).toLocaleDateString("es-NI", { month: "long", year: "numeric" });

  const monthSalesAll = salesLog.filter((s) => { const t = new Date(s.time); return t.getFullYear() === qYear && t.getMonth() === qMonth - 1; });
  const monthExpensesAll = expensesLog.filter((e) => { const t = new Date(e.time); return t.getFullYear() === qYear && t.getMonth() === qMonth - 1; });
  const monthIncomeAll = q1Sold + q2Sold;
  const monthSpentAll = q1Spent + q2Spent;
  const monthInsumosAll = monthExpensesAll.filter((e) => (e.category || "Otro") === "Insumos").reduce((sum, e) => sum + Number(e.amount), 0);
  const monthOtrosAll = monthSpentAll - monthInsumosAll;
  const monthPayrollAll = q1Payroll + q2Payroll;
  const monthRealProfitAll = monthIncomeAll - monthSpentAll - monthPayrollAll;
  const monthFoodCostPctAll = monthIncomeAll > 0 ? Math.round((monthInsumosAll / monthIncomeAll) * 100) : 0;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🗄️ Historial permanente</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 16 }}>
        Este registro nunca se borra, aunque uses los botones de "Borrar" en Reportes — queda como respaldo completo de todo lo vendido y gastado.
      </p>

      <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>📆 Control quincenal — {monthLabel}</div>
          <input type="month" value={quincenaMonth} onChange={(e) => setQuincenaMonth(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 12, padding: 16, color: "#fff" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", letterSpacing: 0.5, marginBottom: 8 }}>QUINCENA 1 (día 1 al 15)</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ opacity: 0.8 }}>Vendido</span><span style={{ fontWeight: 800 }}>{money(q1Sold)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ opacity: 0.8 }}>Gastado</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q1Spent)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ opacity: 0.8 }}>Nómina</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q1Payroll)}</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Ganancia real</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: q1Sold - q1Spent - q1Payroll >= 0 ? "#00E676" : "#FF5252" }}>{money(q1Sold - q1Spent - q1Payroll)}</span>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 12, padding: 16, color: "#fff" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", letterSpacing: 0.5, marginBottom: 8 }}>QUINCENA 2 (día 16 al {lastDay})</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ opacity: 0.8 }}>Vendido</span><span style={{ fontWeight: 800 }}>{money(q2Sold)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ opacity: 0.8 }}>Gastado</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q2Spent)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ opacity: 0.8 }}>Nómina</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q2Payroll)}</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Ganancia real</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: q2Sold - q2Spent - q2Payroll >= 0 ? "#00E676" : "#FF5252" }}>{money(q2Sold - q2Spent - q2Payroll)}</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, background: "#FFF3E0", border: "1px solid #F2C879", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 13, flexWrap: "wrap", gap: 6 }}>
          <span style={{ color: "#5a4c3a", fontWeight: 700 }}>Total del mes ({monthLabel})</span>
          <span style={{ fontWeight: 800, color: "#2B2118" }}>{money(q1Sold + q2Sold)} vendido · -{money(q1Spent + q2Spent)} gastado · -{money(q1Payroll + q2Payroll)} nómina</span>
        </div>
      </div>

      <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 16, padding: 18, marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", letterSpacing: 0.5, marginBottom: 10 }}>💎 BALANCE DETALLADO DEL MES — {monthLabel.toUpperCase()}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10, fontSize: 11 }}>
          <div><div style={{ color: "#C9BBA3" }}>Ventas</div><div style={{ fontWeight: 800, fontSize: 14 }}>{money(monthIncomeAll)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Insumos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthInsumosAll)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Otros gastos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthOtrosAll)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Nómina pagada</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthPayrollAll)}</div></div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>= Ganancia real del mes</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: monthRealProfitAll >= 0 ? "#00E676" : "#FF5252" }}>{money(monthRealProfitAll)}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, fontSize: 11, color: "#C9BBA3" }}>
          <span>🧾 {monthSalesAll.length} venta{monthSalesAll.length !== 1 ? "s" : ""}</span>
          <span>🎟️ Ticket promedio: {money(monthSalesAll.length > 0 ? monthIncomeAll / monthSalesAll.length : 0)}</span>
          {monthIncomeAll > 0 && <span>🍗 Costo insumos: {monthFoodCostPctAll}% {monthFoodCostPctAll > 35 ? "⚠️" : "✅"}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#8a7a63" }}>Desde</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
        <label style={{ fontSize: 12, fontWeight: 700, color: "#8a7a63" }}>Hasta</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} style={{ fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "#8a7a63" }}>Limpiar filtro</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={statCard}><div style={statLabel}>Ingresos totales</div><div style={statValue}>{money(totalIncome)}</div></div>
        <div style={statCard}><div style={statLabel}>Gastos totales</div><div style={{ ...statValue, color: "#C1272D" }}>{money(totalSpent)}</div></div>
        <div style={statCard}><div style={statLabel}>Neto</div><div style={statValue}>{money(totalIncome - totalSpent)}</div></div>
        <div style={statCard}><div style={statLabel}>Ventas registradas</div><div style={statValue}>{filteredSales.length}</div></div>
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Ventas</h3>
      {filteredSales.length === 0 && <p style={{ color: "#8a7a63" }}>Sin ventas en este rango.</p>}
      {filteredSales.map((s) => (
        <div key={s.id} style={{ padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{s.ref} · {s.method}{s.discountAmount > 0 ? ` · 🏷️ -${money(s.discountAmount)}` : ""}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong>{money(s.total)}</strong>
              <button onClick={() => { if (window.confirm("¿Borrar esta venta del historial permanente?")) onDeleteSale(s.id); }} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer", padding: 2 }}><X size={14} /></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#8a7a63" }}>{new Date(s.time).toLocaleString("es-NI")}</div>
        </div>
      ))}

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 20 }}>Gastos</h3>
      {filteredExpenses.length === 0 && <p style={{ color: "#8a7a63" }}>Sin gastos en este rango.</p>}
      {filteredExpenses.map((e) => (
        <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{e.description}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ color: "#C1272D" }}>-{money(e.amount)}</strong>
              <button onClick={() => { if (window.confirm("¿Borrar este gasto del historial permanente?")) onDeleteExpense(e.id); }} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer", padding: 2 }}><X size={14} /></button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#8a7a63" }}>{new Date(e.time).toLocaleString("es-NI")}</div>
        </div>
      ))}
    </div>
  );
}

const AVATAR_COLORS = ["#C1272D", "#2E7D32", "#E8A33D", "#1565C0", "#6A1B9A", "#00838F"];
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function seniorityLabel(hireDate) {
  if (!hireDate) return null;
  const days = Math.floor((Date.now() - new Date(hireDate).getTime()) / 86400000);
  if (days < 30) return `${days} día${days !== 1 ? "s" : ""}`;
  if (days < 365) return `${Math.floor(days / 30)} mes${Math.floor(days / 30) !== 1 ? "es" : ""}`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return `${years} año${years !== 1 ? "s" : ""}${months ? ` ${months} mes${months !== 1 ? "es" : ""}` : ""}`;
}

const ROLES = ["Cocinero/a", "Mesero/a", "Cajero/a", "Repartidor/a", "Personal"];
const ROLE_ICONS = { "Cocinero/a": "👨‍🍳", "Mesero/a": "🧑‍🍽️", "Cajero/a": "💵", "Repartidor/a": "🛵", "Personal": "👤" };

function printPayStub(employee, payment) {
  const bruto = payment.bruto != null ? payment.bruto : payment.amount;
  const bono = payment.bono || 0;
  const deducciones = payment.deducciones || 0;
  const days = payment.days || null;
  const neto = payment.amount;
  const payDate = new Date(payment.time);

  const html = `
    <html><head><title>Recibo de Pago</title><style>
      body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; padding: 26px; color: #2B2118; }
      .header { text-align: center; margin-bottom: 2px; }
      .logo { font-size: 36px; }
      .name { font-size: 18px; font-weight: 800; color: #C1272D; margin-top: 4px; }
      .sub { text-align: center; font-size: 11px; color: #666; letter-spacing: 1px; margin-bottom: 18px; }
      .title { text-align: center; background: #2B2118; color: #F2C879; font-weight: 800; padding: 9px; border-radius: 8px; letter-spacing: 1px; margin-bottom: 18px; font-size: 13px; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #ddd; font-size: 13px; }
      .row strong { font-weight: 800; }
      .section-title { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #8a7a63; margin: 18px 0 4px; letter-spacing: 0.5px; }
      .neg { color: #C1272D; font-weight: 700; }
      .big { font-size: 22px; font-weight: 800; text-align: center; margin: 18px 0; background: #F2C879; padding: 16px; border-radius: 10px; letter-spacing: 0.5px; }
      .sign { margin-top: 55px; display: flex; justify-content: space-between; gap: 24px; }
      .sign div { flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #5a4c3a; }
      hr { border: none; border-top: 2px dashed #333; margin: 14px 0; }
      @page { margin: 14mm; }
    </style></head><body>
      <div class="header">
        <div class="logo">🍔🍗</div>
        <div class="name">${RESTAURANT_NAME}</div>
      </div>
      <div class="sub">MASATEPE · MASAYA · NICARAGUA</div>
      <div class="title">RECIBO DE PAGO A EMPLEADO</div>

      <div class="row"><span>Empleado</span><strong>${employee.name}</strong></div>
      <div class="row"><span>Puesto</span><span>${employee.role || "Personal"}</span></div>
      ${employee.phone ? `<div class="row"><span>Teléfono</span><span>${employee.phone}</span></div>` : ""}
      <div class="row"><span>Fecha de pago</span><span>${payDate.toLocaleDateString("es-NI", { day: "numeric", month: "long", year: "numeric" })}</span></div>

      <div class="section-title">Detalle del pago</div>
      ${days ? `<div class="row"><span>Días trabajados</span><span>${days}</span></div>` : ""}
      <div class="row"><span>Pago por día</span><span>${money(employee.dailyWage)}</span></div>
      ${days ? `<div class="row"><span>Subtotal (${days} × ${money(employee.dailyWage)})</span><span>${money(days * employee.dailyWage)}</span></div>` : ""}
      ${bono > 0 ? `<div class="row"><span>Bono / Comisión</span><span>+${money(bono)}</span></div>` : ""}
      <div class="row"><strong>Total bruto</strong><strong>${money(bruto)}</strong></div>

      ${deducciones > 0 ? `<div class="section-title">Deducciones</div><div class="row"><span>INSS / Otras deducciones</span><span class="neg">-${money(deducciones)}</span></div>` : ""}

      ${payment.note ? `<div class="section-title">Concepto</div><div class="row"><span>${payment.note}</span><span></span></div>` : ""}

      <div class="big">NETO A PAGAR: ${money(neto)}</div>

      <div class="sign">
        <div>Firma del empleado</div>
        <div>Firma del empleador</div>
      </div>

      <div style="text-align:center;font-size:10px;color:#888;margin-top:26px;">Generado el ${new Date().toLocaleString("es-NI")}</div>
    </body></html>`;
  const w = window.open("", "_blank", "width=400,height=680");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function PaydayBanner({ employees, payments, clockRecords }) {
  const now = new Date();
  const today = now.getDate();
  const lastDayOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isSecondPayday = today === 30 || (today === lastDayOfThisMonth && lastDayOfThisMonth < 30);
  const isFirstPayday = today === 15;
  if (!isFirstPayday && !isSecondPayday) return null;
  const quincenaLabel = isFirstPayday ? "Quincena 1 (día 1 al 15)" : "Quincena 2 (día 16 al fin de mes)";

  const activeEmployees = employees.filter((e) => e.active !== false);
  function owedFor(emp) {
    const empPayments = payments.filter((p) => p.employeeName === emp.name).slice().sort((a, b) => new Date(a.time) - new Date(b.time));
    const last = empPayments[empPayments.length - 1];
    const cutoff = last ? new Date(last.time) : null;
    const empClock = clockRecords.filter((r) => r.employee === emp.name);
    const pendingDays = cutoff ? empClock.filter((r) => new Date(r.time) > cutoff).length : empClock.length;
    return pendingDays * (emp.dailyWage || 0);
  }
  const pending = activeEmployees.map((e) => ({ emp: e, owed: owedFor(e) })).filter((x) => x.owed > 0);
  const total = pending.reduce((s, x) => s + x.owed, 0);

  return (
    <div style={{ background: "linear-gradient(135deg, #C1272D, #E8A33D)", borderRadius: 14, padding: 18, marginBottom: 20, color: "#fff", boxShadow: "0 6px 18px rgba(193,39,45,0.35)" }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>📅 ¡Hoy es día de pago!</div>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 8, letterSpacing: 0.3 }}>{quincenaLabel.toUpperCase()}</div>
      {pending.length === 0 ? (
        <div style={{ fontSize: 13 }}>Todos los empleados activos están al día ✅</div>
      ) : (
        <>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            {pending.length} empleado{pending.length !== 1 ? "s" : ""} con pago pendiente · Total: <strong>{money(total)}</strong>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pending.map((x) => (
              <span key={x.emp.id} style={{ background: "rgba(255,255,255,0.22)", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                {x.emp.name}: {money(x.owed)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PaymentForm({ employee, pendingDays, onPay }) {
  const [days, setDays] = useState(pendingDays || 0);
  const [pago, setPago] = useState(String((pendingDays || 0) * (employee.dailyWage || 0) || employee.dailyWage || ""));
  const [bono, setBono] = useState("");
  const [deducciones, setDeducciones] = useState("");
  const [note, setNote] = useState("");
  const bruto = (Number(pago) || 0) + (Number(bono) || 0);
  const neto = bruto - (Number(deducciones) || 0);

  return (
    <div style={{ background: "#FFF3E0", border: "1px solid #F2C879", borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>💵 Registrar pago detallado</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Días trabajados</label>
          <input
            type="number"
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              setPago(String((Number(e.target.value) || 0) * (employee.dailyWage || 0)));
            }}
            style={{ ...inp, maxWidth: 100 }}
          />
        </div>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>💰 Pago / Sueldo (C$)</label>
          <input type="number" value={pago} onChange={(e) => setPago(e.target.value)} style={{ ...inp, maxWidth: 130, fontWeight: 800, border: "1px solid #2E7D32" }} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: "#8a7a63", marginTop: -4, marginBottom: 10 }}>
        Sugerido: {days || 0} día{days !== 1 ? "s" : ""} × {money(employee.dailyWage)}/día. Podés cambiar el monto libremente.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Bono (opcional)</label>
          <input type="number" placeholder="0" value={bono} onChange={(e) => setBono(e.target.value)} style={{ ...inp, maxWidth: 120 }} />
        </div>
        <div>
          <label style={{ ...lbl, marginTop: 0 }}>Deducciones (INSS, otros)</label>
          <input type="number" placeholder="0" value={deducciones} onChange={(e) => setDeducciones(e.target.value)} style={{ ...inp, maxWidth: 150 }} />
        </div>
      </div>
      <input placeholder="Nota (ej: quincena 1-15 julio)" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, marginBottom: 10 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7a63", marginBottom: 2 }}>
        <span>Pago (sueldo)</span><span>{money(Number(pago) || 0)}</span>
      </div>
      {Number(bono) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2E7D32", marginBottom: 2 }}>
          <span>+ Bono</span><span>{money(Number(bono))}</span>
        </div>
      )}
      {Number(deducciones) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#C1272D", marginBottom: 2 }}>
          <span>− Deducciones</span><span>{money(Number(deducciones))}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, marginTop: 8, marginBottom: 12, borderTop: "1px dashed #E5D9C3", paddingTop: 8 }}>
        <span>Neto a pagar</span><span style={{ color: "#2E7D32" }}>{money(neto)}</span>
      </div>
      <button
        disabled={neto <= 0}
        onClick={() => {
          onPay({ amount: neto, note, days: Number(days) || 0, bruto, bono: Number(bono) || 0, deducciones: Number(deducciones) || 0 });
          setBono(""); setDeducciones(""); setNote("");
        }}
        style={{ width: "100%", padding: 12, border: "none", borderRadius: 8, background: neto > 0 ? "#2E7D32" : "#C9D6E0", color: "#fff", fontWeight: 800, cursor: neto > 0 ? "pointer" : "not-allowed", fontSize: 14 }}
      >
        💵 Registrar pago ({money(neto)})
      </button>
    </div>
  );
}

function printPayrollSummary(employees, payments, clockRecords) {
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  function paidInRange(empName, dayStart, dayEnd) {
    return payments
      .filter((p) => p.employeeName === empName && p.time.slice(0, 7) === monthKey)
      .filter((p) => {
        const day = new Date(p.time).getDate();
        return day >= dayStart && day <= dayEnd;
      })
      .reduce((s, p) => s + p.amount, 0);
  }

  const rows = employees.map((emp) => {
    const q1Paid = paidInRange(emp.name, 1, 15);
    const q2Paid = paidInRange(emp.name, 16, lastDay);
    const empClock = clockRecords.filter((r) => r.employee === emp.name);
    const lateCount = empClock.filter((r) => r.late).length;
    const punctuality = empClock.length > 0 ? Math.round(((empClock.length - lateCount) / empClock.length) * 100) : 100;
    return `<tr>
      <td>${emp.name}</td>
      <td>${emp.role || "Personal"}</td>
      <td style="text-align:right">${money(emp.dailyWage)}</td>
      <td style="text-align:center">${punctuality}%</td>
      <td style="text-align:right">${money(q1Paid)}</td>
      <td style="text-align:right">${money(q2Paid)}</td>
      <td style="text-align:right"><strong>${money(q1Paid + q2Paid)}</strong></td>
    </tr>`;
  }).join("");
  const totalQ1 = employees.reduce((sum, emp) => sum + paidInRange(emp.name, 1, 15), 0);
  const totalQ2 = employees.reduce((sum, emp) => sum + paidInRange(emp.name, 16, lastDay), 0);

  const html = `
    <html><head><title>Reporte de Nómina</title><style>
      body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; padding: 20px; color: #2B2118; }
      h1 { font-size: 17px; text-align: center; margin-bottom: 2px; color: #C1272D; }
      .sub { text-align: center; font-size: 11px; color: #666; letter-spacing: 1px; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      td, th { padding: 8px 6px; border-bottom: 1px solid #eee; text-align: left; }
      th { font-size: 10px; text-transform: uppercase; color: #8a7a63; background: #FBF2E4; }
      .total td { border: none; font-weight: 800; font-size: 14px; padding-top: 14px; background: #F2C879; }
      hr { border: none; border-top: 2px dashed #333; margin: 14px 0; }
      @page { margin: 12mm; }
    </style></head><body>
      <h1>🍔🍗 ${RESTAURANT_NAME}</h1>
      <div class="sub">REPORTE DE NÓMINA QUINCENAL · ${now.toLocaleDateString("es-NI", { month: "long", year: "numeric" }).toUpperCase()}</div>
      <hr/>
      <table>
        <tr><th>Empleado</th><th>Puesto</th><th style="text-align:right">Pago/día</th><th style="text-align:center">Puntualidad</th><th style="text-align:right">Quincena 1 (1-15)</th><th style="text-align:right">Quincena 2 (16-${lastDay})</th><th style="text-align:right">Total mes</th></tr>
        ${rows}
        <tr class="total"><td colspan="4">TOTALES</td><td style="text-align:right">${money(totalQ1)}</td><td style="text-align:right">${money(totalQ2)}</td><td style="text-align:right">${money(totalQ1 + totalQ2)}</td></tr>
      </table>
      <hr/>
      <div style="text-align:center;font-size:10px;color:#888;margin-top:10px;">Generado ${new Date().toLocaleString("es-NI")}</div>
    </body></html>`;
  const w = window.open("", "_blank", "width=420,height=650");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function AttendanceMini({ employeeName, clockRecords }) {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const rec = clockRecords.find((r) => r.employee === employeeName && new Date(r.time).toDateString() === dayStr);
    days.push({ date: d, status: rec ? (rec.late ? "late" : "ontime") : "none" });
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8a7a63", marginBottom: 6 }}>📅 Asistencia (últimos 14 días)</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.date.toLocaleDateString("es-NI")}: ${d.status === "ontime" ? "A tiempo" : d.status === "late" ? "Tarde" : "No marcó"}`}
            style={{
              width: 18, height: 18, borderRadius: 4,
              background: d.status === "ontime" ? "#26A65B" : d.status === "late" ? "#E53935" : "#E5D9C3",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EmpleadosView({ employees, clockRecords, payments, onAdd, onClockIn, onAddPayment, onDeletePayment, onToggleActive, onDeleteEmployee, onUpdateEmployee }) {
  const [name, setName] = useState("");
  const [wage, setWage] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [payNote, setPayNote] = useState({});
  const today = todayStr();
  const monthKey = new Date().toISOString().slice(0, 7);
  const todayRecords = clockRecords.filter((r) => new Date(r.time).toDateString() === today).slice().reverse();

  const monthPayroll = payments.filter((p) => p.time.slice(0, 7) === monthKey).reduce((sum, p) => sum + p.amount, 0);

  function employeeStats(emp) {
    const empPayments = payments.filter((p) => p.employeeName === emp.name).slice().sort((a, b) => new Date(a.time) - new Date(b.time));
    const lastPayment = empPayments[empPayments.length - 1];
    const cutoff = lastPayment ? new Date(lastPayment.time) : null;
    const empClockAll = clockRecords.filter((r) => r.employee === emp.name);
    const pendingDays = cutoff ? empClockAll.filter((r) => new Date(r.time) > cutoff).length : empClockAll.length;
    const owed = pendingDays * (emp.dailyWage || 0);
    const lateCount = empClockAll.filter((r) => r.late).length;
    const punctuality = empClockAll.length > 0 ? Math.round(((empClockAll.length - lateCount) / empClockAll.length) * 100) : 100;
    return { empPayments: empPayments.slice().reverse(), lastPayment, pendingDays, owed, totalPaid: empPayments.reduce((s, p) => s + p.amount, 0), lateCount, totalDays: empClockAll.length, punctuality };
  }

  const activeEmployees = employees.filter((e) => e.active !== false);
  const inactiveEmployees = employees.filter((e) => e.active === false);
  const totalOwedAll = activeEmployees.reduce((sum, emp) => sum + employeeStats(emp).owed, 0);
  const visibleEmployees = (showInactive ? employees : activeEmployees).filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👥 Personal y Nómina</h2>
      <PaydayBanner employees={employees} payments={payments} clockRecords={clockRecords} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 12, color: "#8a7a63", margin: 0 }}>Turno: {SHIFT_START} a {SHIFT_END} (tolerancia {LATE_GRACE_MIN} min)</p>
        {employees.length > 0 && (
          <button onClick={() => printPayrollSummary(employees, payments, clockRecords)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, color: "#8a7a63" }}>
            <Printer size={13} /> Imprimir nómina del mes
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, margin: "14px 0 20px" }}>
        <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#F2C879", fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 4 }}>💰 PAGADO ESTE MES</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{money(monthPayroll)}</div>
        </div>
        <div style={{ background: totalOwedAll > 0 ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "linear-gradient(135deg, #26A65B, #158A4A)", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 4, opacity: 0.9 }}>⏳ PENDIENTE DE PAGAR</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{money(totalOwedAll)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ color: "#8a7a63", fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 4 }}>👥 EQUIPO ACTIVO</div>
          <div style={{ color: "#2B2118", fontWeight: 800, fontSize: 22 }}>{activeEmployees.length}</div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>➕ Agregar nuevo empleado</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRole(r)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: role === r ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0", color: role === r ? "#fff" : "#5a4c3a" }}>
              {ROLE_ICONS[r]} {r}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Nombre del empleado" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, maxWidth: 180 }} />
          <input placeholder="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inp, maxWidth: 150 }} />
          <input placeholder="Pago por día (C$)" type="number" value={wage} onChange={(e) => setWage(e.target.value)} style={{ ...inp, maxWidth: 140 }} />
          <button onClick={() => { onAdd(name, wage, role, phone); setName(""); setWage(""); setPhone(""); }} disabled={!name} style={{ padding: "0 16px", border: "none", borderRadius: 8, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: name ? 1 : 0.5 }}>Agregar</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input placeholder="🔍 Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, maxWidth: 220 }} />
        {inactiveEmployees.length > 0 && (
          <button onClick={() => setShowInactive((s) => !s)} style={{ fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#8a7a63", fontWeight: 700 }}>
            {showInactive ? "Ocultar" : "Ver"} inactivos ({inactiveEmployees.length})
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inp, maxWidth: 220 }}>
          <option value="">Selecciona un empleado</option>
          {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
        </select>
        <button
          disabled={!selected}
          onClick={() => onClockIn(selected)}
          style={{ padding: "10px 16px", border: "none", borderRadius: 8, background: "linear-gradient(135deg, #C1272D, #E8A33D)", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: selected ? 1 : 0.5 }}
        >
          Marcar entrada
        </button>
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginBottom: 10 }}>Equipo</h3>
      {visibleEmployees.length === 0 && <p style={{ color: "#8a7a63" }}>No se encontraron empleados.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {visibleEmployees.map((emp) => {
          const st = employeeStats(emp);
          const isOpen = expanded === emp.id;
          const key = emp.id;
          const isInactive = emp.active === false;
          return (
            <div key={emp.id} style={{ background: isInactive ? "#F5F0E8" : "#fff", border: st.owed > 0 && !isInactive ? "2px solid #E8A33D" : "1px solid #E5D9C3", borderRadius: 14, overflow: "hidden", boxShadow: "0 3px 8px rgba(0,0,0,0.06)", opacity: isInactive ? 0.7 : 1 }}>
              <button
                onClick={() => setExpanded(isOpen ? null : emp.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(emp.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                  {initials(emp.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{emp.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#F3ECE0", color: "#5a4c3a", padding: "2px 8px", borderRadius: 20 }}>{ROLE_ICONS[emp.role] || "👤"} {emp.role || "Personal"}</span>
                    {isInactive && <span style={{ fontSize: 10, fontWeight: 700, background: "#FCE8E8", color: "#C1272D", padding: "2px 8px", borderRadius: 20 }}>Inactivo</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7a63", marginTop: 2 }}>
                    {money(emp.dailyWage)}/día · {st.totalDays} entradas ·
                    <span style={{ color: st.punctuality >= 90 ? "#2E7D32" : st.punctuality >= 70 ? "#C99A1E" : "#C1272D", fontWeight: 700 }}> {st.punctuality}% puntual</span>
                    {emp.hireDate && <span> · Antigüedad: {seniorityLabel(emp.hireDate)}</span>}
                  </div>
                  {emp.phone && <div style={{ fontSize: 11, color: "#8a7a63" }}>📞 {emp.phone}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {st.owed > 0 ? (
                    <>
                      <div style={{ fontWeight: 800, color: "#C1272D", fontSize: 16 }}>{money(st.owed)}</div>
                      <div style={{ fontSize: 10, color: "#C1531F", fontWeight: 700 }}>se le debe · {st.pendingDays} día{st.pendingDays !== 1 ? "s" : ""}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, color: "#2E7D32", fontSize: 15 }}>Al día ✅</div>
                      <div style={{ fontSize: 10, color: "#8a7a63" }}>{money(st.totalPaid)} pagado total</div>
                    </>
                  )}
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #F0E8D8" }}>
                  {editingEmployee === emp.id ? (
                    <EmployeeEditForm
                      employee={emp}
                      onSave={(patch) => { onUpdateEmployee(emp.id, patch); setEditingEmployee(null); }}
                      onCancel={() => setEditingEmployee(null)}
                    />
                  ) : (
                    <>
                      <AttendanceMini employeeName={emp.name} clockRecords={clockRecords} />
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        <button
                          onClick={() => setEditingEmployee(emp.id)}
                          style={{ fontSize: 12, background: "none", border: "1px solid #1565C0", color: "#1565C0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}
                        >
                          ✏️ Editar datos
                        </button>
                        <button
                          onClick={() => onToggleActive(emp.id)}
                          style={{ fontSize: 12, background: "none", border: `1px solid ${isInactive ? "#2E7D32" : "#C1272D"}`, color: isInactive ? "#2E7D32" : "#C1272D", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}
                        >
                          {isInactive ? "✅ Reactivar empleado" : "🚫 Marcar como inactivo"}
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`¿Eliminar a "${emp.name}" por completo? Esto borra al empleado (no su historial de pagos ya registrado) y no se puede deshacer.`)) onDeleteEmployee(emp.id); }}
                          style={{ fontSize: 12, background: "none", border: "1px solid #8a7a63", color: "#8a7a63", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}
                        >
                          🗑️ Eliminar empleado
                        </button>
                      </div>
                    </>
                  )}
                  {!editingEmployee && st.pendingDays > 0 && (
                    <div style={{ fontSize: 12, color: "#8a7a63", margin: "10px 0 0" }}>
                      <strong style={{ color: "#2B2118" }}>{st.pendingDays} día{st.pendingDays !== 1 ? "s" : ""}</strong> trabajado{st.pendingDays !== 1 ? "s" : ""} desde el último pago
                      {st.lastPayment && <span> · Último pago: {new Date(st.lastPayment.time).toLocaleDateString("es-NI")}</span>}
                    </div>
                  )}
                  {!editingEmployee && (
                    <>
                      <PaymentForm
                        employee={emp}
                        pendingDays={st.pendingDays}
                        onPay={(data) => onAddPayment(emp.name, data.amount, data.note, { bruto: data.bruto, bono: data.bono, deducciones: data.deducciones, days: data.days })}
                      />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#8a7a63", marginBottom: 6 }}>Historial de pagos</div>
                      {st.empPayments.length === 0 && <p style={{ fontSize: 12, color: "#C9BBA3" }}>Sin pagos registrados todavía.</p>}
                      {st.empPayments.map((p) => (
                        <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #F5EEE0", fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 700 }}>{money(p.amount)} {p.note && <span style={{ fontWeight: 400, color: "#8a7a63" }}>· {p.note}</span>}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button onClick={() => printPayStub(emp, p)} title="Imprimir recibo" style={{ background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "3px 7px", cursor: "pointer", color: "#8a7a63" }}><Printer size={12} /></button>
                              <button onClick={() => { if (window.confirm("¿Borrar este pago?")) onDeletePayment(p.id); }} style={{ background: "none", border: "none", color: "#C9BBA3", cursor: "pointer" }}><X size={14} /></button>
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: "#C9BBA3", marginTop: 2 }}>{new Date(p.time).toLocaleString("es-NI")}</div>
                          {(p.days || p.bono || p.deducciones) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                              {p.days ? <span style={{ fontSize: 10, background: "#F3ECE0", color: "#5a4c3a", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>📅 {p.days} día{p.days !== 1 ? "s" : ""} × {money(emp.dailyWage)}</span> : null}
                              {p.bono > 0 ? <span style={{ fontSize: 10, background: "#E8F5E9", color: "#2E7D32", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>🎁 Bono {money(p.bono)}</span> : null}
                              {p.deducciones > 0 ? <span style={{ fontSize: 10, background: "#FCE8E8", color: "#C1272D", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>➖ Deducción {money(p.deducciones)}</span> : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 24 }}>Entradas de hoy</h3>
      {todayRecords.length === 0 && <p style={{ color: "#8a7a63" }}>Nadie ha marcado entrada todavía hoy.</p>}
      {todayRecords.map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 14 }}>
          <span>{r.employee}</span>
          <span>{new Date(r.time).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}</span>
          {r.late ? (
            <span style={{ color: "#791F1F", background: "#FCEBEB", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Tarde ({r.minsLate} min)</span>
          ) : (
            <span style={{ color: "#3B6D11", background: "#EAF3DE", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>A tiempo</span>
          )}
        </div>
      ))}
    </div>
  );
}

function EmployeeEditForm({ employee, onSave, onCancel }) {
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role || ROLES[0]);
  const [phone, setPhone] = useState(employee.phone || "");
  const [wage, setWage] = useState(String(employee.dailyWage || ""));

  return (
    <div style={{ background: "linear-gradient(160deg, #FFF8ED, #FFF3E0)", border: "2px solid #F2C879", borderRadius: 12, padding: 16, marginTop: 4 }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "#2B2118" }}>✏️ Editar datos del empleado</div>

      <label style={{ ...lbl, marginTop: 0 }}>Nombre completo</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />

      <label style={lbl}>Puesto</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 12,
              background: role === r ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#fff",
              color: role === r ? "#fff" : "#5a4c3a", border: role === r ? "none" : "1px solid #E5D9C3",
            }}
          >
            {ROLE_ICONS[r]} {r}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={lbl}>Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} placeholder="Opcional" />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={lbl}>Pago por día (C$)</label>
          <input type="number" value={wage} onChange={(e) => setWage(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: 11, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer", fontWeight: 700, color: "#5a4c3a" }}
        >
          Cancelar
        </button>
        <button
          disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), role, phone, dailyWage: Number(wage) || 0 })}
          style={{ flex: 1, padding: 11, borderRadius: 8, border: "none", background: "#2E7D32", color: "#fff", cursor: "pointer", fontWeight: 800, opacity: name.trim() ? 1 : 0.5 }}
        >
          💾 Guardar cambios
        </button>
      </div>
    </div>
  );
}

function PayCustomButton({ onPay }) {
  const [amt, setAmt] = useState("");
  return (
    <>
      <input placeholder="Monto libre" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} style={{ ...inp, maxWidth: 110 }} />
      <button
        disabled={!amt}
        onClick={() => { onPay(Number(amt)); setAmt(""); }}
        style={{ padding: "0 16px", border: "none", borderRadius: 8, background: "#2B2118", color: "#F2C879", fontWeight: 700, cursor: "pointer", opacity: amt ? 1 : 0.5 }}
      >
        Registrar
      </button>
    </>
  );
}

const lbl = { display: "block", fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 };
const inp = { width: "100%", padding: 9, borderRadius: 6, border: "1px solid #E5D9C3", fontSize: 14, boxSizing: "border-box" };

function printDayReport(dayStr, dateLabel, sales, expenses, income, spent, insumos, payroll, realProfit) {
  const daySales = sales.filter((s) => new Date(s.time).toDateString() === dayStr);
  const dayExpenses = expenses.filter((e) => new Date(e.time).toDateString() === dayStr);
  const rows = daySales.map((s) => `<tr><td>#${String(s.folio || s.id).padStart(5, "0")}</td><td>${s.ref}</td><td>${s.method}</td><td style="text-align:right">${money(s.total)}</td></tr>`).join("");
  const expRows = dayExpenses.map((e) => `<tr><td colspan="3">${(e.category || "Otro") === "Insumos" ? "🍗" : "🧾"} ${e.description}</td><td style="text-align:right">-${money(e.amount)}</td></tr>`).join("");
  const html = `
    <html><head><title>Reporte del Día</title><style>
      body { font-family: 'Courier New', monospace; font-size: 12px; padding: 18px; color: #2B2118; }
      h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
      .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 4px 2px; border-bottom: 1px dashed #ccc; text-align: left; }
      .totals td { border: none; font-weight: bold; }
      .big { font-size: 16px; background: #F2C879; padding: 10px; border-radius: 8px; text-align: center; margin: 12px 0; }
      hr { border: none; border-top: 2px dashed #333; margin: 10px 0; }
      @page { margin: 10mm; }
    </style></head><body>
      <h1>🍔🍗 ${RESTAURANT_NAME}</h1>
      <div class="sub">REPORTE DIARIO · ${dateLabel.toUpperCase()}</div>
      <hr/>
      <table><tr><th>Ticket</th><th>Ref</th><th>Pago</th><th style="text-align:right">Total</th></tr>
      ${rows || '<tr><td colspan="4">Sin ventas</td></tr>'}</table>
      <hr/>
      <table class="totals">
        <tr><td>Ingresos</td><td colspan="2"></td><td style="text-align:right">${money(income)}</td></tr>
        <tr><td>Insumos</td><td colspan="2"></td><td style="text-align:right">-${money(insumos)}</td></tr>
        <tr><td>Otros gastos</td><td colspan="2"></td><td style="text-align:right">-${money(spent - insumos)}</td></tr>
        <tr><td>Nómina pagada</td><td colspan="2"></td><td style="text-align:right">-${money(payroll)}</td></tr>
      </table>
      <div class="big">GANANCIA NETA REAL: ${money(realProfit)}</div>
      ${dayExpenses.length ? `<hr/><div style="font-weight:bold;">Gastos del día</div><table>${expRows}</table>` : ""}
      <hr/>
      <div style="text-align:center;font-size:10px;color:#888;">Generado ${new Date().toLocaleString("es-NI")}</div>
    </body></html>`;
  const w = window.open("", "_blank", "width=400,height=650");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function ReportesView({ sales, expenses, payments, salesLog, expensesLog, onAddExpense, onDeleteSale, onDeleteExpense, onClearDay, onClearMonth, clockRecords }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  });

  const dayStr = new Date(selectedDate + "T12:00:00").toDateString();
  const isToday = dayStr === todayStr();

  const todaySales = sales.filter((s) => new Date(s.time).toDateString() === dayStr);
  const dayPermanentSales = (salesLog || sales).filter((s) => new Date(s.time).toDateString() === dayStr);
  const todayExpenses = expenses.filter((e) => new Date(e.time).toDateString() === dayStr);
  const todayPayments = (payments || []).filter((p) => new Date(p.time).toDateString() === dayStr);
  const income = todaySales.reduce((sum, s) => sum + s.total, 0);
  const spent = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const insumos = todayExpenses.filter((e) => (e.category || "Otro") === "Insumos").reduce((sum, e) => sum + Number(e.amount), 0);
  const otrosGastos = spent - insumos;
  const payroll = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const net = income - spent;
  const realProfit = income - spent - payroll;
  const foodCostPct = income > 0 ? Math.round((insumos / income) * 100) : 0;
  const count = todaySales.length;
  const lateToday = clockRecords.filter((r) => new Date(r.time).toDateString() === dayStr && r.late).length;

  const monthKey = selectedDate.slice(0, 7);
  const monthSales = sales.filter((s) => s.time.slice(0, 7) === monthKey);
  const monthExpenses = expenses.filter((e) => e.time.slice(0, 7) === monthKey);
  const monthPayments = (payments || []).filter((p) => p.time.slice(0, 7) === monthKey);
  const monthIncome = monthSales.reduce((sum, s) => sum + s.total, 0);
  const monthSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthInsumos = monthExpenses.filter((e) => (e.category || "Otro") === "Insumos").reduce((sum, e) => sum + Number(e.amount), 0);
  const monthPayroll = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const monthNet = monthIncome - monthSpent;
  const monthRealProfit = monthIncome - monthSpent - monthPayroll;
  const monthFoodCostPct = monthIncome > 0 ? Math.round((monthInsumos / monthIncome) * 100) : 0;
  const [yy, mm] = monthKey.split("-");
  const monthLabel = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("es-NI", { month: "long", year: "numeric" });

  const prevMonthDate = new Date(Number(yy), Number(mm) - 2, 1);
  const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);
  const prevMonthLabel = prevMonthDate.toLocaleDateString("es-NI", { month: "long", year: "numeric" });
  const prevSalesSrc = salesLog || sales;
  const prevExpensesSrc = expensesLog || expenses;
  const prevMonthSales = prevSalesSrc.filter((s) => s.time.slice(0, 7) === prevMonthKey);
  const prevMonthExpensesList = prevExpensesSrc.filter((e) => e.time.slice(0, 7) === prevMonthKey);
  const prevMonthIncome = prevMonthSales.reduce((sum, s) => sum + s.total, 0);
  const prevMonthSpent = prevMonthExpensesList.reduce((sum, e) => sum + Number(e.amount), 0);
  const prevMonthInsumos = prevMonthExpensesList.filter((e) => (e.category || "Otro") === "Insumos").reduce((sum, e) => sum + Number(e.amount), 0);
  const prevMonthPayroll = (payments || []).filter((p) => p.time.slice(0, 7) === prevMonthKey).reduce((sum, p) => sum + p.amount, 0);
  const prevMonthRealProfit = prevMonthIncome - prevMonthSpent - prevMonthPayroll;
  const monthChangePct = prevMonthIncome > 0 ? Math.round(((monthIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;

  const lastDayOfMonth = new Date(Number(yy), Number(mm), 0).getDate();
  function sumInDayRange(list, dayStart, dayEnd, key) {
    return (list || [])
      .filter((x) => {
        const t = new Date(x.time);
        if (t.getFullYear() !== Number(yy) || t.getMonth() !== Number(mm) - 1) return false;
        const day = t.getDate();
        return day >= dayStart && day <= dayEnd;
      })
      .reduce((sum, x) => sum + Number(key === "sale" ? x.total : x.amount), 0);
  }
  const q1Sold = sumInDayRange(salesLog || sales, 1, 15, "sale");
  const q1Spent = sumInDayRange(expensesLog || expenses, 1, 15, "exp");
  const q2Sold = sumInDayRange(salesLog || sales, 16, lastDayOfMonth, "sale");
  const q2Spent = sumInDayRange(expensesLog || expenses, 16, lastDayOfMonth, "exp");
  function payrollInDayRange(dayStart, dayEnd) {
    return (payments || [])
      .filter((p) => {
        const t = new Date(p.time);
        if (t.getFullYear() !== Number(yy) || t.getMonth() !== Number(mm) - 1) return false;
        const day = t.getDate();
        return day >= dayStart && day <= dayEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }
  const q1Payroll = payrollInDayRange(1, 15);
  const q2Payroll = payrollInDayRange(16, lastDayOfMonth);

  const cashToday = todaySales.filter((s) => s.method === "Efectivo").reduce((sum, s) => sum + s.total, 0);
  const cardToday = todaySales.filter((s) => s.method === "Tarjeta").reduce((sum, s) => sum + s.total, 0);
  const avgTicket = count > 0 ? income / count : 0;
  const hourlyMap = {};
  todaySales.forEach((s) => {
    const h = new Date(s.time).getHours();
    hourlyMap[h] = (hourlyMap[h] || 0) + s.total;
  });
  const peakHourEntry = Object.entries(hourlyMap).sort((a, b) => b[1] - a[1])[0];
  const peakHourLabel = peakHourEntry ? `${peakHourEntry[0]}:00 - ${Number(peakHourEntry[0]) + 1}:00` : null;

  function exportCSV() {
    const header = "Ticket,Referencia,Metodo,Subtotal,Descuento,Total,Hora\n";
    const rows = todaySales.map((s) => `${s.folio || s.id},"${s.ref}",${s.method},${s.subtotal || s.total},${s.discountAmount || 0},${s.total},${new Date(s.time).toLocaleTimeString("es-NI")}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const EXPENSE_CATS = [
    { id: "Insumos", icon: "🍗", label: "Insumos", color: "#C1272D" },
    { id: "Luz", icon: "💡", label: "Luz", color: "#E8A33D" },
    { id: "Agua", icon: "🚰", label: "Agua", color: "#3E7FD9" },
    { id: "Otro", icon: "🧾", label: "Otro gasto", color: "#8a7a63" },
  ];
  function expenseCatMeta(catId) {
    return EXPENSE_CATS.find((c) => c.id === (catId || "Otro")) || EXPENSE_CATS[3];
  }

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Insumos");
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  });

  const todayExpensesByCat = useMemo(() => {
    return EXPENSE_CATS.map((cat) => ({
      ...cat,
      amount: todayExpenses.filter((e) => (e.category || "Otro") === cat.id).reduce((sum, e) => sum + Number(e.amount), 0),
    }));
  }, [todayExpenses]);
  const monthExpensesByCat = useMemo(() => {
    return EXPENSE_CATS.map((cat) => ({
      ...cat,
      amount: monthExpenses.filter((e) => (e.category || "Otro") === cat.id).reduce((sum, e) => sum + Number(e.amount), 0),
    }));
  }, [monthExpenses]);
  const maxCatAmount = Math.max(1, ...monthExpensesByCat.map((c) => c.amount));

  const byItem = useMemo(() => {
    const map = {};
    todaySales.forEach((s) => s.items.forEach((it) => { map[it.name] = (map[it.name] || 0) + it.qty; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [todaySales]);
  const maxItemQty = byItem.length > 0 ? byItem[0][1] : 1;

  const last7Days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const total = sales.filter((s) => new Date(s.time).toDateString() === ds).reduce((sum, s) => sum + s.total, 0);
      arr.push({ label: d.toLocaleDateString("es-NI", { weekday: "short" }), total });
    }
    return arr;
  }, [sales]);
  const max7 = Math.max(1, ...last7Days.map((d) => d.total));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{isToday ? "Reporte de hoy" : "Reporte del día seleccionado"}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ ...inp, maxWidth: 170 }} />
          <button onClick={() => printDayReport(dayStr, selectedDate, sales, expenses, income, spent, insumos, payroll, realProfit)} title="Imprimir reporte del día" style={{ background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#8a7a63" }}>
            <Printer size={15} />
          </button>
          {todaySales.length > 0 && (
            <button onClick={exportCSV} title="Exportar a Excel/CSV" style={{ background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#8a7a63", fontSize: 15 }}>
              📥
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 12 }}>
        Viendo: {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8a7a63", marginBottom: 10 }}>📈 Tendencia de ventas — últimos 7 días</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
          {last7Days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: "#8a7a63" }}>{d.total > 0 ? money(d.total).replace("C$", "") : ""}</div>
              <div style={{ width: "100%", height: Math.max(4, (d.total / max7) * 60), background: "linear-gradient(180deg, #E8A33D, #C1272D)", borderRadius: 4 }} />
              <div style={{ fontSize: 10, color: "#8a7a63", textTransform: "capitalize" }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 16, padding: 18, marginBottom: 18, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", letterSpacing: 0.5, marginBottom: 10 }}>💎 GANANCIA NETA REAL (hoy)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10, fontSize: 11 }}>
          <div><div style={{ color: "#C9BBA3" }}>Ventas</div><div style={{ fontWeight: 800, fontSize: 14 }}>{money(income)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Insumos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(insumos)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Otros gastos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(otrosGastos)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Nómina pagada</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(payroll)}</div></div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>= Te queda realmente</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: realProfit >= 0 ? "#00E676" : "#FF5252" }}>{money(realProfit)}</span>
        </div>
        {income > 0 && <div style={{ fontSize: 11, color: "#C9BBA3", marginTop: 8 }}>🍗 Costo de insumos: {foodCostPct}% de las ventas {foodCostPct > 35 ? "⚠️ (alto, ideal 30-35%)" : "✅"}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={statCard}><div style={statLabel}>Ingresos</div><div style={statValue}>{money(income)}</div></div>
        <div style={statCard}><div style={statLabel}>Gastos totales</div><div style={{ ...statValue, color: "#C1272D" }}>{money(spent)}</div></div>
        <div style={statCard}><div style={statLabel}>Pedidos cerrados</div><div style={statValue}>{count}</div></div>
        <div style={statCard}><div style={statLabel}>Ticket promedio</div><div style={statValue}>{money(avgTicket)}</div></div>
        <div style={statCard}><div style={statLabel}>Hora pico</div><div style={{ ...statValue, fontSize: 16 }}>{peakHourLabel || "—"}</div></div>
        <div style={statCard}><div style={statLabel}>Llegadas tarde</div><div style={statValue}>{lateToday}</div></div>
      </div>

      {income > 0 && (
        <div style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8a7a63", marginBottom: 10 }}>💳 Método de pago (hoy)</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>💵 Efectivo</span><span style={{ fontWeight: 700 }}>{money(cashToday)}</span>
              </div>
              <div style={{ background: "#F0E8D8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${income > 0 ? (cashToday / income) * 100 : 0}%`, height: "100%", background: "#26A65B", borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>💳 Tarjeta</span><span style={{ fontWeight: 700 }}>{money(cardToday)}</span>
              </div>
              <div style={{ background: "#F0E8D8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div style={{ width: `${income > 0 ? (cardToday / income) * 100 : 0}%`, height: "100%", background: "#1565C0", borderRadius: 6 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 16, padding: 18, marginBottom: 18, color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#F2C879", letterSpacing: 0.5, marginBottom: 10 }}>💎 GANANCIA NETA REAL DEL MES — {monthLabel.toUpperCase()}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10, fontSize: 11 }}>
          <div><div style={{ color: "#C9BBA3" }}>Ventas</div><div style={{ fontWeight: 800, fontSize: 14 }}>{money(monthIncome)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Insumos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthInsumos)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Otros gastos</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthSpent - monthInsumos)}</div></div>
          <div><div style={{ color: "#C9BBA3" }}>− Nómina pagada</div><div style={{ fontWeight: 800, fontSize: 14, color: "#FF8A80" }}>{money(monthPayroll)}</div></div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>= Te queda realmente este mes</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: monthRealProfit >= 0 ? "#00E676" : "#FF5252" }}>{money(monthRealProfit)}</span>
        </div>
        {monthIncome > 0 && <div style={{ fontSize: 11, color: "#C9BBA3", marginTop: 8 }}>🍗 Costo de insumos: {monthFoodCostPct}% de las ventas {monthFoodCostPct > 35 ? "⚠️ (alto, ideal 30-35%)" : "✅"}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", margin: 0 }}>Balance del mes — {monthLabel}</h3>
        {(monthSales.length > 0 || monthExpenses.length > 0) && (
          <button
            onClick={() => { if (window.confirm(`¿Borrar TODAS las ventas y gastos de ${monthLabel}? Esto no se puede deshacer.`)) onClearMonth(monthKey); }}
            style={{ fontSize: 11, background: "none", border: "1px solid #C1272D", color: "#C1272D", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}
          >
            Borrar mes completo
          </button>
        )}
      </div>
      {prevMonthIncome > 0 || prevMonthSpent > 0 ? (
        <div style={{ background: "linear-gradient(160deg, #fff, #FBF2E4)", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, margin: "10px 0 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#5a4c3a", letterSpacing: 0.3, textTransform: "capitalize" }}>📊 Comparado con {prevMonthLabel}</span>
            {monthChangePct !== null && (
              <span style={{
                fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                background: monthChangePct >= 0 ? "#E8F5E9" : "#FCE8E8",
                color: monthChangePct >= 0 ? "#2E7D32" : "#C1272D",
              }}>
                {monthChangePct >= 0 ? "📈 +" : "📉 "}{monthChangePct}% en ventas
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#8a7a63", fontWeight: 700, letterSpacing: 0.3 }}>VENDIDO</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{money(prevMonthIncome)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8a7a63", fontWeight: 700, letterSpacing: 0.3 }}>INSUMOS</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#C1272D" }}>{money(prevMonthInsumos)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8a7a63", fontWeight: 700, letterSpacing: 0.3 }}>NÓMINA</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#C1272D" }}>{money(prevMonthPayroll)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8a7a63", fontWeight: 700, letterSpacing: 0.3 }}>GANANCIA REAL</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: prevMonthRealProfit >= 0 ? "#2E7D32" : "#C1272D" }}>{money(prevMonthRealProfit)}</div>
            </div>
          </div>
        </div>
      ) : (
        monthChangePct !== null && (
          <div style={{ fontSize: 12, margin: "6px 0 10px", color: monthChangePct >= 0 ? "#2E7D32" : "#C1272D", fontWeight: 700 }}>
            {monthChangePct >= 0 ? "📈" : "📉"} {monthChangePct >= 0 ? "+" : ""}{monthChangePct}% vs. mes anterior ({money(prevMonthIncome)})
          </div>
        )
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={statCard}><div style={statLabel}>Ingresos del mes</div><div style={statValue}>{money(monthIncome)}</div></div>
        <div style={statCard}><div style={statLabel}>Insumos del mes</div><div style={{ ...statValue, color: "#C1272D" }}>{money(monthInsumos)}</div></div>
        <div style={statCard}><div style={statLabel}>Nómina del mes</div><div style={{ ...statValue, color: "#C1272D" }}>{money(monthPayroll)}</div></div>
        <div style={statCard}><div style={statLabel}>Ventas del mes</div><div style={statValue}>{monthSales.length}</div></div>
        <div style={statCard}><div style={statLabel}>Ticket promedio (mes)</div><div style={statValue}>{money(monthSales.length > 0 ? monthIncome / monthSales.length : 0)}</div></div>
        <div style={statCard}><div style={statLabel}>Días con ventas</div><div style={statValue}>{new Set(monthSales.map((s) => s.time.slice(0, 10))).size}</div></div>
      </div>

      <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 18, padding: 20, marginBottom: 22, border: "1px solid rgba(242,200,121,0.2)", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#F2C879", letterSpacing: 0.5, marginBottom: 14 }}>📆 CONTROL QUINCENAL — {monthLabel.toUpperCase()}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[{ label: `QUINCENA 1 (1 al 15)`, sold: q1Sold, spent: q1Spent, payroll: q1Payroll }, { label: `QUINCENA 2 (16 al ${lastDayOfMonth})`, sold: q2Sold, spent: q2Spent, payroll: q2Payroll }].map((q) => (
            <div key={q.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#C9BBA3", letterSpacing: 0.5, marginBottom: 10 }}>{q.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#fff", marginBottom: 4 }}>
                <span style={{ opacity: 0.8 }}>Vendido</span><span style={{ fontWeight: 800 }}>{money(q.sold)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#fff", marginBottom: 4 }}>
                <span style={{ opacity: 0.8 }}>Gastado</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q.spent)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#fff", marginBottom: 8 }}>
                <span style={{ opacity: 0.8 }}>Nómina pagada</span><span style={{ fontWeight: 800, color: "#FF8A80" }}>-{money(q.payroll)}</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#C9BBA3" }}>Ganancia real</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: q.sold - q.spent - q.payroll >= 0 ? "#00E676" : "#FF5252" }}>{money(q.sold - q.spent - q.payroll)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#FFF3E0", border: "1px solid #F2C879", borderRadius: 12, padding: "12px 16px", marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#5a4c3a", fontWeight: 700 }}>💰 Ganancia real del mes completo (suma de ambas quincenas)</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: (q1Sold + q2Sold - q1Spent - q2Spent - q1Payroll - q2Payroll) >= 0 ? "#2E7D32" : "#C1272D" }}>
          {money(q1Sold + q2Sold - q1Spent - q2Spent - q1Payroll - q2Payroll)}
        </span>
      </div>

      <div style={{ background: "linear-gradient(160deg, #2B2118, #1a140e)", borderRadius: 18, padding: 20, marginBottom: 22, border: "1px solid rgba(242,200,121,0.2)", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#F2C879", letterSpacing: 0.5, marginBottom: 14 }}>📊 GASTOS POR CATEGORÍA — {isToday ? "HOY" : new Date(selectedDate + "T12:00:00").toLocaleDateString("es-NI", { day: "numeric", month: "short" }).toUpperCase()}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
          {todayExpensesByCat.map((cat) => (
            <div key={cat.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderLeft: `3px solid ${cat.color}` }}>
              <div style={{ fontSize: 11, color: "#C9BBA3", marginBottom: 3 }}>{cat.icon} {cat.label}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{money(cat.amount)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#C9BBA3", letterSpacing: 0.5, marginBottom: 10, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 }}>ACUMULADO DEL MES ({monthLabel.toUpperCase()})</div>
        {monthExpensesByCat.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#fff", marginBottom: 3 }}>
              <span>{cat.icon} {cat.label}</span><span style={{ fontWeight: 700 }}>{money(cat.amount)}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 7, overflow: "hidden" }}>
              <div style={{ width: `${(cat.amount / maxCatAmount) * 100}%`, height: "100%", background: cat.color, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Registrar gasto</h3>
      <p style={{ fontSize: 11, color: "#8a7a63", marginTop: -4, marginBottom: 10 }}>
        Podés poner la fecha real de la compra aunque no sea hoy — así los insumos que compraste otro día no se mezclan con la venta de hoy.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {EXPENSE_CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
              background: category === c.id ? c.color : "#F3ECE0",
              color: category === c.id ? "#fff" : "#5a4c3a",
            }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <input placeholder="Descripción (ej: pollo, factura ENEL)" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inp, maxWidth: 240 }} />
        <input placeholder="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, maxWidth: 120 }} />
        <div>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} title="Fecha real del gasto" style={{ ...inp, maxWidth: 150 }} />
        </div>
        <button
          disabled={!desc || !amount}
          onClick={() => {
            onAddExpense({ description: desc, amount: Number(amount), category, time: new Date(expenseDate + "T12:00:00").toISOString() });
            setDesc(""); setAmount("");
          }}
          style={{ padding: "0 16px", height: 38, border: "none", borderRadius: 6, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: desc && amount ? 1 : 0.5 }}
        >
          Agregar gasto
        </button>
      </div>
      {todayExpenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {todayExpenses.slice().reverse().map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
              <span>{expenseCatMeta(e.category).icon} {e.description}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: "#C1272D" }}>-{money(e.amount)}</span>
                <button onClick={() => onDeleteExpense(e.id)} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer", padding: 2 }}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Productos más vendidos</h3>
      {byItem.length === 0 && <p style={{ color: "#8a7a63" }}>Aún no hay ventas registradas ese día.</p>}
      {byItem.map(([name, qty]) => (
        <div key={name} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
            <span>{name}</span><span style={{ fontWeight: 700 }}>{qty}</span>
          </div>
          <div style={{ background: "#F0E8D8", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${(qty / maxItemQty) * 100}%`, height: "100%", background: "linear-gradient(90deg, #E8A33D, #C1272D)", borderRadius: 6 }} />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", margin: 0 }}>🧾 Consumo por pedido — Historial de cobros</h3>
        <span style={{ fontSize: 10, color: "#2E7D32", background: "#E8F5E9", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>🔒 Permanente — nunca se borra</span>
      </div>
      {dayPermanentSales.length === 0 && <p style={{ color: "#8a7a63" }}>Sin cobros ese día.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {dayPermanentSales.slice().reverse().map((s) => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#FBF2E4", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{s.kind === "delivery" ? "🛵" : "🍽️"} {s.ref}</span>
                <span style={{ fontSize: 11, color: "#8a7a63", marginLeft: 8 }}>{new Date(s.time).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })} · {s.method}{s.discountAmount > 0 ? ` · 🏷️ -${money(s.discountAmount)}` : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#C1272D" }}>{money(s.total)}</span>
              </div>
            </div>
            <div style={{ padding: "8px 14px" }}>
              {s.items.map((it) => (
                <div key={it.menuId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "#5a4c3a" }}>
                  <span><strong style={{ color: "#2B2118" }}>{it.qty}x</strong> {it.name}{it.notes ? <span style={{ color: "#C1531F", fontStyle: "italic" }}> — {it.notes}</span> : ""}</span>
                  <span>{money(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const statCard = { background: "#fff", border: "1px solid #E5D9C3", borderRadius: 10, padding: 14 };
const statLabel = { fontSize: 12, color: "#8a7a63", marginBottom: 4 };
const statValue = { fontSize: 22, fontWeight: 800 };

function ReceiptModal({ sale, onClose }) {
  const date = new Date(sale.time);
  const [contact, setContact] = useState(sale.phone || "");

  const receiptText = [
    RESTAURANT_NAME,
    date.toLocaleString("es-NI"),
    sale.ref,
    "",
    ...sale.items.map((it) => `${it.qty}x ${it.name} - ${money(it.price * it.qty)}`),
    "",
    ...(sale.discountAmount > 0 ? [`Subtotal: ${money(sale.subtotal)}`, `Descuento (${sale.discountLabel}): -${money(sale.discountAmount)}`] : []),
    `Total: ${money(sale.total)}`,
    `Pago: ${sale.method}`,
    "",
    "¡Gracias por su compra!",
  ].join("\n");

  function sendWhatsapp() {
    const digits = contact.replace(/[^0-9]/g, "");
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(receiptText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(receiptText)}`;
    window.open(url, "_blank");
  }
  function sendEmail() {
    const url = `mailto:${contact.includes("@") ? contact : ""}?subject=${encodeURIComponent("Recibo - " + RESTAURANT_NAME)}&body=${encodeURIComponent(receiptText)}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 320, overflow: "hidden" }}>
        <div id="printable-receipt" style={{ padding: 0, fontFamily: "'Courier New', monospace", fontSize: 13, background: "#fff" }}>
          <div style={{ background: "linear-gradient(135deg, #C1272D, #E8A33D)", padding: "18px 16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 2 }}>🍔🍗</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: 0.5, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>{RESTAURANT_NAME}</div>
            <div style={{ color: "#FFF3E0", fontSize: 10, marginTop: 3, letterSpacing: 0.5 }}>MASATEPE · MASAYA · NICARAGUA</div>
            {sale.folio && <div style={{ color: "#fff", fontSize: 11, marginTop: 6, fontWeight: 800, background: "rgba(0,0,0,0.2)", display: "inline-block", padding: "2px 12px", borderRadius: 20 }}>TICKET #{String(sale.folio).padStart(5, "0")}</div>}
          </div>
          <div style={{ padding: "14px 16px 0" }}>
            <div style={{ textAlign: "center", fontSize: 11, color: "#666", marginBottom: 10 }}>{date.toLocaleString("es-NI", { dateStyle: "long", timeStyle: "short" })}</div>
            <div style={{ borderTop: "2px dashed #E5D9C3", margin: "6px 0 10px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{sale.ref}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: sale.kind === "delivery" ? "#2E7D32" : "#C1531F", padding: "3px 8px", borderRadius: 20 }}>
                {sale.kind === "delivery" ? "🛵 DELIVERY" : "🍽️ MESA"}
              </span>
            </div>
            <div style={{ display: "flex", fontSize: 10, color: "#8a7a63", fontWeight: 800, marginBottom: 6, borderBottom: "1px solid #EEE", paddingBottom: 4 }}>
              <span style={{ flex: 1 }}>PRODUCTO</span>
              <span style={{ width: 30, textAlign: "center" }}>CANT</span>
              <span style={{ width: 65, textAlign: "right" }}>SUBTOTAL</span>
            </div>
            {sale.items.map((it) => (
              <div key={it.menuId} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex" }}>
                  <span style={{ flex: 1, fontWeight: 600 }}>{it.name}</span>
                  <span style={{ width: 30, textAlign: "center" }}>{it.qty}</span>
                  <span style={{ width: 65, textAlign: "right", fontWeight: 700 }}>{money(it.price * it.qty)}</span>
                </div>
                {it.notes && <div style={{ fontSize: 10, color: "#C1531F", fontStyle: "italic" }}>↳ {it.notes}</div>}
              </div>
            ))}
            <div style={{ borderTop: "1px dashed #E5D9C3", margin: "10px 0 8px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7a63" }}>
              <span>Subtotal</span><span>{money(sale.subtotal || sale.total)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#C1272D", fontWeight: 700 }}>
                <span>🏷️ Descuento ({sale.discountLabel})</span><span>-{money(sale.discountAmount)}</span>
              </div>
            )}
            <div style={{ background: "#2B2118", borderRadius: 8, padding: "10px 14px", margin: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#F2C879", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>TOTAL</span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{money(sale.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, background: "#FFF3E0", padding: "6px 10px", borderRadius: 6, border: "1px solid #F2C879" }}>
              <span>💳 Forma de pago</span><span style={{ fontWeight: 800 }}>{sale.method}</span>
            </div>
            {sale.tip > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6, color: "#2E7D32", fontWeight: 700 }}>
                <span>🙌 Propina</span><span>{money(sale.tip)}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", padding: "16px 16px 18px" }}>
            <div style={{ borderTop: "2px dashed #E5D9C3", marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: "#C1272D" }}>¡Gracias por su compra! 🙏</div>
            <div style={{ fontSize: 10, color: "#8a7a63", marginTop: 3 }}>Vuelva pronto — le esperamos con gusto</div>
            <div style={{ fontSize: 16, marginTop: 8, letterSpacing: 3 }}>🌿 🍔 🌿</div>
          </div>
        </div>
        <div style={{ padding: "0 12px 12px" }}>
          <input
            placeholder="Número WhatsApp o correo (opcional)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            style={{ width: "100%", padding: 9, borderRadius: 6, border: "1px solid #E5D9C3", fontSize: 13, boxSizing: "border-box", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={sendWhatsapp} style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              WhatsApp
            </button>
            <button onClick={sendEmail} style={{ flex: 1, padding: 9, borderRadius: 8, border: "none", background: "#2B2118", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Correo
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #eee" }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer" }}>Cerrar</button>
          <button
            onClick={() => {
              const content = document.getElementById("printable-receipt").outerHTML;
              const w = window.open("", "_blank", "width=320,height=600");
              w.document.write(`<html><head><title>Recibo</title><style>
                @page { size: 80mm auto; margin: 4mm; }
                body { font-family: monospace; font-size: 12px; }
              </style></head><body>${content}</body></html>`);
              w.document.close();
              w.focus();
              w.print();
            }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 8, border: "none", background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
