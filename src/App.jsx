import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Minus, X, Send, CheckCircle2, Clock, ChefHat, UtensilsCrossed, Receipt, Bike, BarChart3, Lock, Printer, UserCheck, Wallet } from "lucide-react";

const supabaseUrl = "https://tgzxcmorfgpblfsgwcgv.supabase.co";
const supabaseKey = "sb_publishable_BDJcoHqoybh94C8tm0AoLg_rsQuZ51P";
const supabase = createClient(supabaseUrl, supabaseKey);
const RECORD_ID = "main"; // versión con diagnóstico visible
const RESTAURANT_NAME = "El Sabor de lo Nuestro";
const SHIFT_START = "17:00"; // 5:00 PM
const SHIFT_END = "21:00"; // 9:00 PM
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
];

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
    pin: DEFAULT_PIN,
  };
}
function todayStr() {
  return new Date().toDateString();
}

export default function App() {
  const [state, setState] = useState(initialState());
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("mesas");
  const [activeTable, setActiveTable] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [cajaUnlocked, setCajaUnlocked] = useState(false);
  const [receiptFor, setReceiptFor] = useState(null);
  const [connStatus, setConnStatus] = useState("Conectando…");
  const [connError, setConnError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const skipNextPoll = useRef(false);
  const initRef = useRef(false);

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

  const { tables, deliveries, sales, expenses, employees, clockRecords, pin } = state;

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
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? { ...t, kitchenStatus: "pendiente" } : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, kitchenStatus: "pendiente" } : d)));
  }
  function advanceKitchen(kind, id, next) {
    if (kind === "table") withTables((ts) => ts.map((t) => (t.id === id ? { ...t, kitchenStatus: next } : t)));
    else withDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, kitchenStatus: next } : d)));
  }
  function closeTicket(kind, id, method) {
    if (kind === "table") {
      const t = tables.find((t) => t.id === id);
      if (!t.items.length) return;
      const sale = { id: Date.now(), kind: "mesa", ref: `Mesa ${t.id}`, items: t.items, total: orderTotal(t.items), method, time: new Date().toISOString() };
      const next = {
        ...state,
        sales: [...sales, sale],
        tables: tables.map((x) => (x.id === id ? { ...x, status: "libre", kitchenStatus: null, items: [] } : x)),
      };
      persist(next);
      setActiveTable(null);
      setReceiptFor(sale);
    } else {
      const d = deliveries.find((d) => d.id === id);
      if (!d.items.length) return;
      const sale = { id: Date.now(), kind: "delivery", ref: d.customer, items: d.items, total: orderTotal(d.items), method, time: new Date().toISOString() };
      const next = {
        ...state,
        sales: [...sales, sale],
        deliveries: deliveries.map((x) => (x.id === id ? { ...x, kitchenStatus: "entregado" } : x)),
      };
      persist(next);
      setActiveDelivery(null);
      setReceiptFor(sale);
    }
  }
  function addExpense(exp) {
    persist({ ...state, expenses: [...expenses, { id: Date.now(), ...exp, time: new Date().toISOString() }] });
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

  const nav = [
    { id: "mesas", label: "Mesas", icon: UtensilsCrossed },
    { id: "cocina", label: "Cocina", icon: ChefHat },
    { id: "caja", label: "Caja", icon: Receipt },
    { id: "delivery", label: "Delivery", icon: Bike },
    { id: "empleados", label: "Empleados", icon: UserCheck },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
  ];

  if (!loaded) {
    return <div style={{ padding: 40, textAlign: "center", color: "#8a7a63" }}>Cargando…</div>;
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#FFF8ED", minHeight: "100vh", color: "#2B2118" }}>
      <div style={{
        background: connError ? "#C1272D" : "#2E7D32", color: "#fff", fontSize: 12, fontWeight: 700,
        padding: "6px 14px", textAlign: "center",
      }}>
        {connError ? `⚠️ ${connStatus}: ${connError}` : `✅ ${connStatus}${lastSync ? " · última sync " + lastSync.toLocaleTimeString("es-NI") : ""}`}
      </div>
      <div style={{ background: "#2B2118", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: "#FFF8ED", fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.5 }}>
          🍔 {RESTAURANT_NAME}
        </h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
        </div>
      </div>

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

        {view === "empleados" && (
          <EmpleadosView employees={employees} clockRecords={clockRecords} onAdd={addEmployee} onClockIn={clockIn} />
        )}

        {view === "reportes" && <ReportesView sales={sales} expenses={expenses} onAddExpense={addExpense} clockRecords={clockRecords} />}
      </div>

      {activeTable && (
        <OrderModal
          title={`Mesa ${activeTable}`}
          items={tables.find((t) => t.id === activeTable).items}
          kitchenStatus={tables.find((t) => t.id === activeTable).kitchenStatus}
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

function statusColor(kitchenStatus, hasItems) {
  if (!hasItems) return { bg: "#EFE6D8", border: "#C9BBA3", label: "Libre" };
  if (!kitchenStatus) return { bg: "#F2C879", border: "#C99A1E", label: "Armando orden" };
  if (kitchenStatus === "pendiente") return { bg: "#F0997B", border: "#C1531F", label: "En cocina" };
  if (kitchenStatus === "preparando") return { bg: "#F0997B", border: "#C1531F", label: "Preparando" };
  if (kitchenStatus === "listo") return { bg: "#97C459", border: "#4E7C1F", label: "Listo p/ servir" };
  return { bg: "#EFE6D8", border: "#C9BBA3", label: "Libre" };
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
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Piso — 5 mesas</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {tables.map((t) => {
          const sc = statusColor(t.kitchenStatus, t.items.length > 0);
          const total = orderTotal(t.items);
          return (
            <button key={t.id} onClick={() => onOpen(t.id)} style={{ background: sc.bg, border: `2px solid ${sc.border}`, borderRadius: 12, padding: "18px 12px", cursor: "pointer", textAlign: "left", color: "#2B2118" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Mesa {t.id}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{sc.label}</div>
              {t.items.length > 0 && <div style={{ fontSize: 13, marginTop: 8, fontWeight: 700 }}>{money(total)}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderModal({ title, items, kitchenStatus, onAdd, onQty, onNote, onSend, onClose }) {
  const [cat, setCat] = useState(CATS[0]);
  const total = orderTotal(items);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#FFF8ED", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#2B2118", color: "#FFF8ED", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#FFF8ED", cursor: "pointer" }}><X size={22} /></button>
        </div>
        <div style={{ display: "flex", overflow: "auto", flex: 1 }}>
          <div style={{ width: 150, borderRight: "1px solid #E5D9C3", flexShrink: 0 }}>
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 10px", border: "none", background: cat === c ? "#F2C879" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: 12, overflow: "auto" }}>
            {MENU.filter((m) => m.cat === cat).map((m) => (
              <button key={m.id} onClick={() => onAdd(m)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer", fontSize: 14 }}>
                <span>{m.name}</span>
                <span style={{ fontWeight: 700 }}>{money(m.price)}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid #E5D9C3", padding: 12, maxHeight: 220, overflow: "auto" }}>
          {items.length === 0 && <p style={{ fontSize: 13, color: "#8a7a63" }}>Sin productos agregados todavía.</p>}
          {items.map((it) => (
            <div key={it.menuId} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{it.name}</span>
                <button onClick={() => onQty(it.menuId, -1)} style={iconBtn}><Minus size={14} /></button>
                <span style={{ minWidth: 18, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{it.qty}</span>
                <button onClick={() => onQty(it.menuId, 1)} style={iconBtn}><Plus size={14} /></button>
                <span style={{ minWidth: 70, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{money(it.price * it.qty)}</span>
              </div>
              <input placeholder="Nota (ej: sin cebolla)" value={it.notes} onChange={(e) => onNote(it.menuId, e.target.value)} style={{ marginTop: 4, width: "100%", fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #E5D9C3", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: "1px solid #E5D9C3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Total: {money(total)}</div>
          <button onClick={onSend} disabled={!items.length} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, border: "none", cursor: items.length ? "pointer" : "not-allowed", background: "#C1272D", color: "#fff", fontWeight: 700, opacity: items.length ? 1 : 0.5 }}>
            <Send size={16} /> {kitchenStatus ? "Actualizar cocina" : "Enviar a cocina"}
          </button>
        </div>
      </div>
    </div>
  );
}

const iconBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

function CocinaView({ tables, deliveries, onAdvance }) {
  const pendientes = [
    ...tables.filter((t) => t.kitchenStatus === "pendiente" || t.kitchenStatus === "preparando").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.kitchenStatus === "pendiente" || d.kitchenStatus === "preparando").map((d) => ({ kind: "delivery", id: d.id, label: `Delivery: ${d.customer}`, ...d })),
  ];
  const listos = [
    ...tables.filter((t) => t.kitchenStatus === "listo").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.kitchenStatus === "listo").map((d) => ({ kind: "delivery", id: d.id, label: `Delivery: ${d.customer}`, ...d })),
  ];
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Cocina</h2>
      {pendientes.length === 0 && listos.length === 0 && <p style={{ color: "#8a7a63" }}>No hay pedidos en cocina por ahora.</p>}
      {pendientes.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 16 }}>En preparación</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {pendientes.map((o) => (
              <div key={o.kind + o.id} style={{ background: "#fff", border: "2px solid #F0997B", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{o.label}</strong>
                  <Clock size={16} color="#C1531F" />
                </div>
                <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
                  {o.items.map((it) => (
                    <li key={it.menuId}>{it.qty}x {it.name} {it.notes && <em style={{ color: "#8a7a63" }}> ({it.notes})</em>}</li>
                  ))}
                </ul>
                {o.kitchenStatus === "pendiente" ? (
                  <button onClick={() => onAdvance(o.kind, o.id, "preparando")} style={kitchenBtn("#E8A33D")}>Empezar a preparar</button>
                ) : (
                  <button onClick={() => onAdvance(o.kind, o.id, "listo")} style={kitchenBtn("#639922")}><CheckCircle2 size={14} /> Marcar listo</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {listos.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 20 }}>Listos para servir</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {listos.map((o) => (
              <div key={o.kind + o.id} style={{ background: "#EAF3DE", border: "2px solid #639922", borderRadius: 10, padding: 14 }}>
                <strong>{o.label}</strong>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#3B6D11", fontWeight: 700 }}>Listo — avisar al mesero</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function kitchenBtn(bg) {
  return { marginTop: 8, width: "100%", padding: "8px 0", border: "none", borderRadius: 6, background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
}

function CajaView({ tables, deliveries, onCharge, pin, onChangePin }) {
  const abiertas = [
    ...tables.filter((t) => t.items.length > 0).map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.items.length > 0 && d.kitchenStatus !== "entregado").map((d) => ({ kind: "delivery", id: d.id, label: `Delivery: ${d.customer}`, ...d })),
  ];
  const [method, setMethod] = useState({});
  const [showPinSettings, setShowPinSettings] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Caja</h2>
        <button onClick={() => setShowPinSettings((s) => !s)} style={{ fontSize: 12, background: "none", border: "1px solid #E5D9C3", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cambiar PIN</button>
      </div>
      {showPinSettings && <ChangePin current={pin} onChange={(p) => { onChangePin(p); setShowPinSettings(false); }} />}
      {abiertas.length === 0 && <p style={{ color: "#8a7a63" }}>No hay cuentas abiertas.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {abiertas.map((o) => {
          const total = orderTotal(o.items);
          const key = o.kind + o.id;
          const m = method[key] || "Efectivo";
          return (
            <div key={key} style={{ background: "#fff", border: "1px solid #E5D9C3", borderRadius: 10, padding: 14 }}>
              <strong>{o.label}</strong>
              <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
                {o.items.map((it) => <li key={it.menuId}>{it.qty}x {it.name} — {money(it.price * it.qty)}</li>)}
              </ul>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Total: {money(total)}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {["Efectivo", "Tarjeta"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setMethod((s) => ({ ...s, [key]: opt }))}
                    style={{
                      flex: 1, padding: 10, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      border: m === opt ? "2px solid #C1272D" : "1px solid #E5D9C3",
                      background: m === opt ? "#FCEBEB" : "#fff", color: m === opt ? "#791F1F" : "#2B2118",
                    }}
                  >
                    <Wallet size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{opt}
                  </button>
                ))}
              </div>
              <button onClick={() => onCharge(o.kind, o.id, m)} style={{ width: "100%", padding: 10, border: "none", borderRadius: 8, background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Cobrar y cerrar
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
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Delivery</h2>
        <button onClick={onNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 8, background: "#2B2118", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          <Plus size={16} /> Nuevo pedido
        </button>
      </div>
      {activos.length === 0 && <p style={{ color: "#8a7a63" }}>No hay pedidos de delivery activos.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {activos.map((d) => {
          const sc = statusColor(d.kitchenStatus, d.items.length > 0);
          return (
            <button key={d.id} onClick={() => onOpen(d.id)} style={{ textAlign: "left", background: sc.bg, border: `2px solid ${sc.border}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
              <strong>{d.customer}</strong>
              <p style={{ margin: "4px 0", fontSize: 12 }}>{d.phone}</p>
              <p style={{ margin: "4px 0", fontSize: 12 }}>{d.address}</p>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{sc.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewDeliveryModal({ onCreate, onClose }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#FFF8ED", borderRadius: 12, width: "100%", maxWidth: 380, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Nuevo pedido delivery</h3>
        <label style={lbl}>Nombre del cliente</label>
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inp} />
        <label style={lbl}>Teléfono</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} />
        <label style={lbl}>Dirección</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={inp} />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5D9C3", background: "#fff", cursor: "pointer" }}>Cancelar</button>
          <button disabled={!customer || !phone || !address} onClick={() => onCreate({ customer, phone, address })} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#C1272D", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: customer && phone && address ? 1 : 0.5 }}>
            Crear
          </button>
        </div>
      </div>
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

function ReportesView({ sales, expenses, onAddExpense, clockRecords }) {
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

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Balance del mes — {monthLabel}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
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
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
              <span>{e.description}</span>
              <span style={{ fontWeight: 700, color: "#C1272D" }}>-{money(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63" }}>Productos más vendidos hoy</h3>
      {byItem.length === 0 && <p style={{ color: "#8a7a63" }}>Aún no hay ventas registradas hoy.</p>}
      {byItem.map(([name, qty]) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 14 }}>
          <span>{name}</span><span style={{ fontWeight: 700 }}>{qty}</span>
        </div>
      ))}

      <h3 style={{ fontSize: 13, textTransform: "uppercase", color: "#8a7a63", marginTop: 20 }}>Historial de cobros</h3>
      {todaySales.length === 0 && <p style={{ color: "#8a7a63" }}>Sin cobros todavía.</p>}
      {todaySales.slice().reverse().map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5D9C3", fontSize: 13 }}>
          <span>{s.ref} · {s.method}</span><span style={{ fontWeight: 700 }}>{money(s.total)}</span>
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
  const [contact, setContact] = useState("");

  const receiptText = [
    RESTAURANT_NAME,
    date.toLocaleString("es-NI"),
    sale.ref,
    "",
    ...sale.items.map((it) => `${it.qty}x ${it.name} - ${money(it.price * it.qty)}`),
    "",
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
        <div id="printable-receipt" style={{ padding: 16, fontFamily: "monospace", fontSize: 13 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15 }}>{RESTAURANT_NAME}</div>
          <div style={{ textAlign: "center", fontSize: 11, marginBottom: 8 }}>{date.toLocaleString("es-NI")}</div>
          <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />
          <div>{sale.ref}</div>
          <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />
          {sale.items.map((it) => (
            <div key={it.menuId} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{it.qty}x {it.name}</span>
              <span>{money(it.price * it.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>Total</span><span>{money(sale.total)}</span>
          </div>
          <div>Pago: {sale.method}</div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11 }}>¡Gracias por su compra!</div>
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
