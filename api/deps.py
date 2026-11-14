"""Dependencias compartidas de las rutas."""
from fastapi import Request

from datos.contrato import ProveedorDatos


def obtener(request: Request) -> ProveedorDatos:
    """Dependencia reutilizable: el proveedor activo de la aplicación."""
    return request.app.state.proveedor
