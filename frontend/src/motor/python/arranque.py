"""Arranque de la API (FastAPI/ASGI) dentro de Pyodide, sin hilos ni servidor HTTP.

Funciona también en CPython (así se prueba con pytest). El worker del navegador llama a `iniciar()` una vez y
luego a `atender()` por cada petición; no hay lógica científica aquí: solo transporte.
"""
import asyncio
from typing import Awaitable, Callable
from urllib.parse import urlsplit

_app = None
_detener: Callable[[], Awaitable[None]] | None = None


async def _en_linea(func, *args, **kwargs):
    """Sustituye a `run_in_threadpool`: Pyodide no tiene hilos, así que la función corre en la propia tarea."""
    return func(*args, **kwargs)


def parchear_sin_hilos() -> None:
    """Reemplaza `run_in_threadpool` donde Starlette y FastAPI lo importaron. Idempotente."""
    import fastapi.dependencies.utils as dependencias
    import fastapi.routing as rutas
    import starlette.concurrency as concurrencia
    for modulo in (concurrencia, rutas, dependencias):
        if hasattr(modulo, "run_in_threadpool"):
            modulo.run_in_threadpool = _en_linea


async def arrancar_lifespan(app) -> Callable[[], Awaitable[None]]:
    """Envía `lifespan.startup`; devuelve `detener()`, que envía `lifespan.shutdown`."""
    entrada: asyncio.Queue = asyncio.Queue()
    salida: asyncio.Queue = asyncio.Queue()

    async def recibir():
        return await entrada.get()

    async def enviar(mensaje):
        await salida.put(mensaje)

    tarea = asyncio.ensure_future(app({"type": "lifespan", "asgi": {"version": "3.0"}, "state": {}},
                                      recibir, enviar))
    await entrada.put({"type": "lifespan.startup"})
    mensaje = await salida.get()
    if mensaje["type"] != "lifespan.startup.complete":
        tarea.cancel()
        raise RuntimeError(f"El arranque de la aplicación falló: {mensaje.get('message', mensaje['type'])}")

    async def detener() -> None:
        await entrada.put({"type": "lifespan.shutdown"})
        await salida.get()
        await tarea

    return detener


async def llamar_asgi(app, metodo: str, ruta: str, cuerpo: str | None) -> tuple[int, str]:
    """Ejecuta una petición contra la app ASGI. `ruta` puede llevar `?consulta`."""
    partes = urlsplit(ruta)
    datos = cuerpo.encode("utf-8") if cuerpo else b""
    scope = {
        "type": "http", "asgi": {"version": "3.0", "spec_version": "2.3"}, "http_version": "1.1",
        "method": metodo.upper(), "scheme": "http", "path": partes.path,
        "raw_path": partes.path.encode("utf-8"), "query_string": partes.query.encode("utf-8"),
        "root_path": "", "client": ("127.0.0.1", 0), "server": ("local", 80), "state": {},
        "headers": [(b"host", b"local"), (b"content-type", b"application/json"),
                    (b"content-length", str(len(datos)).encode())],
    }
    enviado = False
    estado = 500
    trozos: list[bytes] = []

    async def recibir():
        nonlocal enviado
        if not enviado:
            enviado = True
            return {"type": "http.request", "body": datos, "more_body": False}
        await asyncio.Event().wait()   # la petición ya acabó; no habrá desconexión

    async def enviar(mensaje):
        nonlocal estado
        if mensaje["type"] == "http.response.start":
            estado = mensaje["status"]
        elif mensaje["type"] == "http.response.body":
            trozos.append(mensaje.get("body", b""))

    await app(scope, recibir, enviar)
    return estado, b"".join(trozos).decode("utf-8")


async def iniciar(proveedor=None) -> None:
    """Crea la app de la API y arranca su lifespan. Idempotente."""
    global _app, _detener
    if _app is not None:
        return
    parchear_sin_hilos()
    from api.app import create_app
    app = create_app(proveedor)
    _detener = await arrancar_lifespan(app)
    _app = app


async def atender(metodo: str, ruta: str, cuerpo: str | None) -> tuple[int, str]:
    if _app is None:
        raise RuntimeError("motor no iniciado")
    return await llamar_asgi(_app, metodo, ruta, cuerpo)
