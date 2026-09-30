# Versión monolítica (histórica)

Este contenido corresponde a la versión entregada originalmente para el
Objetivo 3 (un backend Express + un servicio de predicción FastAPI, con base
de datos compartida sin separación por esquemas). Se conserva aquí solo como
referencia histórica.

La versión vigente del sistema está en `../services/`, dividida en cuatro
microservicios (Pedidos, Inventario, Panel Administrativo/Usuarios y
Predicción de Demanda) coordinados por un API Gateway, conforme al diseño
del Objetivo 2 (numeral 3.1). Ver `../README.md` para instrucciones de uso.
