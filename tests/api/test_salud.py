from fastapi.testclient import TestClient

from api.app import create_app


def test_salud_informa_proveedor_y_origen(cliente_demo):
    r = cliente_demo.get("/api/salud")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "ok"
    assert cuerpo["origen_tipo"] == "sintetico"
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
    from datos.contrato import CapacidadNoDisponible
    app = create_app(_demo)

    @app.get("/api/_k")
    def _k():
        raise KeyError("x")

    @app.get("/api/_c")
    def _c():
        raise CapacidadNoDisponible("no simula")

    @app.get("/api/_v")
    def _v():
        raise ValueError("bbox inválido")

    with TestClient(app) as c:
        assert c.get("/api/_k").status_code == 404
        assert c.get("/api/_c").json() == {"mensaje": "no simula"}
        assert c.get("/api/_v").status_code == 422


def test_servidor_sirve_cliente_y_api_desconocida_404(tmp_path):
    from servidor import crear_servidor
    (tmp_path / "index.html").write_text("<html>cliente</html>")
    (tmp_path / "a.js").write_text("1")
    with TestClient(crear_servidor(tmp_path)) as c:
        assert c.get("/observatorio").text == "<html>cliente</html>"
        assert c.get("/a.js").text == "1"
        assert c.get("/..%2f..%2fetc/passwd").text == "<html>cliente</html>"
        r = c.get("/api/nada")
        assert r.status_code == 404 and r.headers["content-type"] == "application/json"
        assert c.get("/api/salud").status_code == 200
