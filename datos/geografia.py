"""Geografía mínima compartida por proveedores y API."""

# Caja APROXIMADA (WGS84) que cubre Ecuador continental y Galápagos: oeste, sur, este, norte.
# Es un rectángulo, no la frontera: incluye franjas de países vecinos y de mar. Sirve para descartar
# puntos claramente ajenos al país, no para decidir a qué provincia pertenece un punto.
CAJA_ECUADOR = (-92.2, -5.1, -75.1, 1.8)

MENSAJE_FUERA_DE_ECUADOR = ("El punto elegido queda fuera de Ecuador: elige una latitud y una "
                            "longitud dentro del país.")


def en_ecuador(lat: float, lon: float) -> bool:
    """True si (lat, lon) cae dentro de `CAJA_ECUADOR` (aproximada)."""
    oeste, sur, este, norte = CAJA_ECUADOR
    return sur <= lat <= norte and oeste <= lon <= este
