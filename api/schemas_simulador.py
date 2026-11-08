"""Respuestas tipadas del simulador de eventos (el contrato OpenAPI que consume el frontend)."""
from pydantic import BaseModel

from api.schemas import CapaDto
from datos.contrato import Origen, TextoClave
from datos.simulador import PeticionMundo


class ControlDto(BaseModel):
    id: str
    etiqueta: str
    tipo: str                       # numero | seleccion | interruptor | texto
    minimo: float | None
    maximo: float | None
    paso: float | None
    defecto: float | str | bool
    opciones: list[str] | None
    ayuda: str
    unidad: str
    escala: float                   # la interfaz muestra valor × escala (p. ej. 0,15 → 15 %)


class HerramientaDto(BaseModel):
    id: str
    icono: str
    nombre: str
    controles: list[ControlDto]


class MundoPredefinidoDto(BaseModel):
    nombre: str
    lat: float
    lon: float
    extension_km: int
    herramienta: str
    descripcion: str


class VolcanDto(BaseModel):
    nombre: str
    lat: float
    lon: float


class CatalogoDto(BaseModel):
    herramientas: list[HerramientaDto]
    mundos: list[MundoPredefinidoDto]
    volcanes: list[VolcanDto]
    extensiones_km: list[int]


class MarcaDto(BaseModel):
    x: float
    y: float
    texto: str
    tipo: str                       # ciudad | volcan


class MundoDto(BaseModel):
    id: str
    n: int
    bbox: tuple[float, float, float, float]
    region: str
    fuente_dem: str
    pixel_m: float
    habitantes: float
    humedad_suelo_pct: float
    humedad_combustible_defecto: float
    temporada: str | None
    prec_anual_mm: float
    relieve_png_b64: str
    marcas: list[MarcaDto]
    origen: Origen


class CapaEventoDto(BaseModel):
    clave: str
    nombre: str
    estilo: str
    unidad: str
    etiquetas: list[str]
    clave_texto: str | None = None  # `api.sim.capa.<slug(nombre)>`; None si el nombre no tiene traducción


class MetricaEventoDto(BaseModel):
    etiqueta: str
    valor: str
    ayuda: str
    clave_texto: str | None = None  # clave base (`api.sim.metrica.<slug>`); el cliente añade `.etiqueta`
    valores_texto: dict[str, float | int | str] | None = None   # {"valor": número} si el valor es numérico


class TablaEventoDto(BaseModel):
    columnas: list[str]
    filas: list[list[float | str | None]]
    celdas_texto: list[list[TextoClave | None]] | None = None   # misma forma que `filas`; None donde no hay clave


class EsperaRadarDto(BaseModel):
    ciclo_dias: int
    minimo_dias: int
    maximo_dias: int
    medio_dias: float
    duracion_evento_h: float | None
    verificado: bool                # siempre false hasta confirmarlo con la documentación oficial


class EventoDto(BaseModel):
    herramienta: str
    titulo: str
    clave_texto: str | None = None  # `api.sim.titulo.<herramienta>[_variante]`
    valores_texto: dict[str, float | int | str] | None = None  # lat, lon y las cifras del título (mw, vei…)
    celda: tuple[int, int]
    lat: float
    lon: float
    tiempos: list[str]
    cuadros_png_b64: list[str]
    capas: list[CapaEventoDto]
    metricas: list[MetricaEventoDto]
    tabla: TablaEventoDto | None
    notas: list[str]
    notas_texto: list[TextoClave | None] | None = None   # misma longitud que `notas`
    modelos: list[str]
    paneles: list[CapaDto]
    titulos_paneles: list[str]
    comparable: bool
    polarizacion: str | None
    metricas_radar: list[MetricaEventoDto]
    espera_radar: EsperaRadarDto
    resumen: dict[str, float | None]
    origen: Origen


class PeticionCiudad(BaseModel):
    mundo: PeticionMundo
    celda: tuple[int, int]
    nombre: str
    habitantes: int
