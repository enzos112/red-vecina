"""Datos de demostración: simula 4 semanas día por día con los servicios reales.

Cada boleta, código y cupo pasa por las mismas reglas que usará la aplicación, así que la
base resultante respeta todos los límites. Todo queda marcado con es_demo.
"""

import heapq
import itertools
import json
import math
import random
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.formato import pesos
from app.core.tiempo import ZONA_LOCAL, a_local, dia_local, inicio_dia_utc
from app.demo.imagenes import boleta_jpeg
from app.modulos.boletas import servicio as boletas
from app.modulos.boletas.esquemas import OrigenBoleta
from app.modulos.canjes import servicio as canjes
from app.modulos.canjes.esquemas import EstadoCanje
from app.modulos.comercios import servicio as comercios
from app.modulos.comercios.esquemas import TipoBeneficio
from app.modulos.comercios.modelos import Comercio
from app.modulos.comercios.reglas import BeneficioPropuesto
from app.modulos.cuentas import servicio as cuentas
from app.modulos.cuentas.esquemas import Rol
from app.modulos.equilibrio import servicio as equilibrio
from app.modulos.mensajes import servicio as mensajes
from app.modulos.parametros import servicio as parametros
from app.modulos.parametros.reglas import Parametros, nivel
from app.modulos.puntos import servicio as puntos
from app.modulos.vecinos import servicio as vecinos
from app.servicios.archivos.servicio import AlmacenBaseDatos
from app.tareas import servicio as tareas

DATOS: dict[str, Any] = json.loads(
    Path(__file__).with_name("datos.json").read_text(encoding="utf-8")
)
APERTURA, CIERRE = 9, 21  # horario de los locales en la simulación


@dataclass
class Contrasenas:
    admin: str
    operador: str
    comercio: str


@dataclass
class VecinoDemo:
    id: int
    nombre: str
    inscrito_en: datetime
    origen: str
    peso: float


class Simulacion:
    def __init__(self, sesion: Session, ahora: datetime, semilla: int) -> None:
        self.s = sesion
        self.ahora = ahora
        self.rng = random.Random(semilla)
        self.cola: list[tuple[datetime, int, str, dict[str, Any]]] = []
        self.orden = itertools.count()
        self.stats: Counter[str] = Counter()
        self.inicio = inicio_dia_utc(dia_local(ahora) - timedelta(days=DATOS["dias_historia"]))
        self.folios: dict[int, int] = {}

    # --- utilidades ---

    def programar(self, momento: datetime, tipo: str, **datos: Any) -> None:
        if momento < self.ahora:
            heapq.heappush(self.cola, (momento, next(self.orden), tipo, datos))

    def en_horario(self, momento: datetime) -> datetime:
        """Lleva un momento al horario de atención (o al día siguiente a la apertura)."""
        local = a_local(momento)
        if local.hour < APERTURA:
            local = local.replace(hour=APERTURA, minute=self.rng.randrange(60))
        elif local.hour >= CIERRE:
            local = datetime.combine(
                local.date() + timedelta(days=1),
                time(APERTURA, self.rng.randrange(60)),
                tzinfo=ZONA_LOCAL,
            )
        return local.astimezone(momento.tzinfo)

    def momento_al_azar(self, desde: datetime, hasta: datetime) -> datetime | None:
        if hasta <= desde:
            return None
        dia = dia_local(desde + (hasta - desde) * self.rng.random())
        hora = datetime.combine(
            dia,
            time(self.rng.randrange(APERTURA, CIERRE), self.rng.randrange(60)),
            tzinfo=ZONA_LOCAL,
        ).astimezone(desde.tzinfo)
        return hora if desde <= hora < hasta else None

    def horas(self, minimo: float, maximo: float) -> timedelta:
        return timedelta(hours=self.rng.uniform(minimo, maximo))

    def folio(self, comercio_id: int) -> str:
        self.folios[comercio_id] = (
            self.folios.get(comercio_id, self.rng.randrange(10_000, 90_000)) + 1
        )
        return str(self.folios[comercio_id])

    # --- construcción ---

    def base(self, claves: Contrasenas) -> Parametros:
        parametros.inicializar(self.s)
        mensajes.inicializar(self.s)
        p = parametros.cargar(self.s)
        dominio = DATOS["dominio_correos"]
        # Si el comando base ya creó un usuario con ese correo, se reutiliza.
        self.admin = cuentas.por_email(self.s, f"admin@{dominio}") or cuentas.crear_usuario(
            self.s, f"admin@{dominio}", "Administración", claves.admin, Rol.ADMIN, es_demo=True
        )
        self.operador = cuentas.por_email(self.s, f"operador@{dominio}") or cuentas.crear_usuario(
            self.s, f"operador@{dominio}", "Operación", claves.operador, Rol.OPERADOR, es_demo=True
        )
        self.comercios: dict[str, Comercio] = {}
        self.cajeros: dict[int, int] = {}
        self.datos_comercio: dict[int, dict[str, Any]] = {}
        for c in DATOS["comercios"]:
            comercio = comercios.crear_comercio(
                self.s, c["nombre"], c["rubro"], c["rut"], c["direccion"], self.inicio, es_demo=True
            )
            self.comercios[c["nombre"]] = comercio
            self.datos_comercio[comercio.id] = c
            usuario = cuentas.crear_usuario(
                self.s,
                f"{comercio.slug}@{dominio}",
                f"Caja {comercio.nombre}",
                claves.comercio,
                Rol.COMERCIO,
                comercio_id=comercio.id,
                es_demo=True,
            )
            self.cajeros[comercio.id] = usuario.id
            propuestos = []
            for b in c["beneficios"]:
                n = nivel(p, b["nivel"])
                minima = n.compra_minima_tope
                if "compra_minima_fraccion" in b:
                    minima = round(minima * b["compra_minima_fraccion"], -2)
                propuestos.append(
                    BeneficioPropuesto(
                        nivel=b["nivel"],
                        tipo=TipoBeneficio(b["tipo"]),
                        texto=b["texto"].format(valor=pesos(n.valor_pesos)),
                        restriccion=b.get("restriccion"),
                        dias_permitidos=b.get("dias_permitidos"),
                        compra_minima=int(minima),
                    )
                )
            comercios.publicar_beneficios(
                self.s, comercio.id, propuestos, p, self.inicio, self.admin.id, self.inicio
            )
        return p

    def inscribir_vecinos(self) -> None:
        self.vecinos: list[VecinoDemo] = []
        for i, v in enumerate(DATOS["vecinos_con_nombre"]):
            inscrito = self.inicio + self.horas(1, 48)
            vecino = vecinos.inscribir(
                self.s,
                v["nombre"],
                f"+5690001{i:04d}",
                self.comercios[v["origen"]].id,
                inscrito,
                es_demo=True,
            )
            if "trabaja_en" in v:
                vecinos.registrar_empleo(self.s, vecino.id, self.comercios[v["trabaja_en"]].id)
            self.vecinos.append(VecinoDemo(vecino.id, v["nombre"], inscrito, v["origen"], 4.0))
        self.con_nombre = list(self.vecinos)
        origenes = list(self.comercios)
        pesos_origen = [c["atraccion_origen"] for c in DATOS["comercios"]]
        dias = DATOS["dias_historia"]
        for i in range(DATOS["vecinos_sinteticos"]):
            nombre = f"{self.rng.choice(DATOS['nombres'])} {self.rng.choice(DATOS['apellidos'])}"
            origen = self.rng.choices(origenes, pesos_origen)[0]
            # La mayoría se inscribe en las primeras semanas del piloto.
            inscrito = self.inicio + timedelta(days=dias * 0.7 * self.rng.random() ** 1.5)
            vecino = vecinos.inscribir(
                self.s,
                nombre,
                f"+5690000{i:04d}",
                self.comercios[origen].id,
                inscrito,
                es_demo=True,
            )
            self.vecinos.append(VecinoDemo(vecino.id, nombre, inscrito, origen, 1.0))

    def planificar_compras(self) -> None:
        limite = self.ahora - timedelta(hours=1)
        for nombre, comercio in self.comercios.items():
            datos = self.datos_comercio[comercio.id]
            pesos_vecinos = [
                v.peso * (datos["atraccion_origen"] + 1 if v.origen == nombre else 1)
                for v in self.vecinos
            ]
            total = 0
            while total < datos["ventas_objetivo"]:
                v = self.rng.choices(self.vecinos, pesos_vecinos)[0]
                compra = self.momento_al_azar(max(v.inscrito_en, self.inicio), limite)
                if compra is None:
                    continue
                monto = max(
                    1_200,
                    round(self.rng.lognormvariate(math.log(datos["ticket_promedio"]), 0.45), -1),
                )
                excluido = 0
                if datos["rubro"] == "Minimarket" and self.rng.random() < 0.04:
                    excluido = min(4_500, monto - 1_000)  # cigarros en la misma boleta (A15)
                recibida = compra + self.horas(0.3, 18)
                aprobacion = recibida + self.horas(0.5, 10)
                if aprobacion >= self.ahora:
                    continue
                self.programar(
                    aprobacion,
                    "boleta",
                    vecino=v.id,
                    comercio=comercio.id,
                    compra=compra,
                    recibida=recibida,
                    monto=monto,
                    excluido=excluido,
                )
                total += monto

    def planificar_canjes(self) -> None:
        for v in self.vecinos:
            intentos = (
                self.rng.randint(5, 9)
                if v.peso > 1
                else self.rng.choices([0, 1, 2, 3], [3, 4, 3, 2])[0]
            )
            for _ in range(intentos):
                momento = self.momento_al_azar(v.inscrito_en + timedelta(days=3), self.ahora)
                if momento:
                    self.programar(momento, "pedir", vecino=v.id)

    def planificar_tareas(self) -> None:
        dia = dia_local(self.inicio)
        while dia <= dia_local(self.ahora):
            self.programar(inicio_dia_utc(dia) + timedelta(minutes=5), "tareas")
            dia += timedelta(days=1)

    # --- ejecución ---

    def correr(self, p: Parametros) -> None:
        while self.cola:
            momento, _, tipo, datos = heapq.heappop(self.cola)
            getattr(self, f"_{tipo}")(momento, p, **datos)
        tareas.ejecutar(self.s, self.ahora)

    def _tareas(self, momento: datetime, p: Parametros) -> None:
        tareas.ejecutar(self.s, momento)

    def _boleta(self, momento, p, vecino, comercio, compra, recibida, monto, excluido) -> None:
        boleta = boletas.crear(self.s, vecino, OrigenBoleta.DEMO, recibida, es_demo=True)
        try:
            boletas.aprobar(
                self.s,
                boleta.id,
                comercio_id=comercio,
                folio=self.folio(comercio),
                fecha_compra=compra,
                monto_total=monto,
                monto_excluido=excluido,
                p=p,
                ahora=momento,
                revisor_id=self.operador.id,
            )
            self.stats["boletas_aprobadas"] += 1
        except ValueError as error:
            boletas.rechazar(self.s, boleta.id, str(error), momento, self.operador.id)
            self.stats["boletas_rechazadas"] += 1

    def _pedir(self, momento: datetime, p: Parametros, vecino: int) -> None:
        elegibilidad, opciones = canjes.opciones(self.s, vecino, momento, p)
        if not elegibilidad.puede or opciones is None or not opciones.destacadas:
            self.stats["pedidos_sin_opcion"] += 1
            return
        destacadas = opciones.destacadas
        opcion = destacadas[0] if self.rng.random() < 0.6 else self.rng.choice(destacadas)
        canje = canjes.emitir(self.s, vecino, opcion.beneficio_id, momento, p, self.rng.randrange)
        self.stats["codigos_emitidos"] += 1
        if self.rng.random() < 0.82:
            self.programar(self.en_horario(momento + self.horas(2, 40)), "usar", canje=canje.id)

    def _usar(self, momento: datetime, p: Parametros, canje: int) -> None:
        c = canjes.obtener(self.s, canje)
        if c is None or c.estado != EstadoCanje.ACTIVO or c.vence_en <= momento:
            return
        ticket = round(c.compra_minima * self.rng.uniform(1.0, 1.7), -1)
        validacion = canjes.usar(
            self.s, c.codigo, c.comercio_id, momento, p, ticket, self.cajeros[c.comercio_id]
        )
        if not validacion.se_puede_usar:  # p. ej. hoy no es un día permitido: vuelve mañana
            self.programar(self.en_horario(momento + timedelta(days=1)), "usar", canje=canje)
            return
        self.stats["codigos_usados"] += 1
        # B15: la compra suma puntos sobre lo pagado (A7).
        recibida = momento + self.horas(0.2, 6)
        self.programar(
            recibida + self.horas(0.5, 8),
            "boleta",
            vecino=c.vecino_id,
            comercio=c.comercio_id,
            compra=momento,
            recibida=recibida,
            monto=ticket - c.valor_pesos,
            excluido=0,
        )

    # --- boletas pendientes con imagen ---

    def boletas_pendientes(self) -> None:
        almacen = AlmacenBaseDatos(self.s)
        casos = ["normal"] * 6 + ["cigarros", "folio_repetido", "fuera_de_plazo", "monto_alto"]
        for i, caso in enumerate(casos):
            v = self.con_nombre[i % len(self.con_nombre)]
            nombre = {
                "cigarros": "Minimarket Don Luis",
                "folio_repetido": "Panadería La Espiga",
                "monto_alto": "Carnicería El Novillo",
            }.get(caso) or self.rng.choice(list(self.comercios))
            comercio = self.comercios[nombre]
            datos = self.datos_comercio[comercio.id]
            recibida = self.ahora - self.horas(0.5, 20)
            compra = recibida - (
                timedelta(days=3) if caso == "fuera_de_plazo" else self.horas(0.3, 6)
            )
            productos = DATOS["productos"][datos["rubro"]]
            objetivo = 62_000 if caso == "monto_alto" else datos["ticket_promedio"]
            lineas: list[tuple[str, int]] = []
            while sum(pr for _, pr in lineas) < objetivo * 0.9:
                lineas.append(tuple(self.rng.choice(productos)))  # type: ignore[arg-type]
            if caso == "cigarros":
                lineas.append(("Cigarrillos 20 un.", 4_500))
            folio = self.folio(comercio.id)
            if caso == "folio_repetido":
                folio = str(self.folios[comercio.id] - 3)  # ya registrado por otra persona
            imagen = boleta_jpeg(
                comercio.nombre, comercio.rut, comercio.direccion, folio, compra, lineas
            )
            archivo = almacen.guardar(imagen, "image/jpeg", f"boleta-demo-{i + 1}.jpg")
            boletas.crear(self.s, v.id, OrigenBoleta.VECINO, recibida, archivo, es_demo=True)
            self.stats["boletas_pendientes"] += 1


def generar(
    sesion: Session, claves: Contrasenas, ahora: datetime, semilla: int = 7
) -> dict[str, Any]:
    sim = Simulacion(sesion, ahora, semilla)
    p = sim.base(claves)
    sim.inscribir_vecinos()
    sim.planificar_tareas()
    sim.planificar_compras()
    sim.planificar_canjes()
    sim.correr(p)
    sim.boletas_pendientes()
    return resumen(sesion, sim, p)


def resumen(sesion: Session, sim: Simulacion, p: Parametros) -> dict[str, Any]:
    semana = equilibrio.semana_actual(sim.ahora, p)
    filas = []
    for comercio in sim.comercios.values():
        cupo = equilibrio.obtener(sesion, comercio.id, semana)
        filas.append(
            {
                "comercio": comercio.nombre,
                "ventas_ventana": boletas.ventas(
                    sesion, comercio.id, sim.ahora - timedelta(days=p.P15.dias_ventas), sim.ahora
                ),
                "cupo_base": cupo.base if cupo else None,
                "arrastre": cupo.arrastre if cupo else None,
                "libre": cupo.libre if cupo else None,
                "en_piso": cupo.en_piso if cupo else None,
            }
        )
    saldos = [puntos.saldos(sesion, v.id) for v in sim.con_nombre]
    return {
        "desde": sim.inicio,
        "vecinos": len(sim.vecinos),
        "estadisticas": dict(sim.stats),
        "comercios": filas,
        "saldos_con_nombre": {
            v.nombre: s.disponible for v, s in zip(sim.con_nombre, saldos, strict=True)
        },
    }
