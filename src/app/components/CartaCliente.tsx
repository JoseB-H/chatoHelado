import { useState, useEffect, useCallback } from 'react';
import {
  obtenerProductos, obtenerClientes, procesarVenta, cargarDeuda,
  formatPrecio, Producto, Cliente,
} from '../datos';

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

type Pantalla = 'carta' | 'carrito' | 'checkout' | 'exito';
type TipoCliente = 'ocasional' | 'frecuente';

// ─── Estilos compartidos ───────────────────────────────────────────────────

const AZUL = 'rgb(0, 89, 255)';
const AZUL_OSCURO = 'rgb(0, 65, 200)';
const AZUL_SUAVE = 'rgba(0, 89, 255, 0.08)';

// ─── Componente principal ──────────────────────────────────────────────────

export default function CartaCliente() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [pantalla, setPantalla] = useState<Pantalla>('carta');
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('ocasional');
  const [clienteSelec, setClienteSelec] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [ultimaVentaTotal, setUltimaVentaTotal] = useState(0);

  const cargarDatos = useCallback(() => {
    setProductos(obtenerProductos());
    setClientes(obtenerClientes());
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ─── Carrito ─────────────────────────────────────────────────────────────

  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = carrito.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);

  function cambiarCantidad(prod: Producto, delta: number) {
    if (prod.stock === 0 && delta > 0) return;
    setCarrito(prev => {
      const existente = prev.find(i => i.producto.id === prod.id);
      if (!existente) {
        if (delta <= 0) return prev;
        return [...prev, { producto: prod, cantidad: 1 }];
      }
      const nuevaCantidad = existente.cantidad + delta;
      if (nuevaCantidad <= 0) return prev.filter(i => i.producto.id !== prod.id);
      if (nuevaCantidad > prod.stock) return prev;
      return prev.map(i => i.producto.id === prod.id ? { ...i, cantidad: nuevaCantidad } : i);
    });
  }

  function cantidadEnCarrito(idProd: number) {
    return carrito.find(i => i.producto.id === idProd)?.cantidad ?? 0;
  }

  // ─── Confirmar pedido ─────────────────────────────────────────────────────

  function confirmarPedido() {
    setErrorMsg('');
    const items = carrito.map(i => ({ idProducto: i.producto.id, cantidad: i.cantidad }));
    const nombre = tipoCliente === 'frecuente' && clienteSelec ? clienteSelec.nombre : 'Ocasional';

    const result = procesarVenta(items, tipoCliente, nombre);

    if (!result.ok) {
      setErrorMsg(result.error ?? 'Error al procesar');
      cargarDatos();
      return;
    }

    if (tipoCliente === 'frecuente' && clienteSelec) {
      const detalle = carrito.map(i => `${i.cantidad}x ${i.producto.nombre}`).join(', ');
      cargarDeuda(clienteSelec.id, totalPrecio, detalle);
    }

    setUltimaVentaTotal(totalPrecio);
    setCarrito([]);
    cargarDatos();
    setPantalla('exito');
  }

  // ─── CARTA ────────────────────────────────────────────────────────────────

  if (pantalla === 'carta') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f0f4ff', paddingBottom: 100 }}>
        {/* Header */}
        <header style={{
          background: AZUL, color: '#fff', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 2px 12px rgba(0,89,255,0.3)',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>🍧 Heladería</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Carta digital</div>
          </div>
        </header>

        {/* Grid de productos */}
        <div style={{ padding: '16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {productos.map(prod => {
            const sinStock = prod.stock === 0;
            const cantActual = cantidadEnCarrito(prod.id);
            return (
              <div
                key={prod.id}
                style={{
                  background: '#fff', borderRadius: 18,
                  overflow: 'hidden', position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  opacity: sinStock ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Badge sin stock */}
                {sinStock && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 10,
                    background: '#ef4444', color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 20, letterSpacing: '0.5px',
                  }}>
                    SIN STOCK
                  </div>
                )}

                {/* Emoji */}
                <div style={{
                  height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48,
                  background: sinStock ? '#f1f5f9' : AZUL_SUAVE,
                }}>
                  {prod.emoji}
                </div>

                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>
                    {prod.nombre}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: AZUL, marginBottom: 8 }}>
                    {formatPrecio(prod.precio)}
                  </div>

                  {/* Stock label */}
                  <div style={{ fontSize: 11, color: sinStock ? '#ef4444' : '#64748b', marginBottom: 8 }}>
                    {sinStock ? '⚠ Reponer' : `Stock: ${prod.stock}`}
                  </div>

                  {/* Contador +/- */}
                  {sinStock ? (
                    <button disabled style={{
                      width: '100%', padding: '10px', borderRadius: 10,
                      border: '1.5px solid #e2e8f0', background: '#f1f5f9',
                      color: '#94a3b8', fontSize: 13, cursor: 'not-allowed',
                    }}>
                      Sin Stock
                    </button>
                  ) : cantActual === 0 ? (
                    <button
                      onClick={() => cambiarCantidad(prod, 1)}
                      style={{
                        width: '100%', padding: '11px', borderRadius: 10,
                        border: 'none', background: AZUL, color: '#fff',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        transition: 'transform 0.1s',
                        boxShadow: '0 3px 10px rgba(0,89,255,0.35)',
                      }}
                    >
                      + Agregar
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => cambiarCantidad(prod, -1)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10,
                          border: `2px solid ${AZUL}`, background: '#fff',
                          color: AZUL, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                        }}
                      >−</button>
                      <span style={{ flex: 0, minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
                        {cantActual}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(prod, 1)}
                        disabled={cantActual >= prod.stock}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 10,
                          border: 'none', background: cantActual >= prod.stock ? '#e2e8f0' : AZUL,
                          color: '#fff', fontSize: 18, fontWeight: 700,
                          cursor: cantActual >= prod.stock ? 'not-allowed' : 'pointer',
                        }}
                      >+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón flotante del carrito */}
        {totalItems > 0 && (
          <div style={{
            position: 'fixed', bottom: 84, left: 16, right: 16, zIndex: 100,
          }}>
            <button
              onClick={() => setPantalla('carrito')}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 16,
                border: 'none', background: AZUL, color: '#fff',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 6px 24px rgba(0,89,255,0.45)',
              }}
            >
              <span style={{
                background: '#fff', color: AZUL,
                borderRadius: '50%', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14,
              }}>
                {totalItems}
              </span>
              <span>Ver carrito</span>
              <span>{formatPrecio(totalPrecio)}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── CARRITO ──────────────────────────────────────────────────────────────

  if (pantalla === 'carrito') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f0f4ff' }}>
        <header style={{
          background: '#fff', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button
            onClick={() => setPantalla('carta')}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: AZUL }}
          >←</button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>🛒 Tu pedido</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{totalItems} productos</div>
          </div>
        </header>

        <div style={{ padding: 16 }}>
          {carrito.map(item => (
            <div key={item.producto.id} style={{
              background: '#fff', borderRadius: 14, padding: '14px 16px',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: 34 }}>{item.producto.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.producto.nombre}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{formatPrecio(item.producto.precio)} c/u</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => cambiarCantidad(item.producto, -1)} style={{
                  width: 34, height: 34, borderRadius: 10, border: `2px solid ${AZUL}`,
                  background: '#fff', color: AZUL, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                }}>−</button>
                <span style={{ fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{item.cantidad}</span>
                <button
                  onClick={() => cambiarCantidad(item.producto, 1)}
                  disabled={item.cantidad >= item.producto.stock}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: item.cantidad >= item.producto.stock ? '#e2e8f0' : AZUL,
                    color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                  }}
                >+</button>
              </div>
              <div style={{ fontWeight: 800, color: AZUL, fontSize: 15, minWidth: 60, textAlign: 'right' }}>
                {formatPrecio(item.producto.precio * item.cantidad)}
              </div>
            </div>
          ))}

          {/* Total */}
          <div style={{
            background: AZUL_SUAVE, borderRadius: 14, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, border: `1.5px solid rgba(0,89,255,0.15)`,
          }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: AZUL }}>{formatPrecio(totalPrecio)}</span>
          </div>

          <button
            onClick={() => setPantalla('checkout')}
            style={{
              width: '100%', padding: 18, borderRadius: 16, border: 'none',
              background: AZUL, color: '#fff', fontSize: 17, fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,89,255,0.4)',
            }}
          >
            Continuar con el pago →
          </button>
        </div>
      </div>
    );
  }

  // ─── CHECKOUT ─────────────────────────────────────────────────────────────

  if (pantalla === 'checkout') {
    return (
      <div style={{ minHeight: '100dvh', background: '#f0f4ff' }}>
        <header style={{
          background: '#fff', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #e2e8f0',
        }}>
          <button
            onClick={() => setPantalla('carrito')}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: AZUL }}
          >←</button>
          <div style={{ fontWeight: 700, fontSize: 17 }}>💳 Tipo de pago</div>
        </header>

        <div style={{ padding: 16 }}>
          {/* Selector tipo cliente */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>¿Cómo paga?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['ocasional', 'frecuente'] as TipoCliente[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => { setTipoCliente(tipo); setClienteSelec(null); }}
                  style={{
                    padding: '16px 10px', borderRadius: 14,
                    border: tipoCliente === tipo ? `2.5px solid ${AZUL}` : '2px solid #e2e8f0',
                    background: tipoCliente === tipo ? AZUL_SUAVE : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 4 }}>
                    {tipo === 'ocasional' ? '💵' : '👤'}
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: 13,
                    color: tipoCliente === tipo ? AZUL : '#1a1a2e',
                  }}>
                    {tipo === 'ocasional' ? 'Al Contado' : 'A Cuenta'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    {tipo === 'ocasional' ? 'Pago inmediato' : 'Cargar a deuda'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selector de cliente frecuente */}
          {tipoCliente === 'frecuente' && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>Seleccionar cliente</div>
              {clientes.map(c => (
                <button
                  key={c.id}
                  onClick={() => setClienteSelec(c)}
                  style={{
                    width: '100%', padding: '13px 14px', borderRadius: 12,
                    marginBottom: 8, textAlign: 'left', cursor: 'pointer',
                    border: clienteSelec?.id === c.id ? `2px solid ${AZUL}` : '2px solid #e2e8f0',
                    background: clienteSelec?.id === c.id ? AZUL_SUAVE : '#f8faff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: clienteSelec?.id === c.id ? AZUL : '#1a1a2e' }}>
                      {c.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: c.saldo > 0 ? '#ef4444' : '#22c55e' }}>
                      {c.saldo > 0 ? `Debe: ${formatPrecio(c.saldo)}` : '✓ Sin deuda'}
                    </div>
                  </div>
                  {clienteSelec?.id === c.id && (
                    <span style={{ color: AZUL, fontSize: 20 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Resumen */}
          <div style={{
            background: '#fff', borderRadius: 16, padding: 16,
            marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>Resumen del pedido</div>
            {carrito.map(item => (
              <div key={item.producto.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                <span>{item.cantidad}× {item.producto.nombre}</span>
                <span style={{ fontWeight: 600 }}>{formatPrecio(item.producto.precio * item.cantidad)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: AZUL }}>{formatPrecio(totalPrecio)}</span>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12,
              padding: '12px 14px', marginBottom: 14, color: '#dc2626', fontSize: 14, fontWeight: 600,
            }}>
              ⚠ {errorMsg}
            </div>
          )}

          <button
            disabled={tipoCliente === 'frecuente' && !clienteSelec}
            onClick={confirmarPedido}
            style={{
              width: '100%', padding: 18, borderRadius: 16, border: 'none',
              background: tipoCliente === 'frecuente' && !clienteSelec ? '#94a3b8' : AZUL,
              color: '#fff', fontSize: 17, fontWeight: 800,
              cursor: tipoCliente === 'frecuente' && !clienteSelec ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0,89,255,0.35)',
            }}
          >
            {tipoCliente === 'frecuente' && !clienteSelec ? 'Seleccioná un cliente' : '✓ Confirmar pedido'}
          </button>
        </div>
      </div>
    );
  }

  // ─── ÉXITO ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh', background: '#f0f4ff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', marginBottom: 8 }}>
        ¡Pedido confirmado!
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: AZUL, marginBottom: 8 }}>
        {formatPrecio(ultimaVentaTotal)}
      </div>
      {tipoCliente === 'frecuente' && clienteSelec && (
        <div style={{
          background: '#fff3cd', borderRadius: 12, padding: '12px 20px',
          marginBottom: 24, color: '#92400e', fontSize: 14, fontWeight: 600,
        }}>
          📋 Cargado a la cuenta de {clienteSelec.nombre}
        </div>
      )}
      <div style={{ color: '#64748b', marginBottom: 32, fontSize: 15 }}>
        El stock fue actualizado automáticamente.
      </div>
      <button
        onClick={() => { setPantalla('carta'); setTipoCliente('ocasional'); setClienteSelec(null); }}
        style={{
          padding: '18px 40px', borderRadius: 16, border: 'none',
          background: AZUL, color: '#fff', fontSize: 17, fontWeight: 800,
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,89,255,0.4)',
          width: '100%',
        }}
      >
        Nuevo pedido
      </button>
    </div>
  );
}
