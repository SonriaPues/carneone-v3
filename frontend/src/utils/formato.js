// Menú real, formatos y datos fijos del restaurante.

export const PROTEINAS = ['Carne', 'Pechuga', 'Cerdo', 'Costillas', 'Mojarra', 'Trucha'];

// Gramos por plato que descuenta cada proteína (los mismos de pedidos-service).
export const PORCIONES = { Carne: 115, Pechuga: 125, Cerdo: 115, Costillas: 150, Mojarra: 275, Trucha: 170 };

// Precios en COP. La bandeja lleva proteína y descuenta inventario; el almuerzo
// del día, los platos de fin de semana y los adicionales no.
export const ALMUERZO = { plato: 'Almuerzo del día', desc: 'Alm', precio: 15000, corto: 'Almuerzo' };
export const BANDEJAS = [
  { plato: 'Bandeja con sopa', codigo: 'Combo', precio: 17000, corto: 'Bandeja + sopa' },
  { plato: 'Bandeja sin sopa', codigo: 'Media', precio: 16000, corto: 'Bandeja sola' },
];
export const PLATOS_FDS = [
  { plato: 'Frijolada', desc: 'Frijolada', precio: 19000 },
  { plato: 'Arroz Carneone', desc: 'Arroz Carneone', precio: 19000 },
];
export const ADICIONALES = [
  { desc: 'Porc. arroz', precio: 3000 }, { desc: 'Porc. plátano', precio: 3000 },
  { desc: 'Porc. principio', precio: 3000 }, { desc: 'Porc. ensalada', precio: 3000 },
  { desc: 'Porc. papa francesa', precio: 6000 }, { desc: 'Sopa adicional', precio: 6000 },
  { desc: 'Porc. carne', precio: 6000 }, { desc: 'Porc. pechuga', precio: 6000 },
  { desc: 'Porc. cerdo', precio: 6000 }, { desc: 'Porc. proteína', precio: 8000 },
  { desc: 'Huevo adicional', precio: 1000 }, { desc: 'Bebida adicional', precio: 1000 },
];
// Platos principales en el orden en que se muestran en caja y en el admin.
export const PLATOS = [ALMUERZO.plato, ...BANDEJAS.map((b) => b.plato)];
export const NOMBRES_FDS = PLATOS_FDS.map((p) => p.plato);

// Clave con que el menú guarda cada plato (igual que la versión anterior).
export const claveMenu = (p) => p.toLowerCase().replace(/ /g, '_');

let _n = 0;
export const nuevoItem = ({ desc, plato, proteina = null, precio, adicional = false }) =>
  ({ key: `${Date.now()}-${_n++}`, desc, plato: plato || desc, proteina, precio, ...(adicional ? { adicional: true } : {}) });

// Nombre legible de un ítem: "Bandeja con sopa · Carne", "Almuerzo del día", "Huevo adicional".
export const nombreItem = (it) => (it.proteina ? `${it.plato} · ${it.proteina}` : it.adicional ? it.desc || it.plato : it.plato || it.desc);

export const pesos = (n) => '$' + Math.round(n || 0).toLocaleString('es-CO');
export const kg = (g) => ((g || 0) / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 });
export const cantidadG = (g) => (Math.abs(g) < 1000 ? `${Math.round(g)} g` : `${kg(g)} kg`);

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fechaLarga = (d = new Date()) => `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const fechaIsoADia = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const nombreDia = (iso) => DIAS[new Date(iso + 'T12:00:00').getDay()];
export const hoyIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
export const mananaIso = () => { const d = new Date(hoyIso() + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
export const hora = (ts) => new Date(ts).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
export const horaCorta = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'a. m.' : 'p. m.'}`;
export const esFinDeSemana = (d = new Date()) => d.getDay() === 0 || d.getDay() === 6;

export const minutosDesde = (ts) => Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));

// Zona del plano real según el número de mesa (la base guarda nombres antiguos).
export const zonaMesa = (n) => (Number(n) <= 14 ? 'Afuera' : Number(n) <= 20 ? 'Adentro' : 'El Cuarto');

export const vigentes = (items) => (items || []).filter((i) => !i.anulado);
export const totalPedido = (p) => vigentes(p.items).reduce((s, i) => s + (Number(i.precio) || 0), 0);
export const contarPlatos = (items) => vigentes(items).filter((i) => !i.adicional).length;

// Junta ítems iguales: "2 × Bandeja con sopa · Carne". Los que llevan nota distinta van aparte.
// Cada grupo guarda los índices originales para poder quitar uno.
export function agrupar(items) {
  const grupos = [];
  (items || []).forEach((it, idx) => {
    if (it.anulado) return;
    const clave = `${it.proteina || ''}|${it.plato}|${it.desc || ''}|${it.nota || ''}`;
    const g = grupos.find((x) => x.clave === clave);
    if (g) { g.cant++; g.valor += Number(it.precio) || 0; g.indices.push(idx); }
    else grupos.push({ clave, proteina: it.proteina, plato: it.plato, desc: it.desc, adicional: !!it.adicional, nota: it.nota, cant: 1, valor: Number(it.precio) || 0, indices: [idx], nombre: nombreItem(it) });
  });
  return grupos;
}

export const iniciales = (nombre = '') => nombre.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
