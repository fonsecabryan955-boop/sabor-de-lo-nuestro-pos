import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://aczzqxaqxbghkwl5s2s8.supabase.co";
const supabaseKey = "sb_publishable_BDJcoHqoybh94C8tm0AoLg_rsQuZ51P";
const supabase = createClient(SUPABASE_URL, supabaseKey);
const RECORD_ID = 1;
const POLL_MS = 4000;

function money(n) {
  return "C$" + (n || 0).toFixed(2);
}

function timeStr(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleString("es-NI", { dateStyle: "long", timeStyle: "short" });
}

function computeTotal(items, discount) {
  const subtotal = items.reduce((sum, it) => sum + (it.qty || 1) * (it.price || 0), 0);
  let total = subtotal;
  if (discount && discount.type) {
    if (discount.type === "percent") total = subtotal * (1 - discount.value / 100);
    else if (discount.type === "fixed") total = Math.max(0, subtotal - discount.value);
  }
  return { subtotal, total };
}

function buildOrderPayload(items) {
  return items.map((it) => `${it.name} x${it.qty}`).join("\n");
}

const initialEmployees = () => [
  { id: "Maria", name: "Maria", color: "#ff6b6b", active: true },
  { id: "Luis", name: "Luis", color: "#4ecdc4", active: true },
  { id: "Andrea", name: "Andrea", color: "#45b7d1", active: true },
  { id: "Sofía", name: "Sofía", color: "#f9ca24", active: true },
];

const fullMenu = () => [
  { id: "c1", name: "Hamburguesa Classic", price: 9.99, cat: "Hamburguesas" },
  { id: "c2", name: "Hamburguesa BBQ", price: 11.99, cat: "Hamburguesas" },
  { id: "c3", name: "Pizza Napolitana", price: 12.99, cat: "Pizza" },
  { id: "c4", name: "Pizza Hawaiana", price: 13.99, cat: "Pizza" },
  { id: "c5", name: "Pizza de Pollo", price: 13.99, cat: "Pizza" },
  { id: "c6", name: "Lasaña Boloñesa", price: 10.99, cat: "Pasta" },
  { id: "c7", name: "Spaghetti Alfredo", price: 9.99, cat: "Pasta" },
  { id: "c8", name: "Nachos de Carne", price: 7.99, cat: "Entradas" },
  { id: "c9", name: "Aros de Cebolla", price: 5.99, cat: "Entradas" },
  { id: "c10", name: "Café Latte", price: 3.99, cat: "Bebidas" },
  { id: "c11", name: "Refresco Natural", price: 2.99, cat: "Bebidas" },
  { id: "c12", name: "Vaso de Cerveza", price: 2.99, cat: "Bebidas" },
  { id: "c13", name: "Papas Fritas", price: 3.99, cat: "Entradas" },
  { id: "c14", name: "Alitas BBQ x6", price: 8.99, cat: "Chicken Mood" },
  { id: "c15", name: "Alitas BBQ x12", price: 14.99, cat: "Chicken Mood" },
  { id: "c16", name: "Alitas Honey Mustard x6", price: 8.99, cat: "Chicken Mood" },
  { id: "c17", name: "Alitas Honey Mustard x12", price: 14.99, cat: "Chicken Mood" },
  { id: "c18", name: "Alitas Buffalo x6", price: 8.99, cat: "Chicken Mood" },
  { id: "c19", name: "Alitas Buffalo x12", price: 14.99, cat: "Chicken Mood" },
  { id: "c20", name: "Alitas Fritas", price: 6.99, cat: "Chicken Mood" },
];

const wingSauces = [
  { id: "bbq", name: "BBQ", description: "Clásica salsa BBQ ahumada" },
  { id: "honey", name: "Honey Mustard", description: "Dulce y ligeramente picante" },
  { id: "buffalo", name: "Buffalo", description: "Picante estilo americano" },
  { id: "teriyaki", name: "Teriyaki", description: "Agridulce con toque oriental" },
  { id: "lemon", name: "Lemon Pepper", description: "Cítrica y aromática" },
  { id: "garlic", name: "Garlic Parmesan", description: "Con ajo y queso parmesano" },
];

const initialPromotions = () => [
  { id: "p1", name: "Combo Familiar", items: ["c2", "c3", "c13"], price: 28.99, description: "Hamburguesa BBQ + Pizza Napolitana + Papas Fritas", days: "Lunes a Jueves" },
  { id: "p2", name: "Alitas x2", items: ["c14", "c15"], price: 16.99, description: "2 órdenes de alitas (6 pzas c/u) + papas", days: "Viernes y Sábado" },
  { id: "p3", name: "2x1 en Pizza", items: ["c3"], price: 12.99, description: "Compra 1 pizza Napolitana y lleva la segunda gratis", days: "Domingos" },
];

const initialTables = () =>
  Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    items: [],
    waiter: null,
    startTime: null,
    kitchenStatus: null,
    kitchenSentAt: null,
  }));

const initialDeliveries = () => [
  { id: 1, customer: "Juan Pérez", phone: "8888-8888", address: "Calle 1, Casa 5", items: [], kitchenStatus: null, kitchenSentAt: null, type: "delivery" },
  { id: 2, customer: "María López", phone: "7777-7777", address: "Av. Principal, Edif. B", items: [], kitchenStatus: null, kitchenSentAt: null, type: "delivery" },
];

function initialState() {
  return {
    tables: initialTables(),
    deliveries: initialDeliveries(),
    sales: [],
    expenses: [],
    employees: initialEmployees(),
    cashSessions: [],
    pin: "1234",
    salesGoal: 5000,
  };
}

export default function App() {
  const [state, setState] = useState(initialState());
  const { tables, deliveries, sales, expenses, employees, cashSessions, pin, salesGoal } = state;
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      return window.location.hash.replace("#", "");
    }
    return "mesas";
  });
  const [activeTable, setActiveTable] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [receiptFor, setReceiptFor] = useState(null);
  const [connStatus, setConnStatus] = useState("Conectando...");
  const [connError, setConnError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const skipNextPoll = useRef(false);
  const initRef = useRef(false);

  const persist = useCallback(
    async (next) => {
      skipNextPoll.current = true;
      setState(next);
      const { data, error } = await supabase
        .from("pos_state")
        .update({ value: JSON.stringify(next), updated_at: new Date().toISOString() })
        .eq("id", RECORD_ID)
        .select("id")
        .single();
      if (error) {
        setConnStatus("Error al guardar");
        setConnError(error.message || JSON.stringify(error));
      } else {
        setConnStatus("Guardado en línea");
        setConnError(null);
        setLastSync(new Date());
      }
    },
    []
  );

  function withTables(fn) {
    persist({ ...state, tables: fn(tables) });
  }
  function withDeliveries(fn) {
    persist({ ...state, deliveries: fn(deliveries) });
  }
  function withSales(fn) {
    persist({ ...state, sales: fn(sales) });
  }
  function withExpenses(fn) {
    persist({ ...state, expenses: fn(expenses) });
  }
  function withEmployees(fn) {
    persist({ ...state, employees: fn(employees) });
  }
  function withCashSessions(fn) {
    persist({ ...state, cashSessions: fn(cashSessions) });
  }

  function addItemToOrder(items, menuItem) {
    const existing = items.find((it) => it.menuId === menuItem.id);
    if (existing) {
      return items.map((it) => (it.menuId === menuItem.id ? { ...it, qty: it.qty + 1 } : it));
    }
    return [...items, { menuId: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 }];
  }

  function removeItemFromOrder(items, menuId) {
    return items
      .map((it) => (it.menuId === menuId ? { ...it, qty: it.qty - 1 } : it))
      .filter((it) => it.qty > 0);
  }

  function openCashSession(employee, amount) {
    const session = { id: Date.now(), employee, openingAmount: amount, openingTime: new Date().toISOString(), closingTime: null, closingAmount: null, expectedCash: null, verified: false };
    withCashSessions((s) => [...s, session]);
  }

  function closeCashSession(employee, amount) {
    const active = cashSessions.filter((s) => !s.closingTime).find((s) => s.employee === employee);
    if (!active) return alert("No hay sesión abierta para " + employee);
    const cash = sales.filter((s) => s.method === "efectivo" && s.time >= active.openingTime && s.time <= new Date().toISOString()).reduce((sum, s) => sum + s.total, 0);
    const expensesTotal = expenses.filter((e) => e.time >= active.openingTime && e.time <= new Date().toISOString()).reduce((sum, e) => sum + e.amount, 0);
    const expected = active.openingAmount + cash - expensesTotal;
    if (amount !== expected) {
      const ok = window.confirm(`El monto ingresado (${money(amount)}) no coincide con el esperado (${money(expected)}). ¿Deseas continuar?`);
      if (!ok) return;
    }
    const closed = { ...active, closingTime: new Date().toISOString(), closingAmount: amount, expectedCash: expected, verified: amount === expected };
    withCashSessions((s) => s.map((sess) => (sess.id === active.id ? closed : sess)));
  }

  function closeTicket(kind, id, method, discount, tip, itemMenuIds) {
    const collection = kind === "table" ? tables : deliveries;
    const item = collection.find((x) => x.id === id);
    if (!item) return;
    const splitting = Array.isArray(itemMenuIds) && itemMenuIds.length > 0;
    const itemsToCharge = splitting ? item.items.filter((it) => itemMenuIds.includes(it.menuId)) : item.items;
    const remainingItems = splitting ? item.items.filter((it) => !itemMenuIds.includes(it.menuId)) : [];
    const { subtotal, total } = computeTotal(itemsToCharge, discount);
    const tipAmount = Number(tip) || 0;
    const sale = {
      id: Date.now() + Math.random(),
      kind,
      ref: kind === "table" ? `Mesa ${id}` : item.customer,
      items: itemsToCharge,
      subtotal,
      total: total + tipAmount,
      tip: tipAmount,
      method,
      discount,
      time: new Date().toISOString(),
    };
    if (method === "efectivo" && cashGivenRef.current) {
      const key = kind + id;
      const given = Number(cashGivenRef.current[key]) || 0;
      if (given > 0) sale.cashGiven = given;
    }
    withSales((s) => [...s, sale]);
    if (kind === "table") {
      if (remainingItems.length > 0) {
        withTables((t) => t.map((tbl) => (tbl.id === id ? { ...tbl, items: remainingItems, startTime: tbl.startTime || new Date().toISOString() } : tbl)));
      } else {
        withTables((t) => t.map((tbl) => (tbl.id === id ? { ...tbl, items: [], waiter: null, startTime: null, kitchenStatus: null, kitchenSentAt: null } : tbl)));
      }
    } else {
      withDeliveries((d) => d.map((del) => (del.id === id ? { ...del, items: [], kitchenStatus: null, kitchenSentAt: null } : del)));
    }
    setReceiptFor(sale);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from("pos_state").select("value").eq("id", RECORD_ID).maybeSingle();
      if (error) {
        if (alive) {
          setConnStatus("Error al cargar");
          setConnError(error.message || JSON.stringify(error));
        }
      } else if (data && alive) {
        try {
          const next = JSON.parse(data.value);
          setState(next);
          setConnStatus("Conectado");
          setConnError(null);
          setLastSync(new Date());
        } catch (e) {
          if (alive) setConnStatus("Datos corruptos");
        }
      } else if (alive) {
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
      const { data, error } = await supabase.from("pos_state").select("value, updated_at").eq("id", RECORD_ID).maybeSingle();
      if (error) {
        if (alive) {
          setConnStatus("Error al sincronizar");
          setConnError(error.message || JSON.stringify(error));
        }
      } else if (data && alive) {
        try {
          const next = JSON.parse(data.value);
          setState(next);
          setConnStatus("Sincronizado");
          setConnError(null);
          setLastSync(new Date());
        } catch (e) {
          if (alive) setConnStatus("Datos corruptos");
        }
      }
    }, POLL_MS);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (loaded && !initRef.current) {
      initRef.current = true;
      supabase.from("pos_state").select("id").eq("id", RECORD_ID).maybeSingle().then(({ data }) => {
        if (!data) {
          supabase.from("pos_state").insert({ id: RECORD_ID, value: JSON.stringify(state), updated_at: new Date().toISOString() }).then(({ error }) => {
            if (error) console.error("Error insertando registro:", error);
          });
        }
      });
    }
  }, [loaded]);

  const prevStatusRef = useRef({});
  useEffect(() => {
    const current = {};
    tables.forEach((t) => { current["t-" + t.id] = { status: t.kitchenStatus, name: "Mesa " + t.id }; });
    deliveries.forEach((d) => { current["d-" + d.id] = { status: d.kitchenStatus, name: d.customer }; });
    Object.keys(current).forEach((key) => {
      const prev = prevStatusRef.current[key];
      if (prev && prev.status !== "listo" && current[key].status === "listo") {
        playReadyBeep();
        setReadyToast({ name: current[key].name, show: true });
        setTimeout(() => setReadyToast((t) => ({ ...t, show: false })), 6000);
      }
    });
    prevStatusRef.current = current;
  }, [tables, deliveries]);

  const [readyToast, setReadyToast] = useState({ name: "", show: false });

  useEffect(() => {
    if (typeof window !== "undefined") window.location.hash = view;
  }, [view]);

  const audioCtxRef = useRef(null);
  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  }
  function playReadyBeep() {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }
  useEffect(() => {
    function unlock() {
      try { getAudioCtx().resume(); } catch (e) {}
    }
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    return () => { document.removeEventListener("click", unlock); document.removeEventListener("touchstart", unlock); };
  }, []);

  return (
    <div>
      <nav style={{ display: "flex", gap: 6, padding: 10, background: "#1a1a2e", color: "#fff" }}>
        {[
          { k: "mesas", label: "🍽 Mesas" },
          { k: "cocina", label: "👨‍🍳 Cocina" },
          { k: "caja", label: "💵 Caja" },
          { k: "delivery", label: "🛵 Delivery" },
          { k: "reportes", label: "📊 Reportes" },
          { k: "clientes", label: "👥 Clientes" },
          { k: "admin", label: "⚙️ Admin" },
        ].map((v) => (
          <button key={v.k} onClick={() => setView(v.k)} style={{ padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: view === v.k ? "#e94560" : "#16213e", color: "#fff" }}>{v.label}</button>
        ))}
      </nav>
      <div style={{ padding: 10, color: "#333" }}>
        {connStatus && <div style={{ fontSize: 12, color: "#666" }}>{connStatus}{lastSync ? " · " + lastSync.toLocaleTimeString() : ""}{connError ? " · " + connError : ""}</div>}
        {view === "mesas" && (
          <MesasView tables={tables} onOpen={(id) => setActiveTable(id)} />
        )}
        {view === "cocina" && (
          <CocinaView tables={tables} deliveries={deliveries} onUpdate={(kind, id, status) => {
            if (kind === "table") withTables((t) => t.map((tbl) => (tbl.id === id ? { ...tbl, kitchenStatus: status } : tbl)));
            else withDeliveries((d) => d.map((del) => (del.id === id ? { ...del, kitchenStatus: status } : del)));
          }} />
        )}
        {view === "caja" && (
          <CajaView tables={tables} deliveries={deliveries} sales={sales} expenses={expenses} employees={employees} cashSessions={cashSessions} onOpenSession={openCashSession} onCloseSession={closeCashSession} onCharge={closeTicket} pin={pin} onChangePin={(p) => persist({ ...state, pin: p })} salesGoal={salesGoal} onSetGoal={setSalesGoal} />
        )}
        {view === "delivery" && (
          <DeliveryView deliveries={deliveries} onNew={() => setShowNewDelivery(true)} onOpen={(id) => setActiveDelivery(id)} />
        )}
        {view === "reportes" && (
          <ReportesView sales={sales} expenses={expenses} />
        )}
        {view === "clientes" && (
          <ClientesView sales={sales} deliveries={deliveries} />
        )}
        {view === "admin" && (
          <AdminView employees={employees} onUpdateEmployees={withEmployees} />
        )}
      </div>
      {activeTable && (
        <OrderModal
          table={tables.find((t) => t.id === activeTable)}
          employees={employees}
          menu={fullMenu()}
          promotions={initialPromotions()}
          onClose={() => setActiveTable(null)}
          onAddItem={(menuItem) => withTables((t) => t.map((tbl) => (tbl.id === activeTable ? { ...tbl, items: addItemToOrder(tbl.items, menuItem), startTime: tbl.startTime || new Date().toISOString() } : tbl)))}
          onRemoveItem={(menuId) => withTables((t) => t.map((tbl) => (tbl.id === activeTable ? { ...tbl, items: removeItemFromOrder(tbl.items, menuId) } : tbl)))}
          onSetWaiter={(waiter) => withTables((t) => t.map((tbl) => (tbl.id === activeTable ? { ...tbl, waiter } : tbl)))}
          onSendToKitchen={() => {
            const tbl = tables.find((t) => t.id === activeTable);
            if (!tbl || tbl.items.length === 0) return alert("Agrega productos antes de enviar a cocina.");
            withTables((t) => t.map((tb) => (tb.id === activeTable ? { ...tb, kitchenStatus: "pendiente", kitchenSentAt: new Date().toISOString() } : tb)));
            alert("Orden enviada a cocina.");
          }}
        />
      )}
      {activeDelivery && (
        <OrderModal
          table={deliveries.find((d) => d.id === activeDelivery)}
          employees={employees}
          menu={fullMenu()}
          promotions={initialPromotions()}
          isDelivery
          onClose={() => setActiveDelivery(null)}
          onAddItem={(menuItem) => withDeliveries((d) => d.map((del) => (del.id === activeDelivery ? { ...del, items: addItemToOrder(del.items, menuItem) } : del)))}
          onRemoveItem={(menuId) => withDeliveries((d) => d.map((del) => (del.id === activeDelivery ? { ...del, items: removeItemFromOrder(del.items, menuId) } : del)))}
          onSendToKitchen={() => {
            const del = deliveries.find((d) => d.id === activeDelivery);
            if (!del || del.items.length === 0) return alert("Agrega productos antes de enviar a cocina.");
            withDeliveries((d) => d.map((de) => (de.id === activeDelivery ? { ...de, kitchenStatus: "pendiente", kitchenSentAt: new Date().toISOString() } : de)));
            alert("Orden enviada a cocina.");
          }}
        />
      )}
      {showNewDelivery && (
        <NewDeliveryModal
          pickupCount={deliveries.filter((d) => d.type === "pickup").length}
          onCreate={(data) => {
            const nextId = Math.max(0, ...deliveries.map((d) => d.id)) + 1;
            withDeliveries((d) => [...d, { ...data, id: nextId, items: [], kitchenStatus: null, kitchenSentAt: null }]);
            setShowNewDelivery(false);
            setActiveDelivery(nextId);
            setView("delivery");
          }}
          onClose={() => setShowNewDelivery(false)}
        />
      )}
      {receiptFor && <ReceiptModal sale={receiptFor} onClose={() => setReceiptFor(null)} />}
      {readyToast.show && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#4ecdc4", color: "#fff", padding: "12px 16px", borderRadius: 8, fontWeight: 700, zIndex: 1000 }}>
          ✅ {readyToast.name} ¡Orden lista!
        </div>
      )}
    </div>
  );
}

function statusStyle(status) {
  if (status === "listo") return { background: "#4ecdc4", color: "#fff" };
  if (status === "preparando") return { background: "#f9ca24", color: "#333" };
  if (!status) return { background: "#eee", color: "#666" };
  return { background: "#ff6b6b", color: "#fff" };
}

function PinGate({ pin, onUnlock }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ padding: 20 }}>
      <h3>🔒 Ingresa PIN</h3>
      <input type="password" maxLength={4} value={val} onChange={(e) => setVal(e.target.value)} style={{ fontSize: 24, padding: 10, width: 120, textAlign: "center" }} />
      <button onClick={() => { if (val === pin) onUnlock(); else { alert("PIN incorrecto"); setVal(""); } }} style={{ marginLeft: 10, padding: "10px 16px" }}>Desbloquear</button>
    </div>
  );
}

function TableElapsed({ startTime }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
      setElapsed(diff < 1 ? "< 1 min" : `${diff} min`);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [startTime]);
  return <span>{elapsed}</span>;
}

function MesasView({ tables, onOpen }) {
  return (
    <div>
      <h2>🍽 Mesas</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {tables.map((t) => (
          <div key={t.id} onClick={() => onOpen(t.id)} style={{ cursor: "pointer", border: "1px solid #ddd", borderRadius: 8, padding: 12, ...statusStyle(t.kitchenStatus) }}>
            <div style={{ fontWeight: 700 }}>Mesa {t.id}</div>
            <div>{t.items.length} productos</div>
            <div>{t.waiter || "Sin asignar"}</div>
            {t.startTime && <div><TableElapsed startTime={t.startTime} /></div>}
            {t.kitchenStatus && <div style={{ fontSize: 12, fontWeight: 600 }}>{t.kitchenStatus.toUpperCase()}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WingOptionsModal({ item, onConfirm, onClose }) {
  const [qty, setQty] = useState(6);
  const [sauce, setSauce] = useState(wingSauces[0]);
  const [pres, setPres] = useState("Bañadas");
  const price = item.price || 8.99;
  const price12 = item.price12 || 14.99;
  const total = (qty === 12 ? price12 : price) * (qty / 6);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 400, width: "90%" }}>
        <h3>🍗 {item.name}</h3>
        <div style={{ margin: "10px 0" }}>
          <label>Cantidad: </label>
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            <option value={6}>6 piezas</option>
            <option value={12}>12 piezas</option>
          </select>
        </div>
        <div style={{ margin: "10px 0" }}>
          <label>Salsa: </label>
          <select value={sauce.id} onChange={(e) => setSauce(wingSauces.find((s) => s.id === e.target.value))}>
            {wingSauces.map((s) => (
              <option key={s.id} value={s.id}>{s.name} - {s.description}</option>
            ))}
          </select>
        </div>
        <div style={{ margin: "10px 0" }}>
          <label>Presentación: </label>
          <select value={pres} onChange={(e) => setPres(e.target.value)}>
            <option value="Bañadas">Bañadas en salsa</option>
            <option value="Aparte">Salsa aparte</option>
          </select>
        </div>
        <div style={{ fontWeight: 700, margin: "10px 0" }}>Total: {money(total)}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 12px" }}>Cancelar</button>
          <button onClick={() => onConfirm({ ...item, name: `${item.name} (${qty} pzas, ${sauce.name}, ${pres})`, price: total, qty: 1, id: `${item.id}-${qty}-${sauce.id}-${pres === "Bañadas" ? "banadas" : "aparte"}` })} style={{ padding: "8px 12px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6 }}>Agregar</button>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ table, employees, menu, promotions, isDelivery, onClose, onAddItem, onRemoveItem, onSetWaiter, onSendToKitchen }) {
  const [wingItem, setWingItem] = useState(null);
  const allCats = useMemo(() => {
    const cats = [...new Set(menu.map((m) => m.cat))];
    if (promotions.length > 0) cats.unshift("Promociones");
    return cats;
  }, [menu, promotions]);
  const [cat, setCat] = useState(allCats[0]);

  function handleItemClick(m) {
    if (m.cat === "Chicken Mood" && m.name.toLowerCase().includes("alita")) {
      setWingItem(m);
    } else if (m.cat === "Promociones") {
      const promo = promotions.find((p) => p.id === m.promoId);
      if (promo) {
        promo.items.forEach((pid) => {
          const item = menu.find((x) => x.id === pid);
          if (item) onAddItem(item);
        });
      }
    } else {
      onAddItem(m);
    }
  }

  const baseList = cat === "Promociones"
    ? promotions.map((p) => ({ id: p.id, name: p.name, price: p.price, cat: "Promociones", promoId: p.id, description: p.description }))
    : menu.filter((m) => m.cat === cat);

  const cartQtyFor = (menuId) => {
    const direct = table.items.reduce((sum, it) => (it.menuId === menuId ? sum + it.qty : sum), 0);
    const custom = table.items.reduce((sum, it) => (String(it.menuId).startsWith(String(menuId) + "-") ? sum + it.qty : sum), 0);
    return direct + custom;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 800, width: "90%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{isDelivery ? "🛵 Delivery" : "🍽 Mesa " + table.id}</h3>
          <button onClick={onClose} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
        {!isDelivery && (
          <div style={{ margin: "10px 0" }}>
            <label>Mesero: </label>
            <select value={table.waiter || ""} onChange={(e) => onSetWaiter(e.target.value || null)}>
              <option value="">Seleccionar...</option>
              {employees.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
          {allCats.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: cat === c ? "#e94560" : "#eee", color: cat === c ? "#fff" : "#333" }}>{c}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, maxHeight: 300, overflow: "auto" }}>
          {baseList.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: 20, textAlign: "center", color: "#888" }}>No hay promociones activas</div>
          ) : (
            baseList.map((m) => (
              <button key={m.id} onClick={() => handleItemClick(m)} style={{ position: "relative", padding: 10, borderRadius: 8, border: "1px solid #ddd", background: "#f8f9fa", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{m.cat}</div>
                <div style={{ fontWeight: 700, color: "#e94560" }}>{money(m.price)}</div>
                {m.description && <div style={{ fontSize: 11, color: "#888" }}>{m.description}</div>}
                {cartQtyFor(m.id) > 0 && <span style={{ position: "absolute", top: 4, right: 4, background: "#e94560", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{cartQtyFor(m.id)}</span>}
              </button>
            ))
          )}
        </div>
        <h4 style={{ marginTop: 16 }}>🛒 Orden ({table.items.length} ítems)</h4>
        <div style={{ maxHeight: 200, overflow: "auto" }}>
          {table.items.length === 0 ? (
            <div style={{ color: "#888" }}>Sin productos</div>
          ) : (
            table.items.map((it) => (
              <div key={it.menuId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #eee" }}>
                <div>{it.name} x{it.qty}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>{money(it.qty * it.price)}</div>
                  <button onClick={() => onRemoveItem(it.menuId)} style={{ background: "#ff6b6b", color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer" }}>-</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 18 }}>Total: {money(table.items.reduce((sum, it) => sum + it.qty * it.price, 0))}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onSendToKitchen} style={{ flex: 1, padding: 12, background: "#f9ca24", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>👨‍🍳 Enviar a Cocina</button>
          <button onClick={onClose} style={{ padding: "12px 16px", background: "#eee", border: "none", borderRadius: 6, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>
      {wingItem && (
        <WingOptionsModal
          item={wingItem}
          onConfirm={(customItem) => { onAddItem(customItem); setWingItem(null); }}
          onClose={() => setWingItem(null)}
        />
      )}
    </div>
  );
}

const iconBtn = (label, emoji, active, onClick) => (
  <button onClick={onClick} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: active ? "#e94560" : "#fff", color: active ? "#fff" : "#333", fontWeight: 600 }}>
    {emoji} {label}
  </button>
);

function ElapsedBadge({ sentAt }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!sentAt) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000);
      setElapsed(diff < 1 ? "< 1 min" : `${diff} min`);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [sentAt]);
  return <span style={{ fontSize: 12, color: "#888" }}>{elapsed}</span>;
}

function CocinaView({ tables, deliveries, onUpdate }) {
  const pending = [
    ...tables.filter((t) => t.kitchenStatus && t.kitchenStatus !== "entregado").map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, items: t.items, status: t.kitchenStatus, sentAt: t.kitchenSentAt })),
    ...deliveries.filter((d) => d.kitchenStatus && d.kitchenStatus !== "entregado").map((d) => ({ kind: "delivery", id: d.id, label: `🛵 ${d.customer}`, items: d.items, status: d.kitchenStatus, sentAt: d.kitchenSentAt })),
  ];
  return (
    <div>
      <h2>👨‍🍳 Cocina</h2>
      {pending.length === 0 && <div style={{ color: "#888" }}>No hay órdenes pendientes</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {pending.map((o) => (
          <div key={o.kind + o.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, ...statusStyle(o.status) }}>
            <div style={{ fontWeight: 700 }}>{o.label}</div>
            <div style={{ fontSize: 12 }}><ElapsedBadge sentAt={o.sentAt} /></div>
            <div style={{ margin: "8px 0" }}>
              {o.items.map((it) => (
                <div key={it.menuId} style={{ fontSize: 14 }}>• {it.name} x{it.qty}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {o.status !== "pendiente" && (
                <button onClick={() => onUpdate(o.kind, o.id, "pendiente")} style={{ flex: 1, padding: 6, borderRadius: 4, border: "none", cursor: "pointer", background: "#eee" }}>Pendiente</button>
              )}
              {o.status !== "preparando" && (
                <button onClick={() => onUpdate(o.kind, o.id, "preparando")} style={{ flex: 1, padding: 6, borderRadius: 4, border: "none", cursor: "pointer", background: "#f9ca24" }}>Preparando</button>
              )}
              {o.status !== "listo" && (
                <button onClick={() => onUpdate(o.kind, o.id, "listo")} style={{ flex: 1, padding: 6, borderRadius: 4, border: "none", cursor: "pointer", background: "#4ecdc4", color: "#fff" }}>Listo</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorteCaja({ employees, sessions, onOpen, onClose }) {
  const [employee, setEmployee] = useState(employees[0]?.id || "");
  const [amount, setAmount] = useState("");
  const active = sessions.filter((s) => !s.closingTime);
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <h3>🧾 Corte de Caja</h3>
      <div style={{ marginBottom: 10 }}>
        <label>Empleado: </label>
        <select value={employee} onChange={(e) => setEmployee(e.target.value)}>
          {employees.filter((e) => e.active).map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Monto: </label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ width: 120 }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { onOpen(employee, Number(amount)); setAmount(""); }} style={{ padding: "8px 12px", background: "#4ecdc4", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Abrir Caja</button>
        <button onClick={() => { onClose(employee, Number(amount)); setAmount(""); }} style={{ padding: "8px 12px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Cerrar Caja</button>
      </div>
      <div style={{ marginTop: 10 }}>
        {active.length === 0 ? <div style={{ color: "#888" }}>No hay sesiones abiertas</div> : active.map((s) => (
          <div key={s.id} style={{ fontSize: 12, margin: "4px 0" }}>
            {s.employee} - Abierto: {timeStr(s.openingTime)} - Monto: {money(s.openingAmount)}
          </div>
        ))}
      </div>
    </div>
  );
}

function printSessionReport(session) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("Permite ventanas emergentes para imprimir");
  const html = `
    <html><head><title>Reporte de Caja</title></head><body>
    <h2>Reporte de Caja</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><td>Empleado</td><td>${session.employee}</td></tr>
      <tr><td>Apertura</td><td>${timeStr(session.openingTime)}</td></tr>
      <tr><td>Cierre</td><td>${timeStr(session.closingTime)}</td></tr>
      <tr><td>Monto Apertura</td><td>${money(session.openingAmount)}</td></tr>
      <tr><td>Monto Cierre</td><td>${money(session.closingAmount)}</td></tr>
      <tr class="big"><td>EFECTIVO ESPERADO</td><td colspan="2"></td><td style="text-align:right">${money(session.expectedCash != null ? session.expectedCash : session.openingAmount + session.cash - session.expensesTotal)}</td></tr>
      <tr><td>Diferencia</td><td>${money(session.closingAmount - (session.expectedCash || 0))}</td></tr>
      <tr><td>Verificado</td><td>${session.verified ? "✅ Sí" : "❌ No"}</td></tr>
    </table>
    </body></html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

function SessionHistory({ sessions, sales, expenses }) {
  const [filter, setFilter] = useState("");
  const filtered = sessions.filter((s) => s.closingTime).filter((s) => !filter || s.employee === filter);
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3>📜 Historial de Cortes</h3>
      <div style={{ marginBottom: 10 }}>
        <label>Filtrar por empleado: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos</option>
          {[...new Set(sessions.map((s) => s.employee))].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? <div style={{ color: "#888" }}>Sin cortes registrados</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f0f0f0" }}><th>Empleado</th><th>Apertura</th><th>Cierre</th><th>Monto Cierre</th><th>Esperado</th><th>Diferencia</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map((s) => {
              const cash = sales.filter((x) => x.method === "efectivo" && x.time >= s.openingTime && x.time <= s.closingTime).reduce((sum, x) => sum + x.total, 0);
              const expensesTotal = expenses.filter((e) => e.time >= s.openingTime && e.time <= s.closingTime).reduce((sum, e) => sum + e.amount, 0);
              const expectedCash = s.expectedCash != null ? s.expectedCash : s.openingAmount + cash - expensesTotal;
              const diff = s.closingAmount - expectedCash;
              return (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{s.employee}</td>
                  <td>{timeStr(s.openingTime)}</td>
                  <td>{timeStr(s.closingTime)}</td>
                  <td>{money(s.closingAmount)}</td>
                  <td>{money(expectedCash)}</td>
                  <td style={{ color: diff === 0 ? "green" : "red", fontWeight: 700 }}>{money(diff)}</td>
                  <td><button onClick={() => printSessionReport({ ...s, cash, expensesTotal })} style={{ padding: "4px 8px", fontSize: 12 }}>🖨️ Imprimir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function GoalBar({ sales, salesGoal, onSetGoal }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(salesGoal));
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const pct = Math.min(100, Math.round((total / salesGoal) * 100));
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>🎯 Meta de Ventas</h3>
        <button onClick={() => { setEditing(!editing); setVal(String(salesGoal)); }} style={{ fontSize: 12, padding: "4px 8px" }}>{editing ? "Cancelar" : "Editar"}</button>
      </div>
      {editing && (
        <div style={{ marginBottom: 10 }}>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 120 }} />
          <button onClick={() => { onSetGoal(Number(val)); setEditing(false); }} style={{ marginLeft: 8, padding: "4px 8px" }}>Guardar</button>
        </div>
      )}
      <div style={{ fontSize: 14, marginBottom: 6 }}>Ventas: {money(total)} / Meta: {money(salesGoal)} ({pct}%)</div>
      <div style={{ height: 20, background: "#eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#4ecdc4" : "#e94560", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function changeBreakdown(change) {
  const denoms = [100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.1, 0.05, 0.01];
  const counts = {};
  let remaining = change;
  for (const d of denoms) {
    if (remaining >= d) {
      counts[d] = Math.floor(remaining / d);
      remaining = Math.round((remaining - counts[d] * d) * 100) / 100;
    }
  }
  return Object.entries(counts).map(([denom, count]) => ({ denom: Number(denom), count }));
}

function playChaChing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

function CashKeypad({ value, onChange }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 180 }}>
      {keys.map((k) => (
        <button key={k} onClick={() => { if (k === "C") onChange(""); else onChange(String(value || "") + k); }} style={{ padding: 12, fontSize: 18, borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>
          {k}
        </button>
      ))}
    </div>
  );
}

const cashGivenRef = { current: {} };

function CajaView({ tables, deliveries, sales, expenses, employees, cashSessions, onOpenSession, onCloseSession, onCharge, pin, onChangePin, salesGoal, onSetGoal }) {
  const abiertas = [
    ...tables.filter((t) => t.items.length > 0).map((t) => ({ kind: "table", id: t.id, label: `Mesa ${t.id}`, ...t })),
    ...deliveries.filter((d) => d.items.length > 0 && d.kitchenStatus !== "entregado").map((d) => ({ kind: "delivery", id: d.id, label: `🛵 ${d.customer}`, ...d })),
  ];
  const [method, setMethod] = useState({});
  const [tipValue, setTipValue] = useState({});
  const [discType, setDiscType] = useState({});
  const [discValue, setDiscValue] = useState({});
  const [cajaUnlocked, setCajaUnlocked] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [cashGiven, setCashGiven] = useState({});
  const [splitMode, setSplitMode] = useState({});
  const [splitSelected, setSplitSelected] = useState({});

  useEffect(() => {
    cashGivenRef.current = cashGiven;
  }, [cashGiven]);

  function getDiscount(key) {
    const type = discType[key];
    const value = Number(discValue[key]) || 0;
    if (!type || value <= 0) return null;
    return { type, value };
  }

  function toggleSplitItem(key, menuId) {
    setSplitSelected((prev) => {
      const arr = prev[key] || [];
      if (arr.includes(menuId)) return { ...prev, [key]: arr.filter((id) => id !== menuId) };
      return { ...prev, [key]: [...arr, menuId] };
    });
  }

  if (!cajaUnlocked) {
    return <PinGate pin={pin} onUnlock={() => setCajaUnlocked(true)} />;
  }

  return (
    <div>
      <h2>💵 Caja</h2>
      <CorteCaja employees={employees} sessions={cashSessions} onOpen={onOpenSession} onClose={onCloseSession} />
      <SessionHistory sessions={cashSessions} sales={sales} expenses={expenses} />
      <GoalBar sales={sales} salesGoal={salesGoal} onSetGoal={onSetGoal} />
      <div style={{ margin: "10px 0" }}>
        <button onClick={() => setShowPinSettings(!showPinSettings)} style={{ padding: "8px 12px" }}>🔑 Cambiar PIN</button>
        {showPinSettings && <ChangePin current={pin} onChange={(p) => { onChangePin(p); setShowPinSettings(false); }} />}
      </div>
      <h3>🧾 Cuentas Abiertas ({abiertas.length})</h3>
      {abiertas.length === 0 && <div style={{ color: "#888" }}>No hay cuentas abiertas</div>}
      {abiertas.map((o) => {
        const key = o.kind + o.id;
        const m = method[key] || "efectivo";
        const isSplit = !!splitMode[key];
        const selectedIds = splitSelected[key] || [];
        const activeItems = isSplit && selectedIds.length > 0 ? o.items.filter((it) => selectedIds.includes(it.menuId)) : o.items;
        const { subtotal, total } = computeTotal(activeItems, getDiscount(key));
        const finalTotal = total + (Number(tipValue[key]) || 0);
        const given = Number(cashGiven[key]) || 0;
        const change = given - finalTotal;
        const canCharge = !isSplit || selectedIds.length > 0;

        return (
          <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{o.label}</div>

            <div style={{ margin: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setSplitMode((prev) => ({ ...prev, [key]: !prev[key] }))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: isSplit ? "#e94560" : "#fff", color: isSplit ? "#fff" : "#333", fontWeight: 600 }}>
                {isSplit ? "✅ Dividir Cuenta (Activo)" : "🔄 Dividir Cuenta"}
              </button>
              {isSplit && <span style={{ fontSize: 12, color: "#666" }}>Selecciona los productos a cobrar</span>}
            </div>

            <div style={{ margin: "8px 0" }}>
              {o.items.map((it) => {
                const checked = selectedIds.includes(it.menuId);
                return (
                  <div key={it.menuId} style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #f0f0f0", opacity: isSplit && !checked ? 0.5 : 1 }}>
                    {isSplit && (
                      <input type="checkbox" checked={checked} onChange={() => toggleSplitItem(key, it.menuId)} style={{ cursor: "pointer" }} />
                    )}
                    <span style={{ flex: 1 }}>• {it.name} x{it.qty}</span>
                    <span>{money(it.qty * it.price)}</span>
                  </div>
                );
              })}
            </div>

            {isSplit && selectedIds.length > 0 && (
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Cobrando {selectedIds.length} de {o.items.length} productos</div>
            )}

            <div style={{ margin: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
              {["efectivo", "tarjeta", "transferencia"].map((mt) => (
                <button key={mt} onClick={() => setMethod((prev) => ({ ...prev, [key]: mt }))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: m === mt ? "#e94560" : "#fff", color: m === mt ? "#fff" : "#333", fontWeight: 600, textTransform: "capitalize" }}>{mt}</button>
              ))}
            </div>
            <div style={{ margin: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
              <label>Descuento:</label>
              <select value={discType[key] || ""} onChange={(e) => setDiscType((prev) => ({ ...prev, [key]: e.target.value }))}>
                <option value="">Ninguno</option>
                <option value="percent">%</option>
                <option value="fixed">Fijo C$</option>
              </select>
              {discType[key] && <input type="number" value={discValue[key] || ""} onChange={(e) => setDiscValue((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="0" style={{ width: 80 }} />}
            </div>
            <div style={{ margin: "8px 0" }}>
              <label>Propina: </label>
              <input type="number" value={tipValue[key] || ""} onChange={(e) => setTipValue((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="0.00" style={{ width: 80 }} />
            </div>

            {m === "efectivo" && (
              <div style={{ margin: "12px 0", padding: 12, background: "#f8f9fa", borderRadius: 8, border: "1px solid #eee" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>💵 Pago en Efectivo</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={() => setCashGiven((prev) => ({ ...prev, [key]: String(finalTotal.toFixed(2)) }))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: "#fff" }}>Exacto {money(finalTotal)}</button>
                  {[5, 10, 20, 50, 100].map((bill) => {
                    const next = Math.ceil(finalTotal / bill) * bill;
                    if (next > finalTotal) {
                      return (
                        <button key={bill} onClick={() => setCashGiven((prev) => ({ ...prev, [key]: String(next.toFixed(2)) }))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: "#fff" }}>
                          Paga {money(next)}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <CashKeypad value={cashGiven[key] || ""} onChange={(v) => setCashGiven((prev) => ({ ...prev, [key]: v }))} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Paga con: <strong style={{ color: "#333" }}>{money(given)}</strong></div>
                    {given >= finalTotal ? (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "#4ecdc4" }}>Vuelto: {money(change)}</div>
                        {change > 0 && (
                          <div style={{ marginTop: 6, padding: 8, background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontWeight: 600 }}>Desglose del vuelto:</div>
                            {changeBreakdown(change).map((cb) => (
                              <div key={cb.denom} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                                <span>{cb.count}x {money(cb.denom)}</span>
                                <span>{money(cb.count * cb.denom)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#e94560" }}>Falta: {money(finalTotal - given)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontWeight: 700, fontSize: 18 }}>Subtotal: {money(subtotal)}</div>
            {getDiscount(key) && <div style={{ color: "green" }}>Descuento: {money(subtotal - total)}</div>}
            <div style={{ fontWeight: 700, fontSize: 20, color: "#e94560" }}>Total: {money(finalTotal)}</div>
            <button
              disabled={!canCharge}
              onClick={() => {
                playChaChing();
                const itemMenuIds = isSplit && selectedIds.length > 0 ? selectedIds : undefined;
                onCharge(o.kind, o.id, m, getDiscount(key), tipValue[key], itemMenuIds);
                if (isSplit) {
                  setSplitMode((prev) => ({ ...prev, [key]: false }));
                  setSplitSelected((prev) => ({ ...prev, [key]: [] }));
                }
                setCashGiven((prev) => ({ ...prev, [key]: "" }));
              }}
              style={{ marginTop: 8, padding: "10px 16px", background: canCharge ? "#4ecdc4" : "#ccc", color: "#fff", border: "none", borderRadius: 6, cursor: canCharge ? "pointer" : "not-allowed", fontWeight: 700 }}
            >
              ✓ Cobrar y cerrar{tipValue[key] ? ` (+${money(Number(tipValue[key]))} propina)` : ""}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ChangePin({ current, onChange }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginTop: 10 }}>
      <h4>🔑 Cambiar PIN</h4>
      <div><input type="password" maxLength={4} value={oldPin} onChange={(e) => setOldPin(e.target.value)} placeholder="PIN actual" style={{ margin: "4px 0", padding: 6, width: 120 }} /></div>
      <div><input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Nuevo PIN" style={{ margin: "4px 0", padding: 6, width: 120 }} /></div>
      <div><input type="password" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar PIN" style={{ margin: "4px 0", padding: 6, width: 120 }} /></div>
      <button onClick={() => {
        if (oldPin !== current) return alert("PIN actual incorrecto");
        if (newPin.length !== 4) return alert("El PIN debe tener 4 dígitos");
        if (newPin !== confirm) return alert("Los PINs no coinciden");
        onChange(newPin);
        alert("PIN actualizado");
        setOldPin(""); setNewPin(""); setConfirm("");
      }} style={{ marginTop: 8, padding: "8px 12px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Guardar</button>
    </div>
  );
}

function DeliveryView({ deliveries, onNew, onOpen }) {
  const active = deliveries.filter((d) => d.items.length > 0 && d.kitchenStatus !== "entregado");
  const completed = deliveries.filter((d) => d.kitchenStatus === "entregado" || d.items.length === 0);
  return (
    <div>
      <h2>🛵 Delivery</h2>
      <button onClick={onNew} style={{ padding: "10px 16px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", marginBottom: 12 }}>➕ Nuevo Delivery</button>
      <h3>Activos</h3>
      {active.length === 0 && <div style={{ color: "#888" }}>Sin deliveries activos</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {active.map((d) => (
          <div key={d.id} onClick={() => onOpen(d.id)} style={{ cursor: "pointer", border: "1px solid #ddd", borderRadius: 8, padding: 12, ...statusStyle(d.kitchenStatus) }}>
            <div style={{ fontWeight: 700 }}>{d.customer}</div>
            <div style={{ fontSize: 12 }}>{d.address || "Para llevar"}</div>
            <div>{d.items.length} productos</div>
            {d.kitchenStatus && <div style={{ fontSize: 12, fontWeight: 600 }}>{d.kitchenStatus.toUpperCase()}</div>}
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 20 }}>Completados / Vacíos</h3>
      {completed.length === 0 && <div style={{ color: "#888" }}>Sin registros</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {completed.map((d) => (
          <div key={d.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, opacity: 0.6 }}>
            <div style={{ fontWeight: 700 }}>{d.customer}</div>
            <div style={{ fontSize: 12 }}>{d.address || "Para llevar"}</div>
            <div>{d.kitchenStatus === "entregado" ? "Entregado" : "Vacío"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewDeliveryModal({ onCreate, onClose, pickupCount }) {
  const [type, setType] = useState("delivery");
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const valid = type === "delivery" ? customer && address : true;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 400, width: "90%" }}>
        <h3>➕ Nuevo Delivery</h3>
        <div style={{ margin: "10px 0" }}>
          <label>Tipo: </label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="delivery">Delivery a domicilio</option>
            <option value="pickup">Para llevar</option>
          </select>
        </div>
        {type === "delivery" && (
          <>
            <div style={{ margin: "10px 0" }}>
              <label>Cliente: </label>
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nombre del cliente" style={{ width: "100%" }} />
            </div>
            <div style={{ margin: "10px 0" }}>
              <label>Dirección: </label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de entrega" style={{ width: "100%" }} />
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 12px" }}>Cancelar</button>
          <button disabled={!valid} onClick={() => {
            if (type === "pickup") {
              onCreate({ type: "pickup", customer: `Para llevar #${pickupCount + 1}`, phone: "", address: "" });
            } else {
              onCreate({ type: "delivery", customer, phone: "", address });
            }
          }} style={{ padding: "8px 12px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, cursor: valid ? "pointer" : "not-allowed", opacity: valid ? 1 : 0.5 }}>Crear</button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ sale, onClose }) {
  const [contact, setContact] = useState(sale.phone || "");
  const subtotal = sale.subtotal || sale.total;
  const discount = sale.discount;
  const total = sale.total;
  const tip = sale.tip || 0;
  const final = total + tip;
  const change = sale.cashGiven ? sale.cashGiven - final : 0;
  const message = `🧾 *Recibo - ${sale.ref}*
\n${sale.items.map((it) => `• ${it.name} x${it.qty} - ${money(it.qty * it.price)}`).join("\n")}
\nSubtotal: ${money(subtotal)}
${discount ? `Descuento: ${money(subtotal - total)}` : ""}
Total: ${money(total)}
${tip ? `Propina: ${money(tip)}` : ""}
${sale.cashGiven ? `Paga con: ${money(sale.cashGiven)}` : ""}
${sale.cashGiven ? `Vuelto: ${money(change)}` : ""}
*Total a pagar: ${money(final)}*
\nMétodo: ${sale.method}
Fecha: ${timeStr(sale.time)}
`;

  function sendWhatsApp() {
    if (!contact) return alert("Ingresa un número de teléfono");
    const clean = contact.replace(/\D/g, "");
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function sendEmail() {
    if (!contact) return alert("Ingresa un correo electrónico");
    const subject = encodeURIComponent(`Recibo - ${sale.ref}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${contact}?subject=${subject}&body=${body}`;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 400, width: "90%" }}>
        <h3>🧾 Recibo</h3>
        <div style={{ margin: "8px 0", fontWeight: 700 }}>{sale.ref}</div>
        <div style={{ margin: "8px 0", fontSize: 12, color: "#888" }}>{timeStr(sale.time)}</div>
        <div style={{ margin: "8px 0" }}>
          {sale.items.map((it) => (
            <div key={it.menuId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>{it.name} x{it.qty}</span>
              <span>{money(it.qty * it.price)}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #eee", margin: "8px 0", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {discount && <div style={{ display: "flex", justifyContent: "space-between", color: "green" }}><span>Descuento</span><span>-{money(subtotal - total)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span>{money(total)}</span></div>
          {tip > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Propina</span><span>{money(tip)}</span></div>}
          {sale.cashGiven > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paga con</span><span>{money(sale.cashGiven)}</span></div>}
          {sale.cashGiven > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#4ecdc4" }}><span>Vuelto</span><span>{money(change)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, color: "#e94560" }}><span>Total a pagar</span><span>{money(final)}</span></div>
        </div>
        <div style={{ margin: "8px 0" }}>Método: {sale.method}</div>
        <div style={{ margin: "8px 0" }}>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Teléfono o email" style={{ width: "100%", padding: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={sendWhatsApp} style={{ flex: 1, padding: "8px 12px", background: "#25d366", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>WhatsApp</button>
          <button onClick={sendEmail} style={{ flex: 1, padding: "8px 12px", background: "#ea4335", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Email</button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 12px" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ReportesView({ sales, expenses }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const date = new Date(selectedDate + "T12:00:00");
  const monthKey = selectedDate.slice(0, 7);
  const daySales = sales.filter((s) => s.time && s.time.startsWith(selectedDate));
  const dayExpenses = expenses.filter((e) => e.time && e.time.startsWith(selectedDate));
  const monthSales = sales.filter((s) => s.time && s.time.startsWith(monthKey));
  const monthExpenses = expenses.filter((e) => e.time && e.time.startsWith(monthKey));
  const totalSales = daySales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthIncome = monthSales.reduce((sum, s) => sum + s.total, 0) - monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevMonthKey = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().slice(0, 7);
  const prevMonthIncome = sales.filter((s) => s.time && s.time.startsWith(prevMonthKey)).reduce((sum, s) => sum + s.total, 0) - expenses.filter((e) => e.time && e.time.startsWith(prevMonthKey)).reduce((sum, e) => sum + e.amount, 0);
  const monthChangePct = prevMonthIncome ? Math.round(((monthIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;
  const byMethod = {};
  daySales.forEach((s) => { byMethod[s.method] = (byMethod[s.method] || 0) + s.total; });
  const byCategory = {};
  daySales.forEach((s) => { s.items.forEach((it) => { byCategory[it.name] = (byCategory[it.name] || 0) + it.qty * it.price; }); });
  const topItems = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <h2>📊 Reportes</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Fecha: </label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888" }}>Ventas del día</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#4ecdc4" }}>{money(totalSales)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888" }}>Gastos del día</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e94560" }}>{money(totalExpenses)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888" }}>Balance del día</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalSales - totalExpenses >= 0 ? "#4ecdc4" : "#e94560" }}>{money(totalSales - totalExpenses)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888" }}>Ventas del mes</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#4ecdc4" }}>{money(monthIncome)}</div>
          {monthChangePct !== null && <div style={{ fontSize: 12, color: monthChangePct >= 0 ? "green" : "red" }}>{monthChangePct >= 0 ? "▲" : "▼"} {Math.abs(monthChangePct)}% vs mes anterior</div>}
        </div>
      </div>
      <h3>💳 Por Método de Pago</h3>
      {Object.keys(byMethod).length === 0 ? <div style={{ color: "#888" }}>Sin datos</div> : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(byMethod).map(([m, v]) => (
            <div key={m} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "#888", textTransform: "capitalize" }}>{m}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{money(v)}</div>
            </div>
          ))}
        </div>
      )}
      <h3>🔥 Productos más vendidos</h3>
      {topItems.length === 0 ? <div style={{ color: "#888" }}>Sin datos</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f0f0f0" }}><th>Producto</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
          <tbody>
            {topItems.map(([name, v]) => (
              <tr key={name} style={{ borderBottom: "1px solid #eee" }}><td>{name}</td><td style={{ textAlign: "right" }}>{money(v)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>📝 Detalle de Ventas</h3>
      {daySales.length === 0 ? <div style={{ color: "#888" }}>Sin ventas</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f0f0f0" }}><th>Hora</th><th>Ref</th><th>Consumo</th><th>Método</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
          <tbody>
            {daySales.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>{new Date(s.time).toLocaleTimeString()}</td>
                <td style={{ verticalAlign: "top" }}>{s.ref}</td>
                <td style={{ verticalAlign: "top" }}>
                  {s.items.map((it) => (
                    <div key={it.menuId} style={{ fontSize: 12 }}>• {it.name} x{it.qty}</div>
                  ))}
                </td>
                <td style={{ verticalAlign: "top" }}>{s.method}</td>
                <td style={{ textAlign: "right", verticalAlign: "top", fontWeight: 700 }}>{money(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>💸 Detalle de Gastos</h3>
      {dayExpenses.length === 0 ? <div style={{ color: "#888" }}>Sin gastos</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f0f0f0" }}><th>Hora</th><th>Descripción</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
          <tbody>
            {dayExpenses.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}><td>{new Date(e.time).toLocaleTimeString()}</td><td>{e.description}</td><td style={{ textAlign: "right" }}>{money(e.amount)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ClientesView({ sales, deliveries }) {
  const customers = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const name = s.ref || "Desconocido";
      if (!map[name]) map[name] = { name, visits: 0, total: 0, lastVisit: null };
      map[name].visits += 1;
      map[name].total += s.total;
      if (!map[name].lastVisit || s.time > map[name].lastVisit) map[name].lastVisit = s.time;
    });
    deliveries.forEach((d) => {
      if (d.customer) {
        if (!map[d.customer]) map[d.customer] = { name: d.customer, visits: 0, total: 0, lastVisit: null };
        map[d.customer].visits += 1;
        if (!map[d.customer].lastVisit || d.kitchenSentAt > map[d.customer].lastVisit) map[d.customer].lastVisit = d.kitchenSentAt;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [sales, deliveries]);

  return (
    <div>
      <h2>👥 Clientes</h2>
      {customers.length === 0 ? <div style={{ color: "#888" }}>Sin clientes registrados</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {customers.map((c) => (
            <div key={c.name} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{c.visits} visitas</div>
              <div style={{ fontSize: 12, color: "#888" }}>Última: {c.lastVisit ? timeStr(c.lastVisit) : "N/A"}</div>
              <div style={{ fontWeight: 700, color: "#e94560" }}>Total: {money(c.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminView({ employees, onUpdateEmployees }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#e94560");
  return (
    <div>
      <h2>⚙️ Admin</h2>
      <h3>Empleados</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {employees.map((e) => (
          <div key={e.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: e.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{e.active ? "Activo" : "Inactivo"}</div>
            </div>
            <button onClick={() => onUpdateEmployees((emps) => emps.map((emp) => (emp.id === e.id ? { ...emp, active: !emp.active } : emp)))} style={{ padding: "4px 8px", fontSize: 12 }}>
              {e.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h4>➕ Agregar Empleado</h4>
        <div style={{ margin: "8px 0" }}>
          <label>Nombre: </label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del empleado" />
        </div>
        <div style={{ margin: "8px 0" }}>
          <label>Color: </label>
          <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
        </div>
        <button onClick={() => {
          if (!newName.trim()) return alert("Ingresa un nombre");
          onUpdateEmployees((emps) => [...emps, { id: Date.now().toString(), name: newName.trim(), color: newColor, active: true }]);
          setNewName("");
        }} style={{ padding: "8px 12px", background: "#e94560", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Agregar</button>
      </div>
    </div>
  );
}
