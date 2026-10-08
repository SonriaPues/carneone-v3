from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prediccion import predecir, comparacion, recomendacion_neta

app = FastAPI(title="Carneone Predicción v3")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health(): return {"status": "ok", "version": "3.0.0"}

@app.get("/predecir")
def endpoint_predecir(fecha: str = None):
    return predecir(fecha)

@app.get("/comparacion")
def endpoint_comparacion(fecha: str = None):
    return comparacion(fecha)

@app.get("/recomendacion-neta")
def endpoint_recomendacion_neta(fecha: str = None):
    return recomendacion_neta(fecha)
