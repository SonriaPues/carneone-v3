import os, json
from datetime import datetime, date
from collections import defaultdict
import psycopg2, psycopg2.extras
from dotenv import load_dotenv
load_dotenv()

PROTEINAS = ['Carne','Pechuga','Cerdo','Costillas','Mojarra','Trucha']
PESOS_G   = {'Carne':115,'Pechuga':125,'Cerdo':115,'Costillas':150,'Mojarra':275,'Trucha':170}
MIN_DIAS_ML = 30  # días mínimos para activar Random Forest

def get_conn():
    return psycopg2.connect(os.getenv('DATABASE_URL'), sslmode='require')

def get_turnos():
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM turnos WHERE cerrado_en IS NOT NULL ORDER BY cerrado_en ASC")
    rows = cur.fetchall(); cur.close(); conn.close()
    return rows

def construir_dataset(turnos):
    """Construye dataset diario por proteina desde los turnos."""
    por_dia = defaultdict(lambda: defaultdict(int))
    for t in turnos:
        cerrado = t['cerrado_en']
        if not cerrado: continue
        if isinstance(cerrado, str): cerrado = datetime.fromisoformat(cerrado)
        dia_key = cerrado.strftime('%Y-%m-%d')
        items = t['items'] if isinstance(t['items'], list) else json.loads(t['items'] or '[]')
        for item in items:
            p = item.get('proteina')
            if p and p in PROTEINAS: por_dia[dia_key][p] += 1
    return por_dia

def dias_unicos(turnos):
    dias = set()
    for t in turnos:
        c = t['cerrado_en']
        if c:
            if isinstance(c, str): c = datetime.fromisoformat(c)
            dias.add(c.strftime('%Y-%m-%d'))
    return dias

def predecir_promedio(fecha_obj, por_dia):
    """Predicción por promedio ponderado según día de semana."""
    dia_idx = fecha_obj.weekday()
    resultado = {}
    for prot in PROTEINAS:
        valores_dia = [v[prot] for d, v in por_dia.items()
                       if datetime.strptime(d,'%Y-%m-%d').weekday() == dia_idx]
        if not valores_dia:
            todos = [v[prot] for v in por_dia.values()]
            resultado[prot] = round(sum(todos)/len(todos), 1) if todos else 0.0
        else:
            n = len(valores_dia)
            pesos = list(range(1, n+1)); sp = sum(pesos)
            resultado[prot] = round(sum(v*p for v,p in zip(valores_dia,pesos))/sp, 1)
    return resultado, 'promedio_ponderado'

def predecir_ml(fecha_obj, por_dia):
    """Predicción con Random Forest."""
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.preprocessing import LabelEncoder

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
        # Features para la fecha objetivo
        xf = np.array([[fecha_obj.weekday(), fecha_obj.day,
                        1 if (1 <= fecha_obj.day <= 8 or 15 <= fecha_obj.day <= 23) else 0,
                        fecha_obj.month]])

        resultado = {}
        for p in PROTEINAS:
            y = np.array(y_dict[p])
            if y.sum() == 0:
                resultado[p] = 0.0; continue
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

    turnos  = get_turnos()
    por_dia = construir_dataset(turnos)
    dias    = dias_unicos(turnos)

    if len(dias) >= MIN_DIAS_ML:
        pred, modelo = predecir_ml(datetime.combine(fecha_obj, datetime.min.time()), por_dia)
        if pred is None:  # fallback
            pred, modelo = predecir_promedio(datetime.combine(fecha_obj, datetime.min.time()), por_dia)
    else:
        pred, modelo = predecir_promedio(datetime.combine(fecha_obj, datetime.min.time()), por_dia)

    dias_semana = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
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

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        "SELECT items FROM turnos WHERE DATE(cerrado_en AT TIME ZONE 'America/Bogota')=%s",
        [str(fecha_obj)]
    )
    turnos = cur.fetchall(); cur.close(); conn.close()

    conteo = defaultdict(int)
    for t in turnos:
        items = t['items'] if isinstance(t['items'], list) else json.loads(t['items'] or '[]')
        for item in items:
            p = item.get('proteina')
            if p and p in PROTEINAS: conteo[p] += 1

    return {p: {'unidades_reales': conteo.get(p,0),
                'kg_reales': round((conteo.get(p,0)*PESOS_G[p])/1000,2)} for p in PROTEINAS}

def comparacion(fecha_str=None):
    pred = predecir(fecha_str)
    real = real_del_dia(fecha_str)
    resultado = {}
    for p in PROTEINAS:
        up = pred['prediccion'][p]['unidades_predichas']
        ur = real[p]['unidades_reales']
        dif = round(ur - up, 1)
        pct = round((dif/up*100),1) if up > 0 else None
        resultado[p] = {
            'unidades_predichas': up, 'kg_predichos': pred['prediccion'][p]['kg_predichos'],
            'unidades_reales': ur,    'kg_reales': real[p]['kg_reales'],
            'diferencia_unidades': dif, 'diferencia_pct': pct,
            'peso_porcion_g': PESOS_G[p]
        }
    return {'fecha': pred['fecha'], 'modelo_usado': pred['modelo_usado'],
            'dias_historico': pred['dias_historico'], 'comparacion': resultado}

def recomendacion_neta(fecha_str=None):
    """Recomendación descontando el stock actual en inventario."""
    pred = predecir(fecha_str)
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT nombre, stock_actual FROM inventario")
    stock = {r['nombre']: r['stock_actual'] for r in cur.fetchall()}
    cur.close(); conn.close()

    resultado = {}
    for p in PROTEINAS:
        u = pred['prediccion'][p]['unidades_predichas']
        kg_pred = pred['prediccion'][p]['kg_predichos']
        g_stock = stock.get(p, 0)
        kg_stock = round(g_stock / 1000, 2)
        kg_neto  = max(0, round(kg_pred - kg_stock, 2))
        resultado[p] = {
            'kg_predichos': kg_pred, 'kg_en_stock': kg_stock,
            'kg_a_comprar': kg_neto, 'alerta': g_stock <= 500
        }
    return {'fecha': pred['fecha'], 'dia_semana': pred['dia_semana'],
            'modelo_usado': pred['modelo_usado'], 'recomendacion_neta': resultado}
