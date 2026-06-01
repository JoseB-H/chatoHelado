/**
 * datos.ts — Capa de datos compartida (localStorage)
 */

export interface Producto {
  id: number;
  nombre: string;
  emoji: string;
  precio: number;
  stock: number;
}

export interface MovimientoCliente {
  tipo: 'deuda' | 'abono';
  fecha: string;
  monto: number;
  detalle: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  saldo: number;
  historial: MovimientoCliente[];
}

export interface ItemVenta {
  idProducto: number;
  nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string;
  items: ItemVenta[];
  total: number;
  tipoCliente: 'ocasional' | 'frecuente';
  nombreCliente: string;
}

export interface DB {
  productos: Producto[];
  clientes: Cliente[];
  ventas: Venta[];
  ultimoIdCliente: number;
  ultimoIdProducto: number;
}

const CLAVE_DB = 'heladeriaDB_v1';

const DATOS_INICIALES: DB = {
  productos: [
    { id: 1, nombre: 'Paleta de Chocolate', emoji: '🍫', precio: 500,  stock: 12 },
    { id: 2, nombre: 'Paleta de Fresa',     emoji: '🍓', precio: 500,  stock: 8  },
    { id: 3, nombre: 'Helado de Vainilla',  emoji: '🍦', precio: 700,  stock: 0  },
    { id: 4, nombre: 'Paleta de Limón',     emoji: '🍋', precio: 500,  stock: 5  },
    { id: 5, nombre: 'Helado de Mango',     emoji: '🥭', precio: 600,  stock: 3  },
    { id: 6, nombre: 'Sundae Chocolate',    emoji: '🍨', precio: 900,  stock: 6  },
  ],
  clientes: [
    { id: 1, nombre: 'María García',  saldo: 1500, historial: [] },
    { id: 2, nombre: 'Carlos López',  saldo: 800,  historial: [] },
    { id: 3, nombre: 'Ana Martínez',  saldo: 0,    historial: [] },
  ],
  ventas: [],
  ultimoIdCliente: 3,
  ultimoIdProducto: 6,
};

// ─── Core ──────────────────────────────────────────────────────────────────

export function obtenerDB(): DB {
  try {
    const raw = localStorage.getItem(CLAVE_DB);
    return raw ? (JSON.parse(raw) as DB) : clonarIniciales();
  } catch {
    return clonarIniciales();
  }
}

function clonarIniciales(): DB {
  const db: DB = JSON.parse(JSON.stringify(DATOS_INICIALES));
  guardarDB(db);
  return db;
}

export function guardarDB(db: DB): void {
  localStorage.setItem(CLAVE_DB, JSON.stringify(db));
}

// ─── Productos ─────────────────────────────────────────────────────────────

export function obtenerProductos(): Producto[] {
  return obtenerDB().productos;
}

export function reponerStock(idProducto: number, cantidad: number): boolean {
  const db = obtenerDB();
  const prod = db.productos.find(p => p.id === idProducto);
  if (!prod) return false;
  prod.stock += cantidad;
  guardarDB(db);
  return true;
}

/** Ajusta el stock sumando o restando. No baja de 0. */
export function ajustarStock(idProducto: number, delta: number): { ok: boolean; nuevoStock: number } {
  const db = obtenerDB();
  const prod = db.productos.find(p => p.id === idProducto);
  if (!prod) return { ok: false, nuevoStock: 0 };
  prod.stock = Math.max(0, prod.stock + delta);
  guardarDB(db);
  return { ok: true, nuevoStock: prod.stock };
}

export function agregarProducto(datos: Omit<Producto, 'id'>): number {
  const db = obtenerDB();
  db.ultimoIdProducto += 1;
  db.productos.push({ id: db.ultimoIdProducto, ...datos });
  guardarDB(db);
  return db.ultimoIdProducto;
}

export function eliminarProducto(id: number): void {
  const db = obtenerDB();
  db.productos = db.productos.filter(p => p.id !== id);
  guardarDB(db);
}

// ─── Clientes ──────────────────────────────────────────────────────────────

export function obtenerClientes(): Cliente[] {
  return obtenerDB().clientes;
}

export function agregarCliente(nombre: string): Cliente {
  const db = obtenerDB();
  db.ultimoIdCliente += 1;
  const nuevo: Cliente = { id: db.ultimoIdCliente, nombre, saldo: 0, historial: [] };
  db.clientes.push(nuevo);
  guardarDB(db);
  return nuevo;
}

export function cargarDeuda(idCliente: number, total: number, detalle: string): boolean {
  const db = obtenerDB();
  const cliente = db.clientes.find(c => c.id === idCliente);
  if (!cliente) return false;
  cliente.saldo += total;
  cliente.historial.push({ tipo: 'deuda', fecha: new Date().toISOString(), monto: total, detalle });
  guardarDB(db);
  return true;
}

export function registrarAbono(idCliente: number, monto: number): boolean {
  const db = obtenerDB();
  const cliente = db.clientes.find(c => c.id === idCliente);
  if (!cliente) return false;
  const real = Math.min(monto, cliente.saldo);
  cliente.saldo = Math.max(0, cliente.saldo - real);
  cliente.historial.push({ tipo: 'abono', fecha: new Date().toISOString(), monto: real, detalle: 'Abono recibido' });
  guardarDB(db);
  return true;
}

// ─── Ventas (descuenta stock y registra) ───────────────────────────────────

export function procesarVenta(
  carrito: { idProducto: number; cantidad: number }[],
  tipoCliente: 'ocasional' | 'frecuente',
  nombreCliente: string,
): { ok: boolean; error?: string } {
  const db = obtenerDB();

  // Validar stock en tiempo real antes de confirmar
  for (const item of carrito) {
    const prod = db.productos.find(p => p.id === item.idProducto);
    if (!prod) return { ok: false, error: `Producto no encontrado` };
    if (prod.stock < item.cantidad) return { ok: false, error: `Stock insuficiente: ${prod.nombre}` };
  }

  // Construir items con nombre y subtotal
  const items: ItemVenta[] = carrito.map(item => {
    const prod = db.productos.find(p => p.id === item.idProducto)!;
    return { idProducto: item.idProducto, nombre: prod.nombre, cantidad: item.cantidad, subtotal: prod.precio * item.cantidad };
  });

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  // Descontar stock
  for (const item of carrito) {
    const prod = db.productos.find(p => p.id === item.idProducto)!;
    prod.stock -= item.cantidad;
  }

  // Registrar venta
  db.ventas.unshift({ id: Date.now(), fecha: new Date().toISOString(), items, total, tipoCliente, nombreCliente });
  guardarDB(db);
  return { ok: true };
}

// ─── Utilidades ────────────────────────────────────────────────────────────

export function formatPrecio(n: number): string {
  return 'S/ ' + n.toLocaleString('es-PE');
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
