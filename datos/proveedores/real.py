"""Proveedor de datos reales de NISAR: ESQUELETO. Todavía no hay acceso a los recursos oficiales.

Cada método lanza `DatosRealesNoDisponibles` con un mensaje legible. No contiene ningún detalle técnico
de NISAR (productos, rutas de archivos, bandas, URLs): todo eso está pendiente de confirmar con la
documentación oficial.

Lista de verificación , en orden:
- [ ] Pegar la lista oficial de recursos y los requisitos de entrega en `docs/challenge.md`.
- [ ] Leer la documentación oficial de los productos NISAR elegidos y completar cada punto «pendiente de
      confirmar» de `docs/contrato-datos.md` (proyección, polarizaciones, unidades, sin dato, tamaño, formato).
- [ ] Revisar contra esa documentación el código heredado no verificado: `modelo/nisar.py:1550-1820`
      (búsqueda ASF, `leer_gcov`, `leer_gunw`, nombres de colección, convención de signo) y `nisar.MISION`;
      corregir o descartar lo que no coincida. Poner `MISION_VERIFICADA = True` solo con fuente citada.
- [ ] Instalar el acceso que indique la documentación oficial (cuenta, credenciales en `.env` nunca versionado).
- [ ] Implementar este módulo cumpliendo el contrato; pasar `tests/datos/test_conformidad.py` añadiéndolo
      al fixture.
- [ ] Validar con una muestra pequeña (un producto, un área) y comparar visualmente con la vista previa
      oficial si existe.
- [ ] Comprobar rendimiento con volumen real: tiempo de `capa` y `cambio`, memoria del servidor y fluidez
      del mapa; si hace falta, generar vistas reducidas o teselas en el proveedor (el contrato no cambia).
- [ ] Migrar catálogo, explorador y lectura de HDF5 (paridad R) sobre el proveedor real.
- [ ] Retirar la banda de demostración solo donde `origen.tipo == "real"`; los escenarios sintéticos
      siguen marcados.
- [ ] Reescribir historias, hipótesis y hallazgos con los datos reales y sus fechas; actualizar
      `CREDITOS.md` con los productos usados y su cita oficial.
"""
from datetime import datetime

from datos.contrato import (CapaRaster, Capacidades, DatosRealesNoDisponibles, Escenario, Medicion,
                            ResultadoCambio, SerieTemporal)

MENSAJE = ("El proveedor de datos reales de NISAR aún no está implementado. "
           "Usa NISAR_PROVEEDOR=mixto (derivados del equipo en data/).")


def _no_disponible() -> DatosRealesNoDisponibles:
    return DatosRealesNoDisponibles(MENSAJE)


class ProveedorReal:
    """Cumple la forma de `ProveedorDatos`, pero todo salvo `nombre()` lanza `DatosRealesNoDisponibles`."""

    capacidades = Capacidades(simulacion=False, modelo_continuo=False, verdad_terreno=False)

    def nombre(self) -> str:
        return "real"

    def escenarios(self) -> list[Escenario]:
        raise _no_disponible()

    def escenario(self, id: str) -> Escenario:
        raise _no_disponible()

    def capa(self, escenario_id: str, adquisicion_id: str, variable: str,
             polarizacion: str | None) -> CapaRaster:
        raise _no_disponible()

    def cambio(self, escenario_id: str, antes_id: str, despues_id: str,
               polarizacion: str | None) -> ResultadoCambio:
        raise _no_disponible()

    def medir(self, escenario_id: str, antes_id: str, despues_id: str,
              cuadrante: tuple[int, int, int, int] | None = None,
              punto: tuple[int, int] | None = None) -> Medicion:
        raise _no_disponible()

    def simular(self, escenario_id: str, parametros: dict | None) -> Escenario:
        raise _no_disponible()

    def fotogramas(self, escenario_id: str, parametros: dict | None, inicio: datetime, fin: datetime,
                   paso_min: int) -> list[CapaRaster]:
        raise _no_disponible()

    def intervalo_por_defecto(self, escenario_id: str) -> tuple[str, str]:
        raise _no_disponible()

    def serie_seleccion(self, escenario_id: str, cuadrante: tuple[int, int, int, int] | None = None,
                        punto: tuple[int, int] | None = None) -> SerieTemporal | None:
        raise _no_disponible()
