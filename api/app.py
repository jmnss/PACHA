"""Aplicación FastAPI: proveedor en `app.state`, errores legibles en español y GZip."""
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from api import VERSION
from api.deps import obtener
from api.rutas import capas, contexto, escenarios, impacto, laboratorio, simulacion, simulador
from api.schemas import ErrorDto, Salud
from datos.contrato import (CapacidadNoDisponible, DatosRealesNoDisponibles, EntradaNoValida, NoEncontrado,
                            ProveedorDatos)
from datos.seleccion import obtener_proveedor


def _error(estado: int, mensaje: str) -> JSONResponse:
    return JSONResponse({"mensaje": mensaje}, status_code=estado)


def _registrar_errores(app: FastAPI) -> None:
    @app.exception_handler(DatosRealesNoDisponibles)
    async def _sin_datos(_: Request, exc: DatosRealesNoDisponibles) -> JSONResponse:
        return _error(503, str(exc))

    @app.exception_handler(CapacidadNoDisponible)
    async def _sin_capacidad(_: Request, exc: CapacidadNoDisponible) -> JSONResponse:
        return _error(409, str(exc))

    @app.exception_handler(NoEncontrado)
    async def _no_existe(_: Request, exc: NoEncontrado) -> JSONResponse:
        clave = exc.args[0] if exc.args else ""
        return _error(404, f"No existe el recurso pedido: {clave}")

    @app.exception_handler(EntradaNoValida)
    async def _valor(_: Request, exc: EntradaNoValida) -> JSONResponse:
        return _error(422, str(exc))

    # Errores inesperados (un KeyError o ValueError que no son de la petición): 500 con mensaje genérico,
    # sin filtrar detalles internos.
    @app.exception_handler(KeyError)
    @app.exception_handler(ValueError)
    async def _inesperado(_: Request, exc: Exception) -> JSONResponse:
        return _error(500, "Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.")

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        mensajes = {404: "No existe el recurso pedido.", 405: "Método no permitido."}
        return _error(exc.status_code, mensajes.get(exc.status_code, str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def _entrada(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _error(422, "Entrada no válida. " + " ".join(_mensaje_validacion(e) for e in exc.errors()))


def _mensaje_validacion(e: dict) -> str:
    campo = ".".join(str(p) for p in e["loc"] if p not in ("query", "body"))
    tipo = e["type"]
    if tipo == "missing":
        return f"Falta el campo {campo}."
    if tipo == "timezone_aware":
        return "Indica la fecha con zona horaria, por ejemplo 2026-05-01T00:00:00Z."
    if tipo == "value_error":
        return str(e["msg"]).removeprefix("Value error, ")
    return f"El valor de {campo} no es válido." if campo else "El valor no es válido."


def _origenes(proveedor: ProveedorDatos) -> tuple[str, bool]:
    """(origen_tipo informativo, hay_sinteticos). La banda de demostración usa el segundo."""
    tipos = {e.origen.tipo for e in proveedor.escenarios()}
    hay_sinteticos = "sintetico" in tipos
    if not tipos:
        return "desconocido", False
    if len(tipos) > 1:
        return "mixto", hay_sinteticos
    return tipos.pop(), hay_sinteticos


def _id_operacion(ruta: APIRoute) -> str:
    """operationId corto y legible: el nombre de la función de la ruta."""
    return ruta.name


def create_app(proveedor: ProveedorDatos | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.proveedor = proveedor if proveedor is not None else obtener_proveedor()
        yield

    app = FastAPI(title="NISAR · Ecuador", version=VERSION, lifespan=lifespan,
                  generate_unique_id_function=_id_operacion)
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    _registrar_errores(app)

    rutas = APIRouter(prefix="/api")

    @rutas.get("/salud", response_model=Salud, responses={503: {"model": ErrorDto}})
    def salud(prov: ProveedorDatos = Depends(obtener)) -> Salud:
        tipo, hay = _origenes(prov)
        return Salud(estado="ok", version=VERSION, proveedor=prov.nombre(),
                     origen_tipo=tipo, hay_sinteticos=hay)

    rutas.include_router(escenarios.router)
    rutas.include_router(capas.router)
    rutas.include_router(simulacion.router)
    rutas.include_router(contexto.router)
    rutas.include_router(simulador.router)
    rutas.include_router(laboratorio.router)
    rutas.include_router(impacto.router)
    app.include_router(rutas)
    return app
