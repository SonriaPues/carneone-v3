import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prediccion import predecir, comparacion, recomendacion_neta, get_conn

app = FastAPI(title="Carneone Predicción v4")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def init_db():
    """Crea el esquema `prediccion`, propio y exclusivo de este servicio
    (numeral 3.2), separado de los esquemas `pedidos`, `inventario` y `admin`."""
    conn = psycopg2_connect_raw()
    cur = conn.cursor()
    cur.execute("""
        CREATE SCHEMA IF NOT EXISTS prediccion;
        CREATE TABLE IF NOT EXISTS prediccion.recomendaciones_historial (
            id SERIAL PRIMARY KEY,
            fecha DATE NOT NULL,
            modelo_usado TEXT,
            recomendacion JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS prediccion.modelos_entrenados (
            id SERIAL PRIMARY KEY,
            algoritmo TEXT NOT NULL,
            entrenado_en TIMESTAMPTZ DEFAULT NOW(),
            dias_historico INT,
            metricas JSONB
        );
    """)
    conn.commit()
    cur.close()
    conn.close()


def psycopg2_connect_raw():
    import psycopg2
    conn = psycopg2.connect(os.getenv('DATABASE_URL'), sslmode='require')
    return conn


@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"No se pudo inicializar el esquema 'prediccion': {e}")


@app.get("/health")
def health():
    return {"status": "ok", "service": "prediccion-service", "version": "4.0.0"}


@app.get("/predecir")
def endpoint_predecir(fecha: str = None):
    return predecir(fecha)


@app.get("/comparacion")
def endpoint_comparacion(fecha: str = None):
    return comparacion(fecha)


@app.get("/recomendacion-neta")
def endpoint_recomendacion_neta(fecha: str = None):
    return recomendacion_neta(fecha)
