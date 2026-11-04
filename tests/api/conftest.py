import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.real import ProveedorReal
from tests.datos.proveedor_ficticio import ProveedorFicticio


@pytest.fixture(scope="session")
def _demo():
    return ProveedorDemostracion()


@pytest.fixture
def cliente_demo(_demo):
    with TestClient(create_app(_demo)) as c:
        yield c


@pytest.fixture
def cliente_real():
    with TestClient(create_app(ProveedorReal())) as c:
        yield c


@pytest.fixture
def cliente_ficticio():
    with TestClient(create_app(ProveedorFicticio())) as c:
        yield c


@pytest.fixture(params=["demo", "ficticio"])
def cliente(request, cliente_demo, cliente_ficticio):
    return cliente_demo if request.param == "demo" else cliente_ficticio
