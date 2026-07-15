import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Minus, X, Send, CheckCircle2, Clock, ChefHat, UtensilsCrossed, Receipt, Bike, BarChart3, Lock, Printer, UserCheck, Wallet, Tag, Tv, Percent, Users, Archive } from "lucide-react";

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

const CAT_ICONS = { "Hamburguesas": "🍔", "Frappés": "🥤", "Chicken Mood": "🍗", "Paninis": "🥪", "Extras": "🍟", "Salsas": "🥫", "Bebidas": "🧃" };
const CATS = ["Hamburguesas", "Frappés", "Chicken Mood", "Paninis", "Extras", "Salsas", "Bebidas"];

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
    pin: DEFAULT_PIN,
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

  const { tables, deliveries, sales = [], expenses = [], employees = [], clockRecords = [], promotions = [], salesLog = [], expensesLog = [], pin } = state;

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
      withTables((ts) => ts.map((t) => (t.id === id ? { ...t, items: addFn(t.items), status: "ocupada" } : t)));
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
  function closeTicket(kind, id, method, discount) {
    const disc = discount && discount.value > 0 ? discount : null;
    function computeTotal(items) {
      const sub = orderTotal(items);
      if (!disc) return { subtotal: sub, discountAmount: 0, total: sub };
      const discountAmount = disc.type === "percent" ? Math.round(sub * (disc.value / 100)) : Math.min(disc.value, sub);
      return { subtotal: sub, discountAmount, total: Math.max(0, sub - discountAmount) };
    }
    if (kind === "table") {
      const t = tables.find((t) => t.id === id);
      if (!t.items.length) return;
      const { subtotal, discountAmount, total } = computeTotal(t.items);
      const sale = { id: Date.now(), kind: "mesa", ref: `Mesa ${t.id}`, items: t.items, subtotal, discountAmount, discountLabel: disc ? (disc.type === "percent" ? `${disc.value}%` : money(disc.value)) : null, total, method, time: new Date().toISOString() };
      const next = {
        ...state,
        sales: [...sales, sale],
        salesLog: [...salesLog, sale],
        tables: tables.map((x) => (x.id === id ? { ...x, status: "libre", kitchenStatus: null, items: [], kitchenSentAt: null } : x)),
      };
      persist(next);
      setActiveTable(null);
      setReceiptFor(sale);
    } else {
      const d = deliveries.find((d) => d.id === id);
      if (!d.items.length) return;
      const { subtotal, discountAmount, total } = computeTotal(d.items);
      const sale = { id: Date.now(), kind: "delivery", ref: d.customer, phone: d.phone, items: d.items, subtotal, discountAmount, discountLabel: disc ? (disc.type === "percent" ? `${disc.value}%` : money(disc.value)) : null, total, method, time: new Date().toISOString() };
      const next = {
        ...state,
        sales: [...sales, sale],
        salesLog: [...salesLog, sale],
        deliveries: deliveries.map((x) => (x.id === id ? { ...x, kitchenStatus: "entregado" } : x)),
      };
      persist(next);
      setActiveDelivery(null);
      setReceiptFor(sale);
    }
  }
  function addExpense(exp) {
    const record = { id: Date.now(), ...exp, time: new Date().toISOString() };
    persist({ ...state, expenses: [...expenses, record], expensesLog: [...expensesLog, record] });
  }
  function addEmployee(name) {
    if (!name.trim()) return;
    persist({ ...state, employees: [...employees, { id: Date.now(), name: name.trim() }] });
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
    return <div style={{ padding: 40, textAlign: "center", color: "#8a7a63" }}>Cargando…</div>;
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#FFF8ED", minHeight: "100vh", color: "#2B2118" }}>
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
      {!kiosk && (
        <>
          <div style={{
            background: connError ? "#C1272D" : "#2E7D32", color: "#fff", fontSize: 12, fontWeight: 700,
            padding: "6px 14px", textAlign: "center",
          }}>
            {connError ? `⚠️ ${connStatus}: ${connError}` : `✅ ${connStatus}${lastSync ? " · última sync " + lastSync.toLocaleTimeString("es-NI") : ""}`}
          </div>
          <div style={{ background: "#2B2118", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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

      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        {view === "mesas" && <MesasView tables={tables} onOpen={(id) => setActiveTable(id)} />}

        {view === "cocina" && <CocinaView tables={tables} deliveries={deliveries} onAdvance={advanceKitchen} />}

        {view === "caja" &&
          (cajaUnlocked ? (
            <CajaView tables={tables} deliveries={deliveries} onCharge={closeTicket} pin={pin} onChangePin={(p) => persist({ ...state, pin: p })} />
          ) : (
            <PinGate pin={pin} onUnlock={() => setCajaUnlocked(true)} />
          ))}

        {view === "delivery" && (
          <DeliveryView deliveries={deliveries} onNew={() => setShowNewDelivery(true)} onOpen={(id) => setActiveDelivery(id)} />
        )}

        {view === "promos" && <PromoView promotions={promotions} onAdd={addPromotion} onDelete={deletePromotion} />}

        {view === "empleados" && (
          <EmpleadosView employees={employees} clockRecords={clockRecords} onAdd={addEmployee} onClockIn={clockIn} />
        )}

        {view === "reportes" && <ReportesView sales={sales} expenses={expenses} onAddExpense={addExpense} onDeleteSale={deleteSale} onDeleteExpense={deleteExpense} onClearDay={clearDay} onClearMonth={clearMonth} clockRecords={clockRecords} />}

        {view === "historial" && <HistorialView salesLog={salesLog} expensesLog={expensesLog} />}

        {view === "menutv" && <MenuBoardView promotions={promotions} />}
      </div>

      {activeTable && (
        <OrderModal
          title={`Mesa ${activeTable}`}
          items={tables.find((t) => t.id === activeTable).items}
          kitchenStatus={tables.find((t) => t.id === activeTable).kitchenStatus}
          promotions={promotions}
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
          onAdd={(item) => addItemToOrder("delivery", activeDelivery, item)}
          onQty={(menuId, d) => changeQty("delivery", activeDelivery, menuId, d)}
          onNote={(menuId, note) => setNote("delivery", activeDelivery, menuId, note)}
          onSend={() => sendToKitchen("delivery", activeDelivery)}
          onClose={() => setActiveDelivery(null)}
        />
      )}

      {showNewDelivery && (
        <NewDeliveryModal
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

function MesasView({ tables, onOpen }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🍽️ Piso del restaurante</h2>
        <span style={{ fontSize: 12, color: "#8a7a63" }}>{tables.length} mesas</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {tables.map((t) => {
          const st = statusStyle(t.kitchenStatus, t.items.length > 0);
          const total = orderTotal(t.items);
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              style={{
                background: st.grad, border: "none", borderRadius: 16, padding: "20px 14px", cursor: "pointer",
                textAlign: "left", color: st.text, boxShadow: `0 6px 16px ${st.glow}`, position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 26, position: "absolute", top: 10, right: 12, opacity: 0.85 }}>{st.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Mesa {t.id}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.9 }}>{st.label}</div>
              {t.items.length > 0 && <div style={{ fontSize: 17, marginTop: 10, fontWeight: 800 }}>{money(total)}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderModal({ title, items, kitchenStatus, promotions, onAdd, onQty, onNote, onSend, onClose }) {
  const allCats = promotions && promotions.length > 0 ? [...CATS, "Promociones"] : CATS;
  const [cat, setCat] = useState(allCats[0]);
  const total = orderTotal(items);
  const listForCat = cat === "Promociones" ? promotions : MENU.filter((m) => m.cat === cat);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#FFF8ED", borderRadius: 18, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", color: "#FFF8ED", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#FFF8ED", cursor: "pointer", padding: 6 }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", overflow: "auto", flex: 1 }}>
          <div style={{ width: 160, borderRight: "1px solid #E5D9C3", flexShrink: 0, background: "#FBF2E4", padding: 6 }}>
            {allCats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "12px 12px", borderRadius: 10, marginBottom: 4,
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: cat === c ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "transparent",
                  color: cat === c ? "#fff" : (c === "Promociones" ? "#C1272D" : "#5a4c3a"),
                  boxShadow: cat === c ? "0 3px 8px rgba(193,39,45,0.3)" : "none",
                }}
              >
                <span style={{ fontSize: 16 }}>{c === "Promociones" ? "🏷️" : CAT_ICONS[c]}</span> {c}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: 14, overflow: "auto" }}>
            {cat === "Promociones" && listForCat.length === 0 && (
              <p style={{ fontSize: 13, color: "#8a7a63" }}>No hay promociones activas. Agrégalas en la pestaña "Promos".</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {listForCat.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onAdd(m)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "14px 14px", borderRadius: 12,
                    border: "none", cursor: "pointer", fontSize: 14, textAlign: "left",
                    background: cat === "Promociones" ? "linear-gradient(135deg, #FFF3EC, #FFE4D3)" : "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#2B2118" }}>{m.name}</span>
                  <span style={{ fontWeight: 800, color: "#C1272D", fontSize: 15 }}>{money(m.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #E5D9C3", padding: 14, maxHeight: 200, overflow: "auto", background: "#FBF2E4" }}>
          {items.length === 0 && <p style={{ fontSize: 13, color: "#8a7a63" }}>Sin productos agregados todavía.</p>}
          {items.map((it) => (
            <div key={it.menuId} style={{ marginBottom: 8, background: "#fff", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{it.name}</span>
                <button onClick={() => onQty(it.menuId, -1)} style={iconBtn}><Minus size={14} /></button>
                <span style={{ minWidth: 18, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{it.qty}</span>
                <button onClick={() => onQty(it.menuId, 1)} style={iconBtn}><Plus size={14} /></button>
                <span style={{ minWidth: 70, textAlign: "right", fontSize: 13, fontWeight: 800, color: "#C1272D" }}>{money(it.price * it.qty)}</span>
              </div>
              <input placeholder="Nota (ej: sin cebolla)" value={it.notes} onChange={(e) => onNote(it.menuId, e.target.value)} style={{ marginTop: 6, width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid #E5D9C3", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid #E5D9C3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {money(total)}</div>
          <button onClick={onSend} disabled={!items.length} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 22px", borderRadius: 10, border: "none", cursor: items.length ? "pointer" : "not-allowed", background: "linear-gradient(135deg, #C1272D, #E8A33D)", color: "#fff", fontWeight: 800, opacity: items.length ? 1 : 0.5, fontSize: 14 }}>
            <Send size={16} /> {kitchenStatus ? "Actualizar cocina" : "Enviar a cocina"}
          </button>
        </div>
      </div>
    </div>
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
    { key: "nuevos", title: "🆕 NUEVOS", items: nuevos, bg: "#C1272D", action: "preparando", actionLabel: "Empezar a preparar", nextBg: "#E8A33D" },
    { key: "preparando", title: "🔥 PREPARANDO", items: preparando, bg: "#E8A33D", action: "listo", actionLabel: "Marcar listo", nextBg: "#639922" },
    { key: "listos", title: "✅ LISTOS", items: listos, bg: "#639922", action: null, actionLabel: null, nextBg: null },
  ];

  return (
    <div>
      <style>{`
        @keyframes pulseBadge { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes cardIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>👨‍🍳 Pantalla de Cocina</h2>
        <span style={{ fontSize: 13, color: "#8a7a63" }}>{new Date().toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {nuevos.length === 0 && preparando.length === 0 && listos.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7a63" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
          <p>No hay pedidos en cocina por ahora.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
        {columns.map((col) => (
          <div key={col.key}>
            <div style={{ background: col.bg, color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 1, padding: "10px 14px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{col.title}</span>
              <span style={{ background: "rgba(255,255,255,0.3)", borderRadius: 20, padding: "2px 10px", fontSize: 13 }}>{col.items.length}</span>
            </div>
            <div style={{ background: "#FFF3E8", borderRadius: "0 0 10px 10px", padding: 10, minHeight: 80, display: "flex", flexDirection: "column", gap: 10 }}>
              {col.items.length === 0 && <div style={{ fontSize: 12, color: "#C9BBA3", textAlign: "center", padding: "16px 0" }}>Vacío</div>}
              {col.items.map((o) => (
                <div key={o.kind + o.id} style={{ background: col.bg, borderRadius: 12, padding: 14, color: "#fff", animation: "cardIn 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 16 }}>{o.label}</strong>
                    <ElapsedBadge sentAt={o.kitchenSentAt} />
                  </div>
                  <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
                    {o.items.map((it) => (
                      <li key={it.menuId}>
                        <strong>{it.qty}x</strong> {it.name}
                        {it.notes && <div style={{ fontSize: 12, opacity: 0.85, fontStyle: "italic" }}>↳ {it.notes}</div>}
                      </li>
                    ))}
                  </ul>
                  {col.action && (
                    <button
                      onClick={() => onAdvance(o.kind, o.id, col.action)}
                      style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: "rgba(255,255,255,0.95)", color: col.bg, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                    >
                      {col.actionLabel} →
                    </button>
                  )}
                  {!col.action && (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, opacity: 0.9 }}>Avisar al mesero 🔔</div>
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

function CajaView({ tables, deliveries, onCharge, pin, onChangePin }) {
  const abiertas = [
    ...tables.filter((t) => t.items.length > 0).map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.items.length > 0 && d.kitchenStatus !== "entregado").map((d) => ({ kind: "delivery", id: d.id, label: `🛵 ${d.customer}`, ...d })),
  ];
  const [method, setMethod] = useState({});
  const [discountOpen, setDiscountOpen] = useState({});
  const [discountType, setDiscountType] = useState({});
  const [discountValue, setDiscountValue] = useState({});
  const [showPinSettings, setShowPinSettings] = useState(false);
  const grandTotal = abiertas.reduce((sum, o) => sum + orderTotal(o.items), 0);

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💵 Caja</h2>
        <button onClick={() => setShowPinSettings((s) => !s)} style={{ fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, color: "#8a7a63" }}>⚙️ Cambiar PIN</button>
      </div>
      {abiertas.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #2B2118, #3d2f22)", borderRadius: 12, padding: "12px 18px", margin: "12px 0 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#F2C879", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>CUENTAS ABIERTAS: {abiertas.length}</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{money(grandTotal)}</span>
        </div>
      )}
      {showPinSettings && <ChangePin current={pin} onChange={(p) => { onChangePin(p); setShowPinSettings(false); }} />}
      {abiertas.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#8a7a63" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💵</div>
          <p>No hay cuentas abiertas.</p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 14 }}>
        {abiertas.map((o) => {
          const total = orderTotal(o.items);
          const key = o.kind + o.id;
          const m = method[key] || "Efectivo";
          const finalTotal = discountedTotal(o.items, key);
          const hasDiscount = finalTotal < total;
          return (
            <div key={key} style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 14, padding: 16, boxShadow: "0 3px 8px rgba(0,0,0,0.06)" }}>
              <strong style={{ fontSize: 16 }}>{o.label}</strong>
              <ul style={{ margin: "10px 0", paddingLeft: 18, fontSize: 13, color: "#5a4c3a" }}>
                {o.items.map((it) => <li key={it.menuId}>{it.qty}x {it.name} — {money(it.price * it.qty)}</li>)}
              </ul>

              <button
                onClick={() => setDiscountOpen((s) => ({ ...s, [key]: !s[key] }))}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "none", border: "1px dashed #C1272D", color: "#C1272D", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, marginBottom: 10 }}
              >
                <Percent size={13} /> {discountOpen[key] ? "Ocultar descuento" : "Aplicar descuento"}
              </button>

              {discountOpen[key] && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                  <select value={discountType[key] || "percent"} onChange={(e) => setDiscountType((s) => ({ ...s, [key]: e.target.value }))} style={{ ...inp, maxWidth: 90, padding: 7 }}>
                    <option value="percent">%</option>
                    <option value="amount">C$</option>
                  </select>
                  <input type="number" placeholder="0" value={discountValue[key] || ""} onChange={(e) => setDiscountValue((s) => ({ ...s, [key]: e.target.value }))} style={{ ...inp, padding: 7 }} />
                </div>
              )}

              {hasDiscount ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a7a63", textDecoration: "line-through" }}>
                    <span>Subtotal</span><span>{money(total)}</span>
                  </div>
                  <div style={{ background: "#FFF3E8", borderRadius: 8, padding: "8px 12px", fontWeight: 800, fontSize: 17, color: "#C1272D", display: "flex", justifyContent: "space-between" }}>
                    <span>Total</span><span>{money(finalTotal)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#FFF3E8", borderRadius: 8, padding: "8px 12px", fontWeight: 800, fontSize: 17, marginBottom: 10, color: "#C1272D" }}>Total: {money(total)}</div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["Efectivo", "Tarjeta"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setMethod((s) => ({ ...s, [key]: opt }))}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      border: "none",
                      background: m === opt ? "linear-gradient(135deg, #C1272D, #E8A33D)" : "#F3ECE0", color: m === opt ? "#fff" : "#5a4c3a",
                    }}
                  >
                    <Wallet size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{opt}
                  </button>
                ))}
              </div>
              <button onClick={() => onCharge(o.kind, o.id, m, getDiscount(key))} style={{ width: "100%", padding: 12, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #2B2118, #3d2f22)", color: "#F2C879", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                Cobrar y cerrar →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  function Section({ title, icon, list }) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#8a7a63", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{icon} {title} ({list.length})</h3>
        {list.length === 0 && <p style={{ color: "#C9BBA3", fontSize: 13 }}>Sin pedidos activos.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
          {list.map((d) => {
            const st = statusStyle(d.kitchenStatus, d.items.length > 0);
            return (
              <button key={d.id} onClick={() => onOpen(d.id)} style={{ textAlign: "left", background: st.grad, border: "none", borderRadius: 14, padding: 16, cursor: "pointer", color: st.text, boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong style={{ fontSize: 16 }}>{d.customer}</strong>
                  <span style={{ fontSize: 20 }}>{st.icon}</span>
                </div>
                {d.address && <p style={{ margin: "6px 0 2px", fontSize: 12, opacity: 0.9 }}>📍 {d.address}</p>}
                <p style={{ margin: "2px 0 8px", fontSize: 12, opacity: 0.9 }}>📞 {d.phone}</p>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, background: "rgba(255,255,255,0.3)", display: "inline-block", padding: "3px 10px", borderRadius: 20 }}>{st.label}</div>
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
          <Section title="Delivery" icon="🛵" list={delivery} />
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

function MenuBoardView({ promotions }) {
  return (
    <div style={{ background: "#2B2118", borderRadius: 16, padding: "28px 24px", color: "#FFF8ED" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40 }}>🍔🍗</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#F2C879" }}>{RESTAURANT_NAME}</div>
        <div style={{ fontSize: 13, color: "#C9BBA3", letterSpacing: 1 }}>MASATEPE · MASAYA · NICARAGUA</div>
      </div>

      {promotions && promotions.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #C1272D, #E8A33D)", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: 1 }}>🏷️ PROMOCIONES DE HOY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {promotions.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontWeight: 700, color: "#fff" }}>{p.name}</span>
                <span style={{ fontWeight: 800, color: "#fff" }}>{money(p.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {CATS.map((cat) => (
          <div key={cat}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#F2C879", borderBottom: "2px solid #F2C879", paddingBottom: 4, marginBottom: 8, letterSpacing: 0.5 }}>
              {CAT_ICONS[cat]} {cat.toUpperCase()}
            </div>
            {MENU.filter((m) => m.cat === cat).map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 15 }}>
                <span>{m.name}</span>
                <span style={{ fontWeight: 700, color: "#F2C879" }}>{money(m.price)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistorialView({ salesLog, expensesLog }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🗄️ Historial permanente</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 16 }}>
        Este registro nunca se borra, aunque uses los botones de "Borrar" en Reportes — queda como respaldo completo de todo lo vendido y gastado.
      </p>

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
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{s.ref} · {s.method}{s.discountAmount > 0 ? ` · 🏷️ -${money(s.discountAmount)}` : ""}</span>
            <strong>{money(s.total)}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#8a7a63" }}>{new Date(s.time).toLocaleString("es-NI")}</div>
        </div>
      ))}

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 20 }}>Gastos</h3>
      {filteredExpenses.length === 0 && <p style={{ color: "#8a7a63" }}>Sin gastos en este rango.</p>}
      {filteredExpenses.map((e) => (
        <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{e.description}</span>
            <strong style={{ color: "#C1272D" }}>-{money(e.amount)}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#8a7a63" }}>{new Date(e.time).toLocaleString("es-NI")}</div>
        </div>
      ))}
    </div>
  );
}

function EmpleadosView({ employees, clockRecords, onAdd, onClockIn }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const today = todayStr();
  const todayRecords = clockRecords.filter((r) => new Date(r.time).toDateString() === today).slice().reverse();

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Empleados</h2>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0 }}>Turno: {SHIFT_START} a {SHIFT_END} (tolerancia {LATE_GRACE_MIN} min)</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Nombre del nuevo empleado" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, maxWidth: 220 }} />
        <button onClick={() => { onAdd(name); setName(""); }} style={{ padding: "0 16px", border: "none", borderRadius: 6, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Agregar empleado</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inp, maxWidth: 220 }}>
          <option value="">Selecciona un empleado</option>
          {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
        </select>
        <button
          disabled={!selected}
          onClick={() => onClockIn(selected)}
          style={{ padding: "10px 16px", border: "none", borderRadius: 6, background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: selected ? 1 : 0.5 }}
        >
          Marcar entrada
        </button>
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Entradas de hoy</h3>
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

const lbl = { display: "block", fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 };
const inp = { width: "100%", padding: 9, borderRadius: 6, border: "1px solid #E5D9C3", fontSize: 14, boxSizing: "border-box" };

function ReportesView({ sales, expenses, onAddExpense, onDeleteSale, onDeleteExpense, onClearDay, onClearMonth, clockRecords }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  });

  const dayStr = new Date(selectedDate + "T12:00:00").toDateString();
  const isToday = dayStr === todayStr();

  const todaySales = sales.filter((s) => new Date(s.time).toDateString() === dayStr);
  const todayExpenses = expenses.filter((e) => new Date(e.time).toDateString() === dayStr);
  const income = todaySales.reduce((sum, s) => sum + s.total, 0);
  const spent = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const net = income - spent;
  const count = todaySales.length;
  const lateToday = clockRecords.filter((r) => new Date(r.time).toDateString() === dayStr && r.late).length;

  const monthKey = selectedDate.slice(0, 7);
  const monthSales = sales.filter((s) => s.time.slice(0, 7) === monthKey);
  const monthExpenses = expenses.filter((e) => e.time.slice(0, 7) === monthKey);
  const monthIncome = monthSales.reduce((sum, s) => sum + s.total, 0);
  const monthSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthNet = monthIncome - monthSpent;
  const [yy, mm] = monthKey.split("-");
  const monthLabel = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("es-NI", { month: "long", year: "numeric" });

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const byItem = useMemo(() => {
    const map = {};
    todaySales.forEach((s) => s.items.forEach((it) => { map[it.name] = (map[it.name] || 0) + it.qty; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [todaySales]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{isToday ? "Reporte de hoy" : "Reporte del día seleccionado"}</h2>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ ...inp, maxWidth: 170 }} />
      </div>
      <p style={{ fontSize: 12, color: "#8a7a63", marginTop: 0, marginBottom: 12 }}>
        Viendo: {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={statCard}><div style={statLabel}>Ingresos</div><div style={statValue}>{money(income)}</div></div>
        <div style={statCard}><div style={statLabel}>Gastos</div><div style={{ ...statValue, color: "#C1272D" }}>{money(spent)}</div></div>
        <div style={statCard}><div style={statLabel}>Neto</div><div style={statValue}>{money(net)}</div></div>
        <div style={statCard}><div style={statLabel}>Pedidos cerrados</div><div style={statValue}>{count}</div></div>
        <div style={statCard}><div style={statLabel}>Llegadas tarde</div><div style={statValue}>{lateToday}</div></div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20, marginTop: 8 }}>
        <div style={statCard}><div style={statLabel}>Ingresos del mes</div><div style={statValue}>{money(monthIncome)}</div></div>
        <div style={statCard}><div style={statLabel}>Gastos del mes</div><div style={{ ...statValue, color: "#C1272D" }}>{money(monthSpent)}</div></div>
        <div style={statCard}><div style={statLabel}>Neto del mes</div><div style={statValue}>{money(monthNet)}</div></div>
        <div style={statCard}><div style={statLabel}>Ventas del mes</div><div style={statValue}>{monthSales.length}</div></div>
      </div>

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Registrar gasto</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input placeholder="Descripción (ej: gas, hielo)" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inp, maxWidth: 240 }} />
        <input placeholder="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, maxWidth: 120 }} />
        <button
          disabled={!desc || !amount}
          onClick={() => { onAddExpense({ description: desc, amount: Number(amount) }); setDesc(""); setAmount(""); }}
          style={{ padding: "0 16px", border: "none", borderRadius: 6, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: desc && amount ? 1 : 0.5 }}
        >
          Agregar gasto
        </button>
      </div>
      {todayExpenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {todayExpenses.slice().reverse().map((e) => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
              <span>{e.description}</span>
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
        <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 14 }}>
          <span>{name}</span><span style={{ fontWeight: 700 }}>{qty}</span>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", margin: 0 }}>Historial de cobros</h3>
        {(todaySales.length > 0 || todayExpenses.length > 0) && (
          <button
            onClick={() => { if (window.confirm("¿Borrar todas las ventas y gastos de este día? Esto no se puede deshacer.")) onClearDay(dayStr); }}
            style={{ fontSize: 11, background: "none", border: "1px solid #C1272D", color: "#C1272D", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}
          >
            Borrar día completo
          </button>
        )}
      </div>
      {todaySales.length === 0 && <p style={{ color: "#8a7a63" }}>Sin cobros ese día.</p>}
      {todaySales.slice().reverse().map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
          <span>{s.ref} · {s.method}{s.discountAmount > 0 ? ` · 🏷️ -${money(s.discountAmount)}` : ""}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700 }}>{money(s.total)}</span>
            <button onClick={() => { if (window.confirm("¿Borrar esta venta?")) onDeleteSale(s.id); }} style={{ background: "none", border: "none", color: "#8a7a63", cursor: "pointer", padding: 2 }}><X size={14} /></button>
          </div>
        </div>
      ))}
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
