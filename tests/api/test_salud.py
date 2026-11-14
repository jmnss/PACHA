import pytest
from fastapi.testclient import TestClient

from api.app import create_app


def test_salud_informa_proveedor_y_origen(cliente_demo):
    r = cliente_demo.get("/api/salud")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "ok"
    assert cuerpo["origen_tipo"] == "sintetico"
    assert cuerpo["hay_sinteticos"] is True
    assert cuerpo["proveedor"] and cuerpo["version"]


def test_proveedor_real_da_503_legible(cliente_real):
    r = cliente_real.get("/api/salud")
    assert r.status_code == 503
    assert "aún no está implementado" in r.json()["mensaje"]


def test_gzip(_demo):
    app = create_app(_demo)

    @app.get("/api/_grande")
    def _grande():
        return {"texto": "a" * 5000}

    with TestClient(app) as c:
        r = c.get("/api/_grande", headers={"Accept-Encoding": "gzip"})
        assert r.headers["content-encoding"] == "gzip"
        assert len(r.json()["texto"]) == 5000


def test_sin_gzip_en_respuestas_pequenas(cliente_demo):
    r = cliente_demo.get("/api/salud", headers={"Accept-Encoding": "gzip"})
    assert "content-encoding" not in r.headers


def test_errores_de_contrato_son_json_en_espanol(_demo):
    from datos.contrato import CapacidadNoDisponible, EntradaNoValida, NoEncontrado
    app = create_app(_demo)

    @app.get("/api/_k")
    def _k():
        raise NoEncontrado("x")

    @app.get("/api/_c")
    def _c():
        raise CapacidadNoDisponible("no simula")

    @app.get("/api/_v")
    def _v():
        raise EntradaNoValida("bbox inválido")

    @app.get("/api/_ik")
    def _ik():
        raise KeyError("secreto-interno")

    @app.get("/api/_iv")
    def _iv():
        raise ValueError("detalle-interno")

    with TestClient(app) as c:
        assert c.get("/api/_k").status_code == 404
        assert c.get("/api/_c").json() == {"mensaje": "no simula"}
        assert c.get("/api/_v").status_code == 422
        for ruta in ("/api/_ik", "/api/_iv"):
            r = c.get(ruta)
            assert r.status_code == 500 and "inesperado" in r.json()["mensaje"]
            assert "interno" not in r.json()["mensaje"]


class _Falso:
    def __init__(self, escenarios):
        self._e = escenarios

    def nombre(self):
        return "falso"

    def escenarios(self):
        return self._e


def _con_tipo(base, tipo):
    return base.model_copy(update={"origen": base.origen.model_copy(update={"tipo": tipo})})


@pytest.mark.parametrize("tipos,esperado", [
    (["sintetico"], ("sintetico", True)),
    (["real"], ("real", False)),
    (["real", "sintetico"], ("mixto", True)),
    ([], ("desconocido", False)),
])
def test_hay_sinteticos_segun_origenes(_demo, tipos, esperado):
    base = _demo.escenarios()[0]
    prov = _Falso([_con_tipo(base, t) for t in tipos])
    with TestClient(create_app(prov)) as c:
        cuerpo = c.get("/api/salud").json()
    assert (cuerpo["origen_tipo"], cuerpo["hay_sinteticos"]) == esperado


def test_404_y_405_son_json_en_espanol(cliente_demo):
    r = cliente_demo.get("/api/no-existe")
    assert r.status_code == 404 and r.json() == {"mensaje": "No existe el recurso pedido."}
    r = cliente_demo.post("/api/salud")
    assert r.status_code == 405 and r.json() == {"mensaje": "Método no permitido."}


def test_escenario_inexistente_404_con_mensaje_y_validacion_422(_demo):
    app = create_app(_demo)

    @app.get("/api/_e/{id}")
    def _e(id: str, n: int = 1):
        return _demo.escenario(id)

    with TestClient(app) as c:
        r = c.get("/api/_e/no-existe")
        assert r.status_code == 404 and "no-existe" in r.json()["mensaje"]
        r = c.get("/api/_e/x?n=abc")
        assert r.status_code == 422
        assert r.json()["mensaje"].startswith("Entrada no válida.") and "El valor de n no es válido" in r.json()["mensaje"]


def test_servidor_sirve_cliente_y_api_desconocida_404(tmp_path):
    from servidor import crear_servidor
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html>cliente</html>")
    (dist / "a.js").write_text("1")
    (tmp_path / "secreto.txt").write_text("TOP-SECRETO")
    with TestClient(crear_servidor(dist)) as c:
        assert c.get("/observatorio").text == "<html>cliente</html>"
        assert c.get("/a.js").text == "1"
        for ruta in ["/../secreto.txt", "/%2e%2e/secreto.txt", "/..%2fsecreto.txt",
                     "/%2e%2e%2fsecreto.txt", "/a/../../secreto.txt"]:
            assert "TOP-SECRETO" not in c.get(ruta).text
        assert c.get("/falta.js").status_code == 404
        r = c.get("/api/nada")
        assert r.status_code == 404 and r.headers["content-type"] == "application/json"
        assert c.get("/api/salud").status_code == 200
