"""`python servidor.py`: API y frontend compilado (`frontend/dist`) en http://127.0.0.1:8000."""
import os
from pathlib import Path

import uvicorn
from fastapi import HTTPException
from fastapi.responses import FileResponse

from api.app import create_app

# NISAR_DIST permite servir otra carpeta compilada.
DIST = Path(os.environ.get("NISAR_DIST") or Path(__file__).parent / "frontend" / "dist")


def crear_servidor(dist: Path = DIST):
    app = create_app()
    if dist.is_dir() and (dist / "index.html").is_file():
        raiz = dist.resolve()

        @app.get("/{ruta:path}", include_in_schema=False)
        def cliente(ruta: str):
            if ruta == "api" or ruta.startswith("api/"):
                raise HTTPException(404, "No existe esa ruta de la API.")
            candidato = (raiz / ruta).resolve()
            if candidato.is_file() and candidato.is_relative_to(raiz):
                return FileResponse(candidato)
            if Path(ruta).suffix:  # un archivo con extensión que no existe no es una ruta del cliente
                raise HTTPException(404, "No existe el archivo.")
            return FileResponse(raiz / "index.html")  # rutas del cliente (React Router)
    return app


app = crear_servidor()

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
