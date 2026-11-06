"""Fixtures compartidas por las pruebas de la API y del motor del navegador."""
import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from datos.proveedores.demo import ProveedorDemostracion


@pytest.fixture(scope="session")
def _demo():
    return ProveedorDemostracion()


@pytest.fixture
def cliente_demo(_demo):
    with TestClient(create_app(_demo)) as c:
        yield c
