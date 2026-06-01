import { useState, useCallback } from 'react';
import {
  obtenerProductos, obtenerClientes, obtenerDB,
  ajustarStock, agregarProducto, eliminarProducto,
  agregarCliente, registrarAbono, formatPrecio, formatFecha,
  Producto, Cliente, Venta,
} from '../datos';

const AZUL = 'rgb(0, 89, 255)';
const AZUL_SUAVE = 'rgba(0, 89, 255, 0.08)';

type Tab = 'inventario' | 'clientes' | 'ventas';

// ─── Modal genérico ────────────────────────────────────────────────────────

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
    }} onClick={onCerrar}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', padding: '20px 20px 100px', maxHeight: '85dvh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{titulo}</div>
          <button onClick={onCerrar} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Campo de formulario ───────────────────────────────────────────────────

function Campo({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>{label}</label>
      <input
        {...props}
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 12,
          border: '2px solid #e2e8f0', fontSize: 15, background: '#f8faff',
          boxSizing: 'border-box', outline: 'none',
          ...props.style,
        }}
      />
    </div>
  );
}

// ─── Botón primario ────────────────────────────────────────────────────────

function BtnPrimario({ children, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        width: '100%', padding: 16, borderRadius: 14, border: 'none',
        background: disabled ? '#94a3b8' : AZUL,
        color: '#fff', fontSize: 15, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 3px 14px rgba(0,89,255,0.35)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Tab Inventario ────────────────────────────────────────────────────────

type Direccion = 'sumar' | 'restar';

function TabInventario() {
  const [productos, setProductos] = useState<Producto[]>(obtenerProductos);
  const [modalAjuste, setModalAjuste] = useState<Producto | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [direccion, setDireccion] = useState<Direccion>('sumar');
  const [form, setForm] = useState({ nombre: '', emoji: '🍧', precio: '', stock: '' });
  const [errorAjuste, setErrorAjuste] = useState('');

  const reload = useCallback(() => setProductos(obtenerProductos()), []);

  function handleAjuste() {
    if (!modalAjuste || !cantidad || Number(cantidad) <= 0) return;
    const delta = direccion === 'sumar' ? Number(cantidad) : -Number(cantidad);
    if (direccion === 'restar' && Number(cantidad) > modalAjuste.stock) {
      setErrorAjuste(`No podés restar más del stock actual (${modalAjuste.stock}).`);
      return;
    }
    ajustarStock(modalAjuste.id, delta);
    reload();
    setModalAjuste(null);
    setCantidad('');
    setErrorAjuste('');
  }

  function handleAgregarProducto() {
    if (!form.nombre || !form.precio || !form.stock) return;
    agregarProducto({ nombre: form.nombre, emoji: form.emoji, precio: Number(form.precio), stock: Number(form.stock) });
    reload();
    setModalNuevo(false);
    setForm({ nombre: '', emoji: '🍧', precio: '', stock: '' });
  }

  function handleEliminar(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;
    eliminarProducto(id);
    reload();
  }

  return (
    <div>
      {/* Header acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {productos.length} productos
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          style={{
            background: AZUL, color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          + Nuevo
        </button>
      </div>

      {/* Lista */}
      {productos.map(prod => (
        <div key={prod.id} style={{
          background: '#fff', borderRadius: 16, padding: '14px 16px',
          marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 34 }}>{prod.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{prod.nombre}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{formatPrecio(prod.precio)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontWeight: 900, fontSize: 22,
              color: prod.stock === 0 ? '#ef4444' : prod.stock <= 3 ? '#f59e0b' : '#22c55e',
            }}>
              {prod.stock}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>stock</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => { setModalAjuste(prod); setCantidad(''); setDireccion('sumar'); setErrorAjuste(''); }}
              style={{
                padding: '8px 12px', borderRadius: 10, border: 'none',
                background: AZUL_SUAVE, color: AZUL, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              ± Stock
            </button>
            <button
              onClick={() => handleEliminar(prod.id)}
              style={{
                padding: '8px 12px', borderRadius: 10, border: 'none',
                background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              Borrar
            </button>
          </div>
        </div>
      ))}

      {/* Modal ajuste de stock */}
      {modalAjuste && (
        <Modal titulo={`Ajustar stock — ${modalAjuste.nombre}`} onCerrar={() => { setModalAjuste(null); setErrorAjuste(''); }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 50 }}>{modalAjuste.emoji}</span>
            <div style={{ marginTop: 6, fontSize: 15, color: '#64748b' }}>
              Stock actual: <strong style={{ color: '#1a1a2e', fontSize: 18 }}>{modalAjuste.stock}</strong>
            </div>
          </div>

          {/* Selector sumar / restar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {(['sumar', 'restar'] as Direccion[]).map(dir => (
              <button
                key={dir}
                onClick={() => { setDireccion(dir); setErrorAjuste(''); }}
                style={{
                  padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
                  border: direccion === dir
                    ? `2.5px solid ${dir === 'sumar' ? '#22c55e' : '#ef4444'}`
                    : '2px solid #e2e8f0',
                  background: direccion === dir
                    ? (dir === 'sumar' ? '#f0fdf4' : '#fef2f2')
                    : '#f8faff',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{dir === 'sumar' ? '➕' : '➖'}</div>
                <div style={{
                  fontWeight: 700, fontSize: 14,
                  color: direccion === dir ? (dir === 'sumar' ? '#16a34a' : '#dc2626') : '#64748b',
                }}>
                  {dir === 'sumar' ? 'Sumar' : 'Restar'}
                </div>
              </button>
            ))}
          </div>

          <Campo
            label={`Cantidad a ${direccion === 'sumar' ? 'agregar' : 'quitar'}`}
            type="number" min="1"
            max={direccion === 'restar' ? modalAjuste.stock : undefined}
            value={cantidad}
            onChange={e => { setCantidad(e.target.value); setErrorAjuste(''); }}
            placeholder="Ej: 5"
          />

          {/* Preview del resultado */}
          {cantidad && Number(cantidad) > 0 && (
            <div style={{
              background: '#f8faff', borderRadius: 12, padding: '10px 14px',
              marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Stock resultante</span>
              <span style={{
                fontWeight: 900, fontSize: 18,
                color: direccion === 'sumar' ? '#16a34a' : '#dc2626',
              }}>
                {direccion === 'sumar'
                  ? modalAjuste.stock + Number(cantidad)
                  : Math.max(0, modalAjuste.stock - Number(cantidad))
                }
              </span>
            </div>
          )}

          {errorAjuste && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12,
              padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, fontWeight: 600,
            }}>
              ⚠ {errorAjuste}
            </div>
          )}

          <BtnPrimario
            onClick={handleAjuste}
            disabled={!cantidad || Number(cantidad) <= 0}
          >
            ✓ Confirmar ajuste
          </BtnPrimario>
        </Modal>
      )}

      {/* Modal nuevo producto */}
      {modalNuevo && (
        <Modal titulo="Nuevo producto" onCerrar={() => setModalNuevo(false)}>
          <Campo label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Paleta de Coco" />
          <Campo label="Emoji" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🍧" />
          <Campo label="Precio ($)" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="Ej: 600" />
          <Campo label="Stock inicial" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Ej: 15" />
          <BtnPrimario onClick={handleAgregarProducto} disabled={!form.nombre || !form.precio || !form.stock}>
            + Agregar producto
          </BtnPrimario>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab Clientes ──────────────────────────────────────────────────────────

function TabClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(obtenerClientes);
  const [modalAbono, setModalAbono] = useState<Cliente | null>(null);
  const [modalHistorial, setModalHistorial] = useState<Cliente | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [monto, setMonto] = useState('');
  const [nombre, setNombre] = useState('');

  const reload = useCallback(() => setClientes(obtenerClientes()), []);

  function handleAbono() {
    if (!modalAbono || !monto) return;
    registrarAbono(modalAbono.id, Number(monto));
    reload();
    setModalAbono(null);
    setMonto('');
  }

  function handleNuevoCliente() {
    if (!nombre.trim()) return;
    agregarCliente(nombre.trim());
    reload();
    setModalNuevo(false);
    setNombre('');
  }

  const totalDeuda = clientes.reduce((s, c) => s + c.saldo, 0);

  return (
    <div>
      {/* Resumen deuda total */}
      <div style={{
        background: totalDeuda > 0 ? '#fef2f2' : '#f0fdf4',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
        border: `1.5px solid ${totalDeuda > 0 ? '#fca5a5' : '#86efac'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>DEUDA TOTAL DEL LIBRO</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: totalDeuda > 0 ? '#dc2626' : '#16a34a' }}>
            {formatPrecio(totalDeuda)}
          </div>
        </div>
        <span style={{ fontSize: 30 }}>{totalDeuda > 0 ? '📋' : '✅'}</span>
      </div>

      {/* Header acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{clientes.length} clientes</div>
        <button
          onClick={() => setModalNuevo(true)}
          style={{
            background: AZUL, color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          + Nuevo
        </button>
      </div>

      {/* Lista clientes */}
      {clientes.map(c => (
        <div key={c.id} style={{
          background: '#fff', borderRadius: 16, padding: '14px 16px',
          marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: AZUL, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18, flexShrink: 0,
            }}>
              {c.nombre[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: c.saldo > 0 ? '#dc2626' : '#16a34a',
              }}>
                {c.saldo > 0 ? `Debe: ${formatPrecio(c.saldo)}` : '✓ Al día'}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => { setModalAbono(c); setMonto(''); }}
              disabled={c.saldo === 0}
              style={{
                padding: '10px', borderRadius: 10, border: 'none',
                background: c.saldo === 0 ? '#f1f5f9' : '#f0fdf4',
                color: c.saldo === 0 ? '#94a3b8' : '#16a34a',
                fontWeight: 700, fontSize: 13, cursor: c.saldo === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              💰 Abono
            </button>
            <button
              onClick={() => setModalHistorial(c)}
              style={{
                padding: '10px', borderRadius: 10, border: 'none',
                background: AZUL_SUAVE, color: AZUL,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              📜 Historial
            </button>
          </div>
        </div>
      ))}

      {/* Modal abono */}
      {modalAbono && (
        <Modal titulo={`Registrar abono — ${modalAbono.nombre}`} onCerrar={() => setModalAbono(null)}>
          <div style={{
            background: '#fef2f2', borderRadius: 12, padding: '12px 14px', marginBottom: 16,
            color: '#dc2626', fontWeight: 700, fontSize: 15, textAlign: 'center',
          }}>
            Deuda actual: {formatPrecio(modalAbono.saldo)}
          </div>
          <Campo label="Monto abonado ($)" type="number" min="1" max={modalAbono.saldo}
            value={monto} onChange={e => setMonto(e.target.value)} placeholder="Ej: 500" />
          <BtnPrimario onClick={handleAbono} disabled={!monto || Number(monto) <= 0}>
            ✓ Confirmar abono
          </BtnPrimario>
        </Modal>
      )}

      {/* Modal historial */}
      {modalHistorial && (
        <Modal titulo={`Historial — ${modalHistorial.nombre}`} onCerrar={() => setModalHistorial(null)}>
          {modalHistorial.historial.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 14 }}>
              Sin movimientos registrados.
            </div>
          ) : (
            [...modalHistorial.historial].reverse().map((mov, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '12px 0', borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{formatFecha(mov.fecha)}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{mov.detalle}</div>
                </div>
                <div style={{
                  fontWeight: 800, fontSize: 15, marginLeft: 12,
                  color: mov.tipo === 'abono' ? '#16a34a' : '#dc2626',
                }}>
                  {mov.tipo === 'abono' ? '−' : '+'}{formatPrecio(mov.monto)}
                </div>
              </div>
            ))
          )}
        </Modal>
      )}

      {/* Modal nuevo cliente */}
      {modalNuevo && (
        <Modal titulo="Nuevo cliente" onCerrar={() => setModalNuevo(false)}>
          <Campo label="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Laura Torres" />
          <BtnPrimario onClick={handleNuevoCliente} disabled={!nombre.trim()}>
            + Agregar cliente
          </BtnPrimario>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab Ventas ────────────────────────────────────────────────────────────

function TabVentas() {
  const ventas: Venta[] = obtenerDB().ventas;

  const totalHoy = ventas
    .filter(v => new Date(v.fecha).toDateString() === new Date().toDateString())
    .reduce((s, v) => s + v.total, 0);

  return (
    <div>
      {/* Resumen del día */}
      <div style={{
        background: AZUL, borderRadius: 16, padding: '16px 18px',
        marginBottom: 14, color: '#fff',
      }}>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600, marginBottom: 4 }}>VENTAS HOY</div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{formatPrecio(totalHoy)}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
          {ventas.filter(v => new Date(v.fecha).toDateString() === new Date().toDateString()).length} pedidos
        </div>
      </div>

      {ventas.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          Sin ventas registradas aún.
        </div>
      ) : (
        ventas.map(v => (
          <div key={v.id} style={{
            background: '#fff', borderRadius: 16, padding: '14px 16px',
            marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                  {v.tipoCliente === 'frecuente' ? `👤 ${v.nombreCliente}` : '💵 Ocasional'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{formatFecha(v.fecha)}</div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 17, color: AZUL }}>{formatPrecio(v.total)}</div>
            </div>
            <div style={{ background: '#f8faff', borderRadius: 10, padding: '8px 10px' }}>
              {v.items.map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.cantidad}× {item.nombre}</span>
                  <span>{formatPrecio(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Panel Admin principal ─────────────────────────────────────────────────

export default function PanelAdmin() {
  const [tabActiva, setTabActiva] = useState<Tab>('inventario');

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'inventario', label: 'Inventario', emoji: '📦' },
    { id: 'clientes',   label: 'Clientes',   emoji: '👥' },
    { id: 'ventas',     label: 'Ventas',     emoji: '💰' },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#f0f4ff' }}>
      {/* Header */}
      <header style={{
        background: '#1a1a2e', color: '#fff', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>⚙️ Panel Admin</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        background: '#fff', display: 'flex', borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: 60, zIndex: 40,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{
              flex: 1, padding: '14px 8px', border: 'none', background: 'none',
              borderBottom: tabActiva === tab.id ? `3px solid ${AZUL}` : '3px solid transparent',
              color: tabActiva === tab.id ? AZUL : '#64748b',
              fontWeight: tabActiva === tab.id ? 800 : 600,
              fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 2 }}>{tab.emoji}</div>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la tab */}
      <div style={{ padding: 16 }}>
        {tabActiva === 'inventario' && <TabInventario />}
        {tabActiva === 'clientes'   && <TabClientes />}
        {tabActiva === 'ventas'     && <TabVentas />}
      </div>
    </div>
  );
}
