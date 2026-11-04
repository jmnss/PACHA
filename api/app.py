"""Aplicación FastAPI: proveedor en `app.state`, errores legibles en español y GZip."""
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from api import VERSION
from api.deps import obtener
from api.rutas import capas, escenarios, simulacion
from api.schemas import ErrorDto, Salud
from datos.contrato import CapacidadNoDisponible, DatosRealesNoDisponibles, ProveedorDatos
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

    @app.exception_handler(KeyError)
    async def _no_existe(_: Request, exc: KeyError) -> JSONResponse:
        clave = exc.args[0] if exc.args else ""
        return _error(404, f"No existe el recurso pedido: {clave}")

    @app.exception_handler(ValueError)
    async def _valor(_: Request, exc: ValueError) -> JSONResponse:
        return _error(422, str(exc))

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


def create_app(proveedor: ProveedorDatos | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.proveedor = proveedor if proveedor is not None else obtener_proveedor()
        yield

    app = FastAPI(title="NISAR · Ecuador", version=VERSION, lifespan=lifespan)
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
    app.include_router(rutas)
    return app
