import React from 'react';

// Plano real del restaurante.
// Afuera: cuadrícula 7x3 -> [numero, columna, fila, pequeña]
const LAYOUT_AFUERA = [
  [1, 0, 0, false], [2, 1, 0, false], [3, 2, 0, false], [4, 4, 0, false], [5, 5, 0, false], [6, 6, 0, false],
  [7, 0, 1, true], [8, 6, 1, true],
  [9, 0, 2, false], [10, 1, 2, false], [11, 2, 2, false], [12, 4, 2, false], [13, 5, 2, false], [14, 6, 2, false],
];
const CUARTO = [21, 22, 23, 24, 25, 26, 27, 28, 29];
const ADENTRO = [15, 16, 17, 18, 19, 20];

const ETIQUETA = { libre: 'libre', ocupada: 'ocupada', lista: 'con platos listos' };

// estadoDe(numero) devuelve 'libre' | 'ocupada' | 'lista'.
export default function MapaMesas({ mesas, estadoDe, onMesaClick }) {
  const getMesa = (n) => mesas.find((m) => Number(m.numero) === n);

  const Mesa = ({ n, pequena }) => {
    const m = getMesa(n);
    const estado = m ? estadoDe(n) : 'libre';
    return (
      <button type="button" className={`mesa ${estado}${pequena ? ' pequena' : ''}${m ? '' : ' sin-datos'}`}
        aria-label={`Mesa ${n}, ${ETIQUETA[estado]}`} disabled={!m} onClick={() => m && onMesaClick(m)}>
        {n}
      </button>
    );
  };

  const celdas = [];
  for (let i = 0; i < 21; i++) {
    const c = LAYOUT_AFUERA.find(([, col, row]) => row * 7 + col === i);
    celdas.push(c ? <Mesa key={c[0]} n={c[0]} pequena={c[3]} /> : <div key={'v' + i} />);
  }

  return (
    <>
      <div className="leyenda">
        <span><i /> Libre</span>
        <span><i className="ocupada" /> Ocupada</span>
        <span><i className="lista" /> Plato listo</span>
      </div>
      <section className="zona">
        <span className="zona-nombre">Afuera</span>
        <div className="grid-afuera">{celdas}</div>
      </section>
      <div className="zonas-fila">
        <section className="zona">
          <span className="zona-nombre">El Cuarto</span>
          <div className="grid-3">{CUARTO.map((n) => <Mesa key={n} n={n} />)}</div>
        </section>
        <section className="zona">
          <span className="zona-nombre">Adentro</span>
          <div className="grid-3">{ADENTRO.map((n) => <Mesa key={n} n={n} />)}</div>
        </section>
      </div>
    </>
  );
}
