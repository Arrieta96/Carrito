// =====================================================
// TRANSPORTE C&A - APP.JS
// Compatible con el backend actual de Apps Script
// =====================================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbwc8Z-lMVPsmFBh3AAg0O36OTu6a2EMwxf1HZzxnixcJ54gRd1lj_R44OWG-kU1SW6e/exec";

const TARIFAS_INICIALES = {
  Frío: 350,
  Abarrotes: 280,
};

let tarifas = { ...TARIFAS_INICIALES };
let servicioSeleccionado = "";
let viajesMes = [];

// =====================================================
// INICIALIZACIÓN
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  configurarNavegacion();
  configurarServicios();
  configurarFecha();
  configurarFormulario();
  configurarMeses();
  configurarReporte();

  mostrarPantalla("inicio");
  actualizarServicio();

  await cargarTarifas();
});

// =====================================================
// API: TODAS LAS PETICIONES USAN GET
// =====================================================

async function consultarAPI(parametros = {}) {
  return consultarAPIJsonp(parametros);
}

function consultarAPIJsonp(parametros = {}) {
  return new Promise((resolve, reject) => {
    const callback =
      "transporteCallback_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2);

    const url = new URL(API_URL);
    const script = document.createElement("script");
    let terminado = false;

    function limpiar() {
      if (terminado) return;
      terminado = true;
      clearTimeout(timeout);
      script.remove();
      delete window[callback];
    }

    const timeout = setTimeout(() => {
      limpiar();
      reject(new Error("El servidor no respondió. Intenta nuevamente."));
    }, 20000);

    Object.entries(parametros).forEach(([clave, valor]) => {
      url.searchParams.set(clave, valor);
    });

    url.searchParams.set("callback", callback);
    url.searchParams.set("_", String(Date.now()));

    window[callback] = (datos) => {
      limpiar();

      if (!datos || datos.ok !== true) {
        reject(new Error(datos?.mensaje || "Error en el servidor."));
        return;
      }

      resolve(datos);
    };

    script.onerror = () => {
      limpiar();
      reject(new Error("No se pudo conectar con Apps Script."));
    };

    script.src = url.toString();
    document.head.appendChild(script);
  });
}

// =====================================================
// NAVEGACIÓN
// =====================================================

function mostrarPantalla(nombre) {
  const nombres = ["inicio", "registrar", "viajes", "reporte", "confirmacion"];

  nombres.forEach((id) => {
    const pantalla = document.getElementById(id);

    if (pantalla) {
      pantalla.hidden = id !== nombre;
      pantalla.classList.toggle("active", id === nombre);
    }
  });

  document.querySelectorAll("[data-screen]").forEach((boton) => {
    const activo = boton.dataset.screen === nombre;

    boton.classList.toggle("active", activo);
    boton.setAttribute("aria-current", activo ? "page" : "false");
  });

  if (nombre === "viajes") cargarViajes();
  if (nombre === "reporte") cargarReporte();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function configurarNavegacion() {
  document.querySelectorAll("[data-screen]").forEach((boton) => {
    boton.addEventListener("click", (evento) => {
      evento.preventDefault();

      if (boton.dataset.screen) {
        mostrarPantalla(boton.dataset.screen);
      }
    });
  });

  document.querySelectorAll(".nav-item").forEach((boton) => {
    boton.addEventListener("click", (evento) => {
      evento.preventDefault();

      if (boton.dataset.screen) {
        mostrarPantalla(boton.dataset.screen);
      }
    });
  });
}

// =====================================================
// TARIFAS
// =====================================================

async function cargarTarifas() {
  try {
    const datos = await consultarAPI({ accion: "tarifas" });

    if (datos.tarifas) {
      Object.entries(datos.tarifas).forEach(([servicio, monto]) => {
        tarifas[servicio] = Number(monto);
      });
    }

    actualizarServicio();
  } catch (error) {
    console.error("Error al consultar tarifas:", error);
    mostrarMensaje(
      "mensaje-viaje",
      "No se pudieron actualizar las tarifas. Se muestran las tarifas guardadas localmente.",
      true,
    );
  }
}

// =====================================================
// SELECCIÓN DE SERVICIO
// =====================================================

function configurarServicios() {
  document.querySelectorAll(".service-option").forEach((boton) => {
    boton.addEventListener("click", () => {
      const servicio = boton.dataset.service;

      if (!Object.prototype.hasOwnProperty.call(tarifas, servicio)) {
        return;
      }

      servicioSeleccionado = servicio;

      document.querySelectorAll(".service-option").forEach((opcion) => {
        const activo = opcion === boton;

        opcion.classList.toggle("selected", activo);
        opcion.setAttribute("aria-pressed", String(activo));
      });

      actualizarServicio();
      ocultarMensaje("mensaje-viaje");
    });
  });
}

function actualizarServicio() {
  const monto = tarifas[servicioSeleccionado] ?? 0;

  ponerTexto("monto-preview", soles(monto));
  ponerTexto(
    "servicio-preview",
    servicioSeleccionado || "Selecciona un servicio",
  );

  const boton = document.getElementById("guardar-viaje");

  if (boton) {
    boton.disabled = !servicioSeleccionado;
  }
}

// =====================================================
// FECHA
// =====================================================

function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function configurarFecha() {
  const campo = document.getElementById("fecha");

  if (!campo) return;

  if (!campo.value) {
    campo.value = fechaLocalISO();
  }

  campo.addEventListener("change", actualizarFecha);
  actualizarFecha();
}

function actualizarFecha() {
  const valor = document.getElementById("fecha")?.value;

  if (!valor) return;

  const fecha = new Date(valor + "T12:00:00");

  ponerTexto(
    "dia-abreviado",
    new Intl.DateTimeFormat("es-PE", {
      weekday: "short",
    })
      .format(fecha)
      .replace(".", ""),
  );

  ponerTexto("dia-numero", fecha.getDate());

  ponerTexto(
    "dia-nombre",
    new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
    }).format(fecha),
  );

  ponerTexto(
    "fecha-larga",
    new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(fecha),
  );
}

// =====================================================
// REGISTRAR VIAJE
// IMPORTANTE: el backend actual no tiene doPost.
// Se utiliza una llamada GET con callback JSONP,
// implementado en Code.gs en el siguiente paso.
// =====================================================

function configurarFormulario() {
  const formulario = document.getElementById("form-viaje");
  if (!formulario) return;

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const fecha = document.getElementById("fecha")?.value;
    const boton = document.getElementById("guardar-viaje");
    const servicio = servicioSeleccionado;

    if (!fecha) {
      mostrarMensaje("mensaje-viaje", "Selecciona una fecha.", true);
      return;
    }

    if (!servicio) {
      mostrarMensaje("mensaje-viaje", "Selecciona Frío o Abarrotes.", true);
      return;
    }

    if (new Date(fecha + "T12:00:00").getDay() === 0) {
      mostrarMensaje(
        "mensaje-viaje",
        "Los domingos no son días de servicio.",
        true,
      );
      return;
    }

    if (boton) boton.disabled = true;

    mostrarMensaje("mensaje-viaje", "Registrando viaje...");

    try {
      await consultarAPI({
        accion: "registrar",
        fecha: fecha,
        servicio: servicio,
      });

      mostrarConfirmacionViaje();

      await Promise.allSettled([cargarViajes(), cargarReporte()]);
    } catch (error) {
      console.error("Error al registrar el viaje:", error);

      try {
        const verificacion = await consultarAPI({
          accion: "viajes",
          mes: fecha.slice(0, 7),
        });

        const encontrado = verificacion.viajes.some(
          (v) => v.fecha === fecha && v.servicio === servicio,
        );

        if (encontrado) {
          mostrarConfirmacionViaje();
          await Promise.allSettled([cargarViajes(), cargarReporte()]);
        } else {
          mostrarMensaje(
            "mensaje-viaje",
            "No se pudo confirmar el registro. Revisa la lista de viajes.",
            true,
          );
        }
      } catch (errorVerificacion) {
        console.error("Error al verificar el viaje:", errorVerificacion);

        mostrarMensaje(
          "mensaje-viaje",
          "No se recibió confirmación del servidor. Revisa la lista de viajes antes de intentarlo nuevamente.",
          true,
        );
      }
    } finally {
      if (boton) boton.disabled = !servicioSeleccionado;
    }
  });
}

function mostrarConfirmacionViaje() {
  const mensaje = document.getElementById("mensaje-viaje");

  if (!mensaje) {
    console.error("No se encontró el elemento mensaje-viaje.");
    return;
  }

  mensaje.innerHTML = `
    <span class="mensaje-viaje-icono" aria-hidden="true">✓</span>
    <div class="mensaje-viaje-separador" aria-hidden="true"></div>
    <div class="mensaje-viaje-contenido">
      <strong id="mensaje-viaje-titulo">¡Viaje registrado correctamente!</strong>
      <span id="mensaje-viaje-detalle">Se guardó en el sistema.</span>
    </div>
  `;

  mensaje.hidden = false;
  mensaje.classList.remove("error");
}

// =====================================================
// VIAJES DEL MES
// =====================================================

function configurarMeses() {
  const mesActual = fechaLocalISO().slice(0, 7);

  ["mes-viajes", "mes-reporte"].forEach((id) => {
    const campo = document.getElementById(id);

    if (campo && !campo.value) {
      campo.value = mesActual;
    }

    campo?.addEventListener("change", () => {
      if (id === "mes-viajes") cargarViajes();
      if (id === "mes-reporte") cargarReporte();
    });
  });
}

async function cargarViajes() {
  const mes = document.getElementById("mes-viajes")?.value;

  if (!mes) return;

  mostrarMensaje("mensaje-consulta", "Consultando viajes...");

  try {
    const datos = await consultarAPI({
      accion: "viajes",
      mes,
    });

    viajesMes = datos.viajes || [];

    pintarViajes(viajesMes);

    ponerTexto("cantidad-viajes", datos.cantidad ?? viajesMes.length);
    ponerTexto("total-viajes", soles(datos.total ?? 0));

    ocultarMensaje("mensaje-consulta");
  } catch (error) {
    console.error("Error al consultar viajes:", error);

    mostrarMensaje(
      "mensaje-consulta",
      "No se pudieron consultar los viajes: " + error.message,
      true,
    );
  }
}

function pintarViajes(viajes) {
  const lista = document.getElementById("lista-viajes");
  if (!lista) return;

  lista.replaceChildren();

  if (!Array.isArray(viajes) || viajes.length === 0) {
    const vacio = document.createElement("div");
    vacio.className = "empty-state";
    vacio.textContent = "No hay viajes registrados para este mes.";
    lista.appendChild(vacio);
    return;
  }

  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const iconos = {
    Frío: "assets/iconos/vm_icono_frio_azul.svg",
    Abarrotes: "assets/iconos/vm_icono_abarrotes_caja.svg",
  };

  const fechaLocal = (valor) => {
    if (!valor) return null;
    const texto = String(valor);
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const [a, m, d] = texto.split("-").map(Number);
      return new Date(a, m - 1, d, 12);
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  };

  const dinero = (valor) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2,
    }).format(Number(valor) || 0);

  viajes.forEach((viaje) => {
    const fecha = fechaLocal(viaje.fecha);
    const tarjeta = document.createElement("article");
    tarjeta.className = "trip-row";

    const bloqueFecha = document.createElement("div");
    bloqueFecha.className = "trip-date";

    const diaSemana = document.createElement("small");
    diaSemana.textContent = fecha ? dias[fecha.getDay()] : "";

    const diaNumero = document.createElement("strong");
    diaNumero.textContent = fecha
      ? String(fecha.getDate()).padStart(2, "0")
      : "--";

    bloqueFecha.append(diaSemana, diaNumero);

    const icono = document.createElement("img");
    icono.className = "trip-service-icon";
    icono.src =
      iconos[viaje.servicio] || "assets/iconos/vm_icono_abarrotes_caja.svg";
    icono.alt = viaje.servicio || "Servicio";
    icono.width = 31;
    icono.height = 31;

    const descripcion = document.createElement("div");
    descripcion.className = "trip-description";

    const nombreServicio = document.createElement("strong");
    nombreServicio.textContent = viaje.servicio || "Servicio";
    descripcion.appendChild(nombreServicio);

    const monto = document.createElement("span");
    monto.className = "trip-amount";
    monto.textContent = dinero(viaje.monto ?? viaje.tarifa ?? 0);

    const flecha = document.createElement("span");
    flecha.className = "trip-chevron";
    flecha.setAttribute("aria-hidden", "true");

    const imagenFlecha = document.createElement("img");
    imagenFlecha.src = "assets/iconos/vm_icono_flecha_detalle.svg";
    imagenFlecha.alt = "";
    imagenFlecha.width = 12;
    imagenFlecha.height = 12;
    imagenFlecha.style.width = "12px";
    imagenFlecha.style.height = "12px";
    flecha.appendChild(imagenFlecha);

    tarjeta.append(bloqueFecha, icono, descripcion, monto, flecha);
    lista.appendChild(tarjeta);
  });

  const mensaje = document.getElementById("mensaje-consulta");
  if (mensaje) {
    mensaje.textContent = "";
    mensaje.hidden = true;
  }
}

// =====================================================
// REPORTE
// El backend compartido aún no implementa la acción
// de resumen ni la generación del PDF.
// =====================================================

function configurarReporte() {
  const boton = document.getElementById("generar-pdf");

  if (boton) {
    boton.addEventListener("click", generarReportePDF);
  }
}

async function cargarReporte() {
  const mes = document.getElementById("mes-reporte")?.value;

  if (!mes) return;

  try {
    const datos = await consultarAPI({ accion: "viajes", mes });
    const viajes = datos.viajes || [];

    const frio = viajes.filter((v) => v.servicio === "Frío");
    const abarrotes = viajes.filter((v) => v.servicio === "Abarrotes");

    ponerTexto("titulo-resumen", nombreMes(mes));

    ponerTexto("reporte-frio-cantidad", frio.length);
    ponerTexto(
      "reporte-frio-total",
      soles(frio.reduce((suma, v) => suma + Number(v.monto || 0), 0)),
    );

    ponerTexto("reporte-abarrotes-cantidad", abarrotes.length);
    ponerTexto(
      "reporte-abarrotes-total",
      soles(abarrotes.reduce((suma, v) => suma + Number(v.monto || 0), 0)),
    );

    ponerTexto("reporte-total", soles(datos.total ?? 0));
    ponerTexto("reporte-cantidad", datos.cantidad ?? viajes.length);

    ocultarMensaje("mensaje-reporte");
  } catch (error) {
    mostrarMensaje(
      "mensaje-reporte",
      "No se pudo cargar el reporte: " + error.message,
      true,
    );
  }
}

// =====================================================
// UTILIDADES
// =====================================================

function ponerTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function mostrarMensaje(id, texto, error = false) {
  const elemento = document.getElementById(id);
  if (!elemento) return;

  elemento.textContent = texto;
  elemento.hidden = false;
  elemento.classList.toggle("error", error);
}

function ocultarMensaje(id) {
  const elemento = document.getElementById(id);
  if (!elemento) return;

  elemento.textContent = "";
  elemento.hidden = true;
  elemento.classList.remove("error");
}

function soles(valor) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function formatearFecha(valor) {
  if (!valor) return "Fecha no disponible";

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(valor))
    ? new Date(valor + "T12:00:00")
    : new Date(valor);

  if (Number.isNaN(fecha.getTime())) return String(valor);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

function nombreMes(valor) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(new Date(valor + "-15T12:00:00"));
}

async function generarReportePDF() {
  const boton = document.getElementById("generar-pdf");
  const mes = document.getElementById("mes-reporte")?.value;

  if (typeof html2pdf === "undefined") {
    mostrarMensaje(
      "mensaje-reporte",
      "No se ha cargado la librería PDF.",
      true,
    );
    return;
  }

  if (!mes) {
    mostrarMensaje("mensaje-reporte", "Selecciona un mes.", true);
    return;
  }

  if (boton) boton.disabled = true;

  try {
    mostrarMensaje("mensaje-reporte", "Generando reporte...");

    // El reporte se organiza por semanas completas (lunes a sábado).
    // Por eso se consultan también los meses adyacentes para incluir los días
    // de la primera/última semana que caen fuera del mes seleccionado.
    const [anioSeleccionado, numeroMes] = mes.split("-").map(Number);
    const primerDiaMes = new Date(anioSeleccionado, numeroMes - 1, 1, 12);
    const ultimoDiaMes = new Date(anioSeleccionado, numeroMes, 0, 12);
    const lunesInicial = new Date(primerDiaMes);
    lunesInicial.setDate(
      lunesInicial.getDate() - ((lunesInicial.getDay() + 6) % 7),
    );
    const lunesUltimaSemana = new Date(ultimoDiaMes);
    lunesUltimaSemana.setDate(
      lunesUltimaSemana.getDate() - ((lunesUltimaSemana.getDay() + 6) % 7),
    );
    const sabadoFinal = new Date(lunesUltimaSemana);
    sabadoFinal.setDate(sabadoFinal.getDate() + 5);

    const mesesConsulta = [
      new Date(anioSeleccionado, numeroMes - 2, 1),
      new Date(anioSeleccionado, numeroMes - 1, 1),
      new Date(anioSeleccionado, numeroMes, 1),
    ].map(
      (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
    const respuestas = await Promise.all(
      [...new Set(mesesConsulta)].map((mesConsulta) =>
        consultarAPI({ accion: "viajes", mes: mesConsulta }),
      ),
    );
    const viajesBrutos = respuestas.flatMap(
      (respuesta) => respuesta.viajes || [],
    );
    const viajes = viajesBrutos
      .map((v) => ({
        ...v,
        fechaObj: new Date(v.fecha + "T12:00:00"),
        montoNum: Number(v.monto ?? v.tarifa ?? 0),
      }))
      .filter(
        (v) =>
          !Number.isNaN(v.fechaObj.getTime()) &&
          v.fechaObj >= lunesInicial &&
          v.fechaObj <= sabadoFinal &&
          v.fechaObj.getDay() !== 0,
      )
      .sort((a, b) => a.fechaObj - b.fechaObj);

    const dinero = (n) =>
      new Intl.NumberFormat("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

    const fecha = (d) =>
      new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);

    const dia = (d) =>
      new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
      }).format(d);

    const nombre = new Intl.DateTimeFormat("es-PE", {
      month: "long",
      year: "numeric",
    }).format(new Date(mes + "-15T12:00:00"));

    // Crear todas las semanas del calendario del mes, incluso si alguna
    // tiene pocos o ningún viaje. Cada semana va de lunes a sábado.
    const listaSemanas = [];
    for (
      let lunes = new Date(lunesInicial);
      lunes <= ultimoDiaMes;
      lunes.setDate(lunes.getDate() + 7)
    ) {
      const inicio = new Date(lunes);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 5);
      listaSemanas.push({
        inicio,
        viajes: viajes.filter((v) => v.fechaObj >= inicio && v.fechaObj <= fin),
      });
    }
    const frio = viajes.filter((v) => v.servicio === "Frío");
    const abarrotes = viajes.filter((v) => v.servicio === "Abarrotes");
    const totalFrio = frio.reduce((s, v) => s + v.montoNum, 0);
    const totalAbarrotes = abarrotes.reduce((s, v) => s + v.montoNum, 0);
    const totalMes = viajes.reduce((s, v) => s + v.montoNum, 0);

    const ruta = "assets/iconos/reporte/";
    const camion = ruta + "reporte-camion.svg";
    const frioIcono = ruta + "reporte-frio.svg";
    const abarrotesIcono = ruta + "reporte-abarrotes.svg";
    const calendario = ruta + "reporte-calendario.svg";
    const ubicacion = ruta + "reporte-ubicacion.svg";
    const banner = ruta + "reporte-carretera-atardecer.png";

    const escape = (texto) =>
      String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    function encabezado() {
      return `
        <header class="encabezado">
          <img class="camion" src="${camion}">
          <div class="empresa">
            <h1>TRANSPORTES C &amp; A LOGISTIC S.A.C.</h1>
            <div class="subtitulo">R E G I S T R O&nbsp; D E&nbsp; V I A J E S</div>
          </div>
          <div class="periodo">
            <strong>REPORTE MENSUAL<br>${escape(nombre.toUpperCase())}</strong>
            <span>Del 01 al ${new Date(
              Number(mes.slice(0, 4)),
              Number(mes.slice(5, 7)),
              0,
            ).getDate()} de ${escape(nombre)}</span>
            <span>(Lunes a sábado)</span>
          </div>
        </header>`;
    }

    function resumenSemana(semana, numero) {
      const lista = semana.viajes;
      const f = lista.filter((v) => v.servicio === "Frío");
      const a = lista.filter((v) => v.servicio === "Abarrotes");
      const suma = lista.reduce((s, v) => s + v.montoNum, 0);
      const sumaF = f.reduce((s, v) => s + v.montoNum, 0);
      const sumaA = a.reduce((s, v) => s + v.montoNum, 0);
      const fin = new Date(semana.inicio);
      fin.setDate(fin.getDate() + 5);

      return `
        <div class="resumen-semana">
          <img src="${calendario}">
          <div class="periodo-semana">
            <strong>SEMANA ${numero}</strong>
            <span>Del ${new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long" }).format(semana.inicio)} al ${fechaLarga(fin)}</span>
          </div>
          <div class="dato-servicio">
            <img src="${frioIcono}">
            <div>${f.length} viajes<strong>S/ ${dinero(sumaF)}</strong></div>
          </div>
          <div class="dato-servicio">
            <img src="${abarrotesIcono}">
            <div>${a.length} viajes<strong>S/ ${dinero(sumaA)}</strong></div>
          </div>
          <div class="total-semana">
            <span>TOTAL SEMANA</span>
            <strong>S/ ${dinero(suma)}</strong>
          </div>
        </div>`;
    }

    function filasSemana(semana) {
      const filas = [];
      const inicio = new Date(semana.inicio);

      // Siempre se detallan los seis días laborables: lunes a sábado.
      // Si un día tiene varios viajes, se conserva una fila por cada viaje.
      for (let desplazamiento = 0; desplazamiento < 6; desplazamiento++) {
        const fechaDia = new Date(inicio);
        fechaDia.setDate(inicio.getDate() + desplazamiento);
        const viajesDia = semana.viajes.filter(
          (v) =>
            v.fechaObj.getFullYear() === fechaDia.getFullYear() &&
            v.fechaObj.getMonth() === fechaDia.getMonth() &&
            v.fechaObj.getDate() === fechaDia.getDate(),
        );

        if (viajesDia.length) {
          viajesDia.forEach((v) =>
            filas.push({ fechaObj: fechaDia, viaje: v }),
          );
        } else {
          filas.push({ fechaObj: fechaDia, viaje: null });
        }
      }
      return filas;
    }

    function tablaSemana(semana) {
      const filas = filasSemana(semana);
      return `
        <table class="tabla-viajes">
          <thead><tr>
            <th>N.º</th><th>Día</th><th>Fecha</th>
            <th>Servicio</th><th>Monto (S/)</th>
          </tr></thead>
          <tbody>
            ${filas
              .map((fila, i) => {
                const v = fila.viaje;
                return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${escape(dia(fila.fechaObj))}</td>
                  <td>${fecha(fila.fechaObj)}</td>
                  <td class="servicio">
                    ${v ? `<img src="${v.servicio === "Frío" ? frioIcono : abarrotesIcono}" alt=""> ${escape(v.servicio)}` : `<span class="sin-viaje">Sin viaje</span>`}
                  </td>
                  <td>${v ? dinero(v.montoNum) : ""}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>`;
    }

    function altoSemana(semana) {
      // Debe corresponder a las dimensiones compactas de la tabla en CSS.
      return 24 + filasSemana(semana).length * 5.2;
    }

    function fechaLarga(valor) {
      return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(valor);
    }
    function bloqueSemana(semana, numero) {
      return `
        <section class="bloque-semana">
          ${resumenSemana(semana, numero)}
          ${tablaSemana(semana)}
        </section>`;
    }

    const resumenSemanal = listaSemanas
      .map((s, i) => {
        const f = s.viajes.filter((v) => v.servicio === "Frío");
        const a = s.viajes.filter((v) => v.servicio === "Abarrotes");
        const total = s.viajes.reduce((n, v) => n + v.montoNum, 0);
        const tf = f.reduce((n, v) => n + v.montoNum, 0);
        const ta = a.reduce((n, v) => n + v.montoNum, 0);

        return `<tr>
        <td>Semana ${i + 1}</td>
        <td>${fecha(s.inicio)} - ${fecha(
          new Date(
            s.inicio.getFullYear(),
            s.inicio.getMonth(),
            s.inicio.getDate() + 5,
          ),
        )}</td>
        <td>${f.length}</td><td>${dinero(tf)}</td>
        <td>${a.length}</td><td>${dinero(ta)}</td>
        <td><strong>${dinero(total)}</strong></td>
      </tr>`;
      })
      .join("");

    const bannerHTML = `
      <div class="banner" style="background-image:url('${banner}')">
        <div class="placa">
          PLACA: &nbsp;&nbsp;&nbsp; CMF-714<br>
          OPERACIÓN: &nbsp;&nbsp; GLORIA
        </div>
      </div>`;

    const cierreHTML = `
      <div class="cierre-reporte">
        <div class="total-mes">
          <strong>TOTAL DEL MES</strong>
          <span>${frio.length} viajes Frío<br><strong>S/ ${dinero(totalFrio)}</strong></span>
          <span>${abarrotes.length} viajes Abarrotes<br><strong>S/ ${dinero(totalAbarrotes)}</strong></span>
          <span>${viajes.length} viajes<br><strong>S/ ${dinero(totalMes)}</strong></span>
        </div>
        <div class="titulo-resumen">RESUMEN POR SEMANA</div>
        <table class="tabla-resumen">
          <thead><tr>
            <th>Semana</th><th>Periodo</th><th>Viajes Frío</th>
            <th>Monto (S/)</th><th>Viajes Abarrotes</th>
            <th>Monto (S/)</th><th>Total Semana (S/)</th>
          </tr></thead>
          <tbody>${resumenSemanal}</tbody>
        </table>
        <div class="facturacion">
          <div>
            <strong>FACTURAR A:</strong><br>
            TRANSPORTES C &amp; A LOGISTIC S.A.C.<br>
            RUC: 20615694186<br><br>
            Servicio de transporte de carga de productos GLORIA.<br>
            Precios incluido IGV.
          </div>
          <div class="observacion">
            <strong>OBSERVACIÓN:</strong><br>
            • No olvidar informar en la factura el Nro de detracción.<br>
            • Periodo del ${fecha(new Date(mes + "-01T12:00:00"))} al ${fecha(
              new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0),
            )}.<br>
            • Los montos corresponden a las tarifas vigentes del mes.<br>
            • Reporte generado automáticamente desde el sistema.
          </div>
        </div>
      </div>`;

    // Alturas aproximadas en mm para distribuir semanas según sus filas.
    // Se deja espacio para el cierre mensual en la última página.
    const altoCierre = 52 + listaSemanas.length * 5.2;
    const altoPaginaNormal = 297 - 8 - 20 - 12;
    const altoPaginaPrimera = altoPaginaNormal - 20;
    const paginas = [{ semanas: [], primera: true, alto: 0 }];
    paginas[0].capacidad = altoPaginaPrimera;

    listaSemanas.forEach((semana, i) => {
      const alto = altoSemana(semana);
      let pagina = paginas[paginas.length - 1];
      const maxSemanasPagina = pagina.primera ? 3 : 2;
      if (
        pagina.semanas.length &&
        (pagina.semanas.length >= maxSemanasPagina ||
          pagina.alto + alto > pagina.capacidad)
      ) {
        pagina = {
          semanas: [],
          primera: false,
          alto: 0,
          capacidad: altoPaginaNormal,
        };
        paginas.push(pagina);
      }
      pagina.semanas.push({ semana, numero: i + 1 });
      pagina.alto += alto;
    });

    // Si el cierre no cabe en la última página, trasladar semanas completas
    // a una página final nueva, sin partir ninguna tabla semanal.
    while (true) {
      const ultima = paginas[paginas.length - 1];
      if (ultima.alto + altoCierre <= ultima.capacidad) break;

      if (ultima.semanas.length > 1) {
        const movida = ultima.semanas.pop();
        ultima.alto -= altoSemana(movida.semana);
        paginas.push({
          semanas: [movida],
          primera: false,
          alto: altoSemana(movida.semana),
          capacidad: altoPaginaNormal,
        });
        continue;
      }

      // Si una sola semana no deja espacio para el cierre, el cierre pasa
      // a una página final propia en vez de cortar tablas o tapar el pie.
      if (ultima.semanas.length === 1) {
        paginas.push({
          semanas: [],
          primera: false,
          alto: 0,
          capacidad: altoPaginaNormal,
        });
      }
      break;
    }

    function pieHTML(indice) {
      return `
        <footer class="pie">
          <div class="pie-marca">
            <img src="${ubicacion}" alt="">
            <div><strong>TRANSPORTES C &amp; A LOGISTIC S.A.C.</strong><br>
            <span>Disciplina hoy, más kilómetros mañana.</span></div>
          </div>
          <div class="pie-generado">Generado el ${fecha(new Date())} - ${new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())} h<br>
          Sistema de registro de viajes</div>
          <div class="pie-pagina">Página ${indice + 1} de ${paginas.length}</div>
        </footer>`;
    }

    const paginasHTML = paginas
      .map(
        (pagina, indice) => `
      <section class="pagina">
        ${encabezado()}
        ${pagina.primera ? bannerHTML : ""}
        <div class="contenido-pagina">
          ${pagina.semanas.map((item) => bloqueSemana(item.semana, item.numero)).join("")}
          ${indice === paginas.length - 1 ? cierreHTML : ""}
        </div>
        ${pieHTML(indice)}
      </section>
    `,
      )
      .join("");

    const contenedor = document.createElement("div");
    contenedor.id = "reporte-pdf-final";

    contenedor.innerHTML = `
      <style>
        #reporte-pdf-final {
          width: 210mm;
          color: #092c28;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          background: #f8f0df;
        }
        #reporte-pdf-final * { box-sizing: border-box; }
        #reporte-pdf-final .pagina {
          width: 210mm;
          height: 296mm;
          padding: 4mm 5mm;
          overflow: hidden;
          background: #fff8e9;
          position: relative;
          display: flex;
          flex-direction: column;
          page-break-after: auto;
          break-after: auto;
        }
        #reporte-pdf-final .pagina + .pagina {
          page-break-before: always;
          break-before: page;
        }
        #reporte-pdf-final .contenido-pagina {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        /* Evita que la primera página quede vacía debajo de la última semana.
           Solo estira las semanas de páginas sin cierre mensual. */
        #reporte-pdf-final .contenido-pagina:not(:has(.cierre-reporte)) .bloque-semana {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        #reporte-pdf-final .contenido-pagina:not(:has(.cierre-reporte)) .tabla-viajes {
          flex: 1 1 auto;
          height: 100%;
        }
        #reporte-pdf-final .contenido-pagina:not(:has(.cierre-reporte)) .tabla-viajes tbody tr {
          height: auto;
        }

        #reporte-pdf-final .bloque-semana {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        #reporte-pdf-final .encabezado {
          height: 22mm;
          flex: 0 0 22mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          border-bottom: 1px solid #064b40;
          padding-bottom: 2mm;
        }
        #reporte-pdf-final .camion {
          width: 29mm;
          height: 18mm;
          object-fit: contain;
        }
        #reporte-pdf-final .empresa { flex: 1; }
        #reporte-pdf-final h1 {
          font-size: 20px;
          margin: 0 0 2mm;
          color: #082440;
        }
        #reporte-pdf-final .subtitulo {
          font-size: 10px;
          letter-spacing: 2px;
        }
        #reporte-pdf-final .periodo {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 1mm;
          color: #092440;
          font-size: 9px;
        }
        #reporte-pdf-final .periodo strong { font-size: 12px; }
        #reporte-pdf-final .banner {
          height: 22mm;
          flex: 0 0 22mm;
          margin: 2mm 0;
          border-radius: 2mm;
          background-size: cover;
          background-position: center;
          position: relative;
        }
        #reporte-pdf-final .placa {
          position: absolute;
          top: 2mm; left: 2mm;
          padding: 3mm;
          background: #fff8e9eF;
          border: 1px solid #e2d4b9;
          border-radius: 2mm;
          font-size: 13px;
          font-weight: bold;
          line-height: 1.5;
        }
        #reporte-pdf-final .bloque-semana { margin-top: 2mm; }
        #reporte-pdf-final .resumen-semana {
          display: flex;
          align-items: center;
          height: 15mm;
          gap: 2mm;
          background: #f6eedc;
          border-radius: 2mm;
          padding: 1.5mm;
        }
        #reporte-pdf-final .resumen-semana > img {
          width: 8mm; height: 8mm; object-fit: contain;
        }
        #reporte-pdf-final .periodo-semana { flex: 1; }
        #reporte-pdf-final .periodo-semana strong {
          display: block; font-size: 16px;
        }
        #reporte-pdf-final .periodo-semana span { font-size: 10px; }
        #reporte-pdf-final .dato-servicio {
          display: flex; align-items: center; gap: 2mm;
          padding: 0 2mm;
          border-left: 1px solid #dfd2b8;
          min-width: 27mm;
        }
        #reporte-pdf-final .dato-servicio img {
          width: 7mm; height: 7mm; object-fit: contain;
        }
        #reporte-pdf-final .dato-servicio strong {
          display: block; font-size: 13px; margin-top: 1mm;
        }
        #reporte-pdf-final .total-semana {
          background: #004b3e; color: white;
          border-radius: 2mm; text-align: center;
          padding: 2.5mm 3mm; min-width: 31mm;
        }
        #reporte-pdf-final .total-semana span {
          display: block; font-size: 8px;
        }
        #reporte-pdf-final .total-semana strong {
          display: block; font-size: 17px; margin-top: 1mm;
        }
        #reporte-pdf-final .tabla-viajes {
          width: 100%; border-collapse: collapse;
          margin-top: 1mm; font-size: 11px;
        }
        #reporte-pdf-final .tabla-viajes th {
          background: #004b3e; color: white;
          padding: 1.1mm 0.7mm; font-size: 9px;
        }
        #reporte-pdf-final .tabla-viajes td {
          border: 1px solid #e5dac6;
          padding: 0.65mm 1.2mm;
          text-align: center;
          height: 5.2mm;
          line-height: 1.1;
          font-size: 9.5px;
        }
        #reporte-pdf-final .tabla-viajes tbody tr:nth-child(even) {
          background: #f7efdf;
        }
        #reporte-pdf-final .tabla-viajes th:first-child { width: 8%; }
        #reporte-pdf-final .tabla-viajes th:nth-child(2) { width: 17%; }
        #reporte-pdf-final .tabla-viajes th:nth-child(3) { width: 21%; }
        #reporte-pdf-final .tabla-viajes th:nth-child(4) { width: 34%; }
        #reporte-pdf-final .tabla-viajes th:last-child { width: 20%; }
        #reporte-pdf-final .servicio {
          text-align: center !important;
          white-space: nowrap;
          vertical-align: middle;
          padding: 0.35mm 1mm !important;
        }
        #reporte-pdf-final .servicio img {
          display: inline-block;
          width: 4.5mm;
          height: 4.5mm;
          object-fit: contain;
          vertical-align: middle;
          margin-right: 1.2mm;
        }
        #reporte-pdf-final .sin-viaje {
          color: #7d7668;
          font-style: italic;
        }
        #reporte-pdf-final .pie {
          flex: 0 0 12mm;
          min-height: 12mm;
          margin-top: auto;
          padding-top: 2mm;
          border-top: 1px solid #004b3e;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2mm;
          font-size: 8px;
          color: #092c28;
        }
        #reporte-pdf-final .pie-marca {
          display: flex;
          align-items: center;
          gap: 2mm;
          flex: 1 1 40%;
          min-width: 0;
        }
        #reporte-pdf-final .pie-marca img {
          width: 9mm;
          height: 10mm;
          object-fit: contain;
          flex: 0 0 auto;
        }
        #reporte-pdf-final .pie-marca strong { font-size: 9px; }
        #reporte-pdf-final .pie-generado {
          flex: 1 1 32%;
          text-align: right;
          padding-right: 3mm;
          border-right: 1px solid #a4b8a9;
          line-height: 1.35;
        }
        #reporte-pdf-final .pie-pagina {
          flex: 0 0 27mm;
          border: 1px solid #dfd2b8;
          border-radius: 2mm;
          padding: 2mm 1mm;
          text-align: center;
          font-size: 9px;
          white-space: nowrap;
        }
        #reporte-pdf-final .total-mes {
          display: flex; align-items: center; justify-content: space-between;
          margin: 2mm 0 1.5mm; background: #004b3e; color: white;
          border-radius: 2mm; padding: 3mm 3mm; font-size: 13px;
        }
        #reporte-pdf-final .total-mes strong { font-size: 18px; }
        #reporte-pdf-final .titulo-resumen {
          background: #004b3e; color: white; padding: 1mm 2mm;
          font-weight: bold; font-size: 11px;
        }
        #reporte-pdf-final .tabla-resumen {
          width: 100%; border-collapse: collapse; font-size: 9px;
        }
        #reporte-pdf-final .tabla-resumen th,
        #reporte-pdf-final .tabla-resumen td {
          border: 1px solid #e1d5c1;
          padding: 1mm 0.65mm; text-align: center;
        }
        #reporte-pdf-final .tabla-resumen th {
          background: #075347; color: white;
        }
        #reporte-pdf-final .facturacion {
          display: flex; gap: 4mm; margin-top: 2mm; font-size: 9px;
        }
        #reporte-pdf-final .facturacion > div { flex: 1; }
        #reporte-pdf-final .observacion {
          border-left: 1px solid #a4b8a9; padding-left: 4mm;
        }
      </style>

      ${paginasHTML}`;

    document.body.appendChild(contenedor);

    // Esperar imágenes y convertir los SVG a PNG para que html2canvas los dibuje.
    await Promise.all(
      [...contenedor.querySelectorAll("img")].map(async (img) => {
        const esperarImagen = () =>
          new Promise((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });

        await esperarImagen();
        if (!img.src.toLowerCase().includes(".svg") || img.naturalWidth === 0)
          return;

        try {
          const respuesta = await fetch(img.src);
          if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
          const svgTexto = await respuesta.text();
          const svgBlob = new Blob([svgTexto], {
            type: "image/svg+xml;charset=utf-8",
          });
          const svgURL = URL.createObjectURL(svgBlob);
          try {
            const imagenSVG = new Image();
            imagenSVG.src = svgURL;
            await new Promise((resolve, reject) => {
              imagenSVG.onload = resolve;
              imagenSVG.onerror = reject;
            });
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(192, imagenSVG.naturalWidth * 3);
            canvas.height = Math.max(192, imagenSVG.naturalHeight * 3);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(imagenSVG, 0, 0, canvas.width, canvas.height);
            img.src = canvas.toDataURL("image/png");
            await esperarImagen();
          } finally {
            URL.revokeObjectURL(svgURL);
          }
        } catch (error) {
          console.error(
            "No se pudo convertir el icono SVG para el PDF:",
            img.src,
            error,
          );
        }
      }),
    );

    await html2pdf()
      .set({
        margin: 0,
        filename: `Reporte_Transporte_CA_${mes}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#f8f0df" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css"],
          avoid: [".bloque-semana"],
        },
      })
      .from(contenedor)
      .save();

    ocultarMensaje("mensaje-reporte");
  } catch (error) {
    console.error("Error al generar el PDF:", error);
    mostrarMensaje(
      "mensaje-reporte",
      "No se pudo generar el PDF: " + error.message,
      true,
    );
  } finally {
    document.getElementById("reporte-pdf-final")?.remove();
    if (boton) boton.disabled = false;
  }
}
