import os, json
from datetime import datetime, date
from collections import defaultdict
import requests
import psycopg2, psycopg2.extras
from dotenv import load_dotenv
load_dotenv()

PROTEINAS = ['Carne', 'Pechuga', 'Cerdo', 'Costillas', 'Mojarra', 'Trucha']
PESOS_G = {'Carne': 115, 'Pechuga': 125, 'Cerdo': 115, 'Costillas': 150, 'Mojarra': 275, 'Trucha': 170}
MIN_DIAS_ML = 30  # días mínimos para activar Random Forest (numeral 3.5.1)

PEDIDOS_URL = os.getenv('PEDIDOS_URL', 'http://localhost:4001')
INVENTARIO_URL = os.getenv('INVENTARIO_URL', 'http://localhost:4002')
INTERNAL_KEY = os.getenv('INTERNAL_KEY', '')
INTERNAL_HEADERS = {'x-internal-key': INTERNAL_KEY}


def get_conn():
    """Conexión a la base de datos, acotada al esquema propio `prediccion`
    (numeral 3.2): aquí solo se cachean el historial replicado, los modelos
    entrenados y las recomendaciones generadas, nunca las tablas de otros
    servicios."""
    conn = psycopg2.connect(os.getenv('DATABASE_URL'), sslmode=('require' if os.getenv('DB_SSL')=='true' else 'disable'))
    with conn.cursor() as cur:
        cur.execute("SET search_path TO prediccion, public")
    return conn


def get_turnos():
    """Historial de ventas cerradas. Antes se leía directamente de la tabla
    `turnos` del Servicio de Pedidos; ahora se obtiene por REST síncrono al
    endpoint interno de ese servicio (numeral 3.2/3.3), preservando el
    principio de que cada microservicio es dueño exclusivo de sus datos."""
    r = requests.get(f"{PEDIDOS_URL}/internal/turnos", headers=INTERNAL_HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()


def get_stock_inventario():
    """Stock actual por proteína, consultado al Servicio de Inventario por
    REST (numeral 3.2/3.3), en vez de leer su base de datos directamente."""
    r = requests.get(f"{INVENTARIO_URL}/internal/stock", headers=INTERNAL_HEADERS, timeout=10)
    r.raise_for_status()
    return {row['nombre']: row['stock_actual'] for row in r.json()}


def construir_dataset(turnos):
    """Construye dataset diario por proteina desde los turnos."""
    por_dia = defaultdict(lambda: defaultdict(int))
    for t in turnos:
        cerrado = t.get('cerrado_en')
        if not cerrado:
            continue
        if isinstance(cerrado, str):
            cerrado = datetime.fromisoformat(cerrado.replace('Z', '+00:00'))
        dia_key = cerrado.strftime('%Y-%m-%d')
        items = t['items'] if isinstance(t['items'], list) else json.loads(t['items'] or '[]')
        for item in items:
            p = item.get('proteina')
            if p and p in PROTEINAS:
                por_dia[dia_key][p] += 1
    return por_dia


def dias_unicos(turnos):
    dias = set()
    for t in turnos:
        c = t.get('cerrado_en')
        if c:
            if isinstance(c, str):
                c = datetime.fromisoformat(c.replace('Z', '+00:00'))
            dias.add(c.strftime('%Y-%m-%d'))
    return dias


def predecir_promedio(fecha_obj, por_dia):
    """Predicción por promedio ponderado según día de semana (modelo base,
    numeral 3.5.1): se usa por debajo del umbral MIN_DIAS_ML y como respaldo
    si el entrenamiento del modelo de aprendizaje automático falla."""
    dia_idx = fecha_obj.weekday()
    resultado = {}
    for prot in PROTEINAS:
        valores_dia = [v[prot] for d, v in por_dia.items()
                       if datetime.strptime(d, '%Y-%m-%d').weekday() == dia_idx]
        if not valores_dia:
            todos = [v[prot] for v in por_dia.values()]
            resultado[prot] = round(sum(todos) / len(todos), 1) if todos else 0.0
        else:
            n = len(valores_dia)
            pesos = list(range(1, n + 1))
            sp = sum(pesos)
            resultado[prot] = round(sum(v * p for v, p in zip(valores_dia, pesos)) / sp, 1)
    return resultado, 'promedio_ponderado'


def predecir_ml(fecha_obj, por_dia):
    """Predicción con Random Forest sobre variables calendario."""
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestRegressor

        dias_ord = sorted(por_dia.keys())
        X, y_dict = [], {p: [] for p in PROTEINAS}

        for d in dias_ord:
            dt = datetime.strptime(d, '%Y-%m-%d')
            dia_sem = dt.weekday()
            dia_mes = dt.day
            es_quincena = 1 if (1 <= dia_mes <= 8 or 15 <= dia_mes <= 23) else 0
            mes = dt.month
            X.append([dia_sem, dia_mes, es_quincena, mes])
            for p in PROTEINAS:
                y_dict[p].append(por_dia[d].get(p, 0))

        X = np.array(X)
        xf = np.array([[fecha_obj.weekday(), fecha_obj.day,
                         1 if (1 <= fecha_obj.day <= 8 or 15 <= fecha_obj.day <= 23) else 0,
                         fecha_obj.month]])

        resultado = {}
        for p in PROTEINAS:
            y = np.array(y_dict[p])
            if y.sum() == 0:
                resultado[p] = 0.0
                continue
            rf = RandomForestRegressor(n_estimators=100, random_state=42, min_samples_leaf=2)
            rf.fit(X, y)
            pred = rf.predict(xf)[0]
            resultado[p] = round(max(0, pred), 1)
        return resultado, 'random_forest'
    except Exception as e:
        return None, str(e)


def predecir(fecha_str=None):
    if fecha_str:
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    else:
        fecha_obj = date.today()

    turnos = get_turnos()
    por_dia = construir_dataset(turnos)
    dias = dias_unicos(turnos)

    if len(dias) >= MIN_DIAS_ML:
        pred, modelo = predecir_ml(datetime.combine(fecha_obj, datetime.min.time()), por_dia)
        if pred is None:
            pred, modelo = predecir_promedio(datetime.combine(fecha_obj, datetime.min.time()), por_dia)
    else:
        pred, modelo = predecir_promedio(datetime.combine(fecha_obj, datetime.min.time()), por_dia)

    dias_semana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    resultado = {}
    for p in PROTEINAS:
        u = pred[p]
        resultado[p] = {
            'unidades_predichas': u,
            'kg_predichos': round((u * PESOS_G[p]) / 1000, 2),
            'peso_porcion_g': PESOS_G[p]
        }

    return {
        'fecha': str(fecha_obj),
        'dia_semana': dias_semana[fecha_obj.weekday()],
        'modelo_usado': modelo,
        'dias_historico': len(dias),
        'prediccion': resultado
    }


def real_del_dia(fecha_str=None):
    if fecha_str:
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    else:
        fecha_obj = date.today()

    r = requests.get(f"{PEDIDOS_URL}/internal/turnos", params={'fecha': str(fecha_obj)},
                      headers=INTERNAL_HEADERS, timeout=10)
    r.raise_for_status()
    turnos = r.json()

    conteo = defaultdict(int)
    for t in turnos:
        items = t['items'] if isinstance(t['items'], list) else json.loads(t['items'] or '[]')
        for item in items:
            p = item.get('proteina')
            if p and p in PROTEINAS:
                conteo[p] += 1

    return {p: {'unidades_reales': conteo.get(p, 0),
                'kg_reales': round((conteo.get(p, 0) * PESOS_G[p]) / 1000, 2)} for p in PROTEINAS}


def comparacion(fecha_str=None):
    pred = predecir(fecha_str)
    real = real_del_dia(fecha_str)
    resultado = {}
    for p in PROTEINAS:
        up = pred['prediccion'][p]['unidades_predichas']
        ur = real[p]['unidades_reales']
        dif = round(ur - up, 1)
        pct = round((dif / up * 100), 1) if up > 0 else None
        resultado[p] = {
            'unidades_predichas': up, 'kg_predichos': pred['prediccion'][p]['kg_predichos'],
            'unidades_reales': ur, 'kg_reales': real[p]['kg_reales'],
            'diferencia_unidades': dif, 'diferencia_pct': pct,
            'peso_porcion_g': PESOS_G[p]
        }
    return {'fecha': pred['fecha'], 'modelo_usado': pred['modelo_usado'],
            'dias_historico': pred['dias_historico'], 'comparacion': resultado}


def recomendacion_neta(fecha_str=None):
    """Recomendación de compra neta descontando el stock actual en inventario
    (numeral 3.5.2): Compra_neta = kg_predichos - kg_en_stock."""
    pred = predecir(fecha_str)
    stock = get_stock_inventario()

    resultado = {}
    for p in PROTEINAS:
        kg_pred = pred['prediccion'][p]['kg_predichos']
        g_stock = stock.get(p, 0)
        kg_stock = round(g_stock / 1000, 2)
        kg_neto = max(0, round(kg_pred - kg_stock, 2))
        resultado[p] = {
            'kg_predichos': kg_pred, 'kg_en_stock': kg_stock,
            'kg_a_comprar': kg_neto, 'alerta': g_stock <= 500
        }

    respuesta = {'fecha': pred['fecha'], 'dia_semana': pred['dia_semana'],
                 'modelo_usado': pred['modelo_usado'], 'recomendacion_neta': resultado}
    _guardar_recomendacion(respuesta)
    return respuesta


def _guardar_recomendacion(respuesta):
    """Persiste cada recomendación generada en el esquema propio `prediccion`
    (numeral 3.2: "prediccion almacena ... las recomendaciones generadas"),
    dejando trazabilidad para comparar contra lo realmente comprado."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO recomendaciones_historial (fecha, modelo_usado, recomendacion, created_at) "
            "VALUES (%s, %s, %s, NOW())",
            [respuesta['fecha'], respuesta['modelo_usado'], json.dumps(respuesta['recomendacion_neta'])]
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        pass  # No bloquea la respuesta al backend si el registro de auditoría falla.
