import { useState } from 'react';
import CartaCliente from './components/CartaCliente';
import PanelAdmin from './components/PanelAdmin';

type Vista = 'carta' | 'admin';

const AZUL = 'rgb(0, 89, 255)';

const TABS: { id: Vista; emoji: string; label: string }[] = [
  { id: 'carta', emoji: '🛒', label: 'Carta' },
  { id: 'admin', emoji: '⚙️', label: 'Admin' },
];

export default function App() {
  const [vista, setVista] = useState<Vista>('carta');

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
    }}>
      {/* Contenido principal con padding para la barra inferior */}
      <div style={{ paddingBottom: 70 }}>
        {vista === 'carta'
          ? <CartaCliente />
          : <PanelAdmin />
        }
      </div>

      {/* Barra de navegación fija al fondo */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        zIndex: 200,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        {TABS.map(tab => {
          const activa = vista === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setVista(tab.id)}
              style={{
                flex: 1,
                padding: '10px 0 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                position: 'relative',
              }}
            >
              {/* Indicador activo */}
              {activa && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 40,
                  height: 3,
                  borderRadius: '0 0 4px 4px',
                  background: AZUL,
                }} />
              )}
              <span style={{ fontSize: 22 }}>{tab.emoji}</span>
              <span style={{
                fontSize: 11,
                fontWeight: activa ? 800 : 500,
                color: activa ? AZUL : '#94a3b8',
                letterSpacing: '0.3px',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
