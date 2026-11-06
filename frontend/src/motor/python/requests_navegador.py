"""`requests` mínimo para el motor del navegador (Pyodide no trae `requests`).

Solo lo que usa `modelo/desastres.py`: `get(url, timeout)` con `content`, `status_code` y `raise_for_status()`.
Las teselas de terreno se piden primero a las copias propias del sitio (`motor/terreno/`); si no están, a la URL
original (el servidor de teselas de AWS admite CORS). Se registra en `sys.modules['requests']` solo en el worker.
"""
import re
import sys

MOTOR_URL = ""
_PNG = b"\x89PNG\r\n\x1a\n"
_TESELA = re.compile(r"/terrarium/(\d+)/(\d+)/(\d+)\.png$")


class HTTPError(Exception):
    pass


class Respuesta:
    def __init__(self, content: bytes, status_code: int, url: str):
        self.content = content
        self.status_code = status_code
        self.url = url

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise HTTPError(f"{self.status_code} para {self.url}")


def ruta_local(url: str, motor_url: str) -> str | None:
    """Copia propia de una tesela Terrarium (`motor/terreno/<z>_<x>_<y>.png`) o `None` si la URL no es de teselas."""
    m = _TESELA.search(url)
    return f"{motor_url}terreno/{m[1]}_{m[2]}_{m[3]}.png" if m else None


def _pedir(url: str) -> Respuesta:
    """GET síncrono con XHR (permitido en workers)."""
    from js import XMLHttpRequest

    x = XMLHttpRequest.new()
    x.open("GET", url, False)
    x.responseType = "arraybuffer"
    x.send()
    contenido = bytes(x.response.to_py()) if x.response is not None else b""
    return Respuesta(contenido, int(x.status), url)


def get(url: str, timeout: float | None = None) -> Respuesta:
    local = ruta_local(url, MOTOR_URL)
    if local is not None:
        try:
            r = _pedir(local)
            if r.status_code == 200 and r.content.startswith(_PNG):   # un 200 con HTML (rutas del cliente) no vale
                return r
        except Exception:
            pass
    return _pedir(url)


def registrar(motor_url: str) -> None:
    global MOTOR_URL
    MOTOR_URL = motor_url
    sys.modules["requests"] = sys.modules[__name__]
