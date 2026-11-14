"""`arranque.llamar_asgi` debe responder igual que el TestClient de FastAPI."""
import asyncio
import json

import pytest

import arranque
from api.app import create_app


def _sin_fechas(x):
    """Quita «fecha_generacion» a cualquier profundidad (cambia entre llamadas)."""
    if isinstance(x, dict):
        return {k: _sin_fechas(v) for k, v in x.items() if k != "fecha_generacion"}
    if isinstance(x, list):
        return [_sin_fechas(v) for v in x]
    return x


def _por_asgi(proveedor, peticiones):
    async def correr():
        app = create_app(proveedor)
        detener = await arranque.arrancar_lifespan(app)
        try:
            return [await arranque.llamar_asgi(app, m, r, c) for m, r, c in peticiones]
        finally:
            await detener()
    return asyncio.run(correr())


def _igual(cliente, resultado, metodo, ruta, cuerpo):
    esperado = cliente.request(metodo, ruta, json=json.loads(cuerpo) if cuerpo else None)
    estado, texto = resultado
    assert estado == esperado.status_code
    assert _sin_fechas(json.loads(texto)) == _sin_fechas(esperado.json())
    return estado, json.loads(texto)


@pytest.mark.parametrize("metodo,ruta,cuerpo", [
    ("GET", "/api/salud", None),
    ("GET", "/api/escenarios", None),
    ("GET", "/api/escenarios/no_existe", None),   # 404 con clave_texto
])
def test_llamar_asgi_igual_que_testclient(cliente_demo, _demo, metodo, ruta, cuerpo):
    (res,) = _por_asgi(_demo, [(metodo, ruta, cuerpo)])
    _igual(cliente_demo, res, metodo, ruta, cuerpo)


def test_cambio_y_422_con_clave(cliente_demo, _demo):
    adq = cliente_demo.get("/api/escenarios/ec_la_segua").json()["adquisiciones"]
    ids = [a["id"] if isinstance(a, dict) and "id" in a else a for a in adq]
    ruta = "/api/escenarios/ec_la_segua/cambio"
    bueno = json.dumps({"antes": ids[0], "despues": ids[-1]})
    malo = json.dumps({"antes": ids[0], "despues": ids[0]})
    r_bueno, r_malo = _por_asgi(_demo, [("POST", ruta, bueno), ("POST", ruta, malo)])
    estado, _ = _igual(cliente_demo, r_bueno, "POST", ruta, bueno)
    assert estado == 200
    estado, cuerpo = _igual(cliente_demo, r_malo, "POST", ruta, malo)
    assert estado == 422 and "clave_texto" in cuerpo


def test_atender_sin_iniciar_falla():
    arranque._app = None
    with pytest.raises(RuntimeError, match="motor no iniciado"):
        asyncio.run(arranque.atender("GET", "/api/salud", None))


def test_iniciar_es_idempotente(_demo):
    async def correr():
        await arranque.iniciar(_demo)
        await arranque.iniciar(_demo)
        return await arranque.atender("GET", "/api/salud", None)
    arranque._app = None
    estado, _ = asyncio.run(correr())
    assert estado == 200


def test_parchear_sin_hilos_es_idempotente_y_no_rompe_rutas_sincronas(cliente_demo, _demo):
    arranque.parchear_sin_hilos()
    arranque.parchear_sin_hilos()
    (res,) = _por_asgi(_demo, [("GET", "/api/escenarios", None)])
    assert res[0] == 200
