"""Selección del proveedor de datos según `NISAR_PROVEEDOR` (`demo` por defecto, o `real`)."""
import os
import threading

from datos.contrato import ProveedorDatos

def _demo() -> ProveedorDatos:
    from datos.proveedores.demo import ProveedorDemostracion
    return ProveedorDemostracion()


def _real() -> ProveedorDatos:
    from datos.proveedores.real import ProveedorReal
    return ProveedorReal()


_FABRICAS = {"demo": _demo, "real": _real}
_instancias: dict[str, ProveedorDatos] = {}
_cerrojo = threading.Lock()


def obtener_proveedor() -> ProveedorDatos:
    """Proveedor activo; una sola instancia por valor de la variable (el demo conserva su caché)."""
    valor = (os.environ.get("NISAR_PROVEEDOR") or "demo").strip().lower()
    if valor not in _FABRICAS:
        raise ValueError(f"NISAR_PROVEEDOR={valor!r} no es válido; usa «demo» o «real».")
    with _cerrojo:
        if valor not in _instancias:
            _instancias[valor] = _FABRICAS[valor]()
        return _instancias[valor]
