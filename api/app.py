"""Aplicación FastAPI: proveedor en `app.state`, errores legibles en español y GZip."""
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

from api import VERSION
from api.schemas import ErrorDto, Salud
from datos.contrato import CapacidadNoDisponible, DatosRealesNoDisponibles, ProveedorDatos
from datos.seleccion import obtener_proveedor


def obtener(request: Request) -> ProveedorDatos:
    """Dependencia reutilizable: el proveedor activo de la aplicación."""
    return request.app.state.proveedor


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

    @app.exception_handler(RequestValidationError)
    async def _entrada(_: Request, exc: RequestValidationError) -> JSONResponse:
        partes = [f"{'.'.join(str(p) for p in e['loc'] if p != 'query')}: {e['msg']}"
                  for e in exc.errors()]
        return _error(422, "Entrada no válida. " + "; ".join(partes))


def _tipo_de_origen(proveedor: ProveedorDatos) -> str:
    tipos = {e.origen.tipo for e in proveedor.escenarios()}
    if tipos == {"sintetico"}:
        return "sintetico"
    if tipos == {"real"}:
        return "real"
    return "mixto"  # con tipos mezclados (o sin escenarios) se avisa como mixto: la banda se muestra


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
        return Salud(estado="ok", version=VERSION, proveedor=prov.nombre(),
                     origen_tipo=_tipo_de_origen(prov))

    app.include_router(rutas)
    return app
