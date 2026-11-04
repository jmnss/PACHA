import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from datos.proveedores.demo import ProveedorDemostracion
from datos.proveedores.real import ProveedorReal


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
