/* =========================================================
   ESTILO — selector de estilos visuales (lista desplegable)
   Funciona igual que tema.js: se carga en el <head> SIN defer,
   aplica el estilo guardado antes de pintar la página y, cuando
   el HTML ya existe, construye el menú y le da vida.

   El estilo se guarda en <html data-estilo="...">. Es independiente
   del tema (data-tema="claro" / "oscuro"): se pueden combinar.
   ========================================================= */

const CLAVE_ESTILO = 'truechan-estilo';

// LISTA DE ESTILOS: clave (lo que irá en data-estilo) → nombre visible.
// Para añadir uno nuevo: una línea aquí + sus colores en styles.css
// (mira la sección "11. ESTILOS" del CSS).
const ESTILOS = {
  clasico: 'Clásico',
  // Estilo 8 bits: colores arcade y bordes cuadrados tipo píxel.
  // La clave '8bits' es la que el CSS usa en [data-estilo="8bits"].
  '8bits': '8 bits',
};

const ESTILO_POR_DEFECTO = 'clasico';

// Lee y guarda en localStorage. try/catch porque puede estar
// bloqueado (modo privado, cookies desactivadas...).
function leerEstiloGuardado() {
  try {
    return localStorage.getItem(CLAVE_ESTILO);
  } catch {
    return null;
  }
}

function guardarEstilo(estilo) {
  try {
    localStorage.setItem(CLAVE_ESTILO, estilo);
  } catch {
    // Si no se puede guardar, funciona igual; solo no se recordará
  }
}

// Decide el estilo con el que arranca la página.
function estiloInicial() {
  const guardado = leerEstiloGuardado();

  // Nunca nos fiamos de localStorage: solo aceptamos claves que
  // estén en nuestra lista. Object.hasOwn comprueba que la clave
  // es propia del objeto (y no algo heredado como "toString").
  if (guardado && Object.hasOwn(ESTILOS, guardado)) {
    return guardado;
  }
  return ESTILO_POR_DEFECTO;
}

// Pone el estilo en <html> y marca la opción elegida en el menú.
function aplicarEstilo(estilo) {
  document.documentElement.dataset.estilo = estilo;

  // aria-pressed="true" en la opción activa: el CSS le pone el ✓
  // y los lectores de pantalla anuncian "pulsado"
  document.querySelectorAll('.opcion-estilo').forEach((opcion) => {
    opcion.setAttribute('aria-pressed', opcion.dataset.estilo === estilo);
  });
}

// 1) Ahora mismo, antes de pintar: aplicamos el estilo inicial.
aplicarEstilo(estiloInicial());

// 2) Cuando el HTML esté cargado: construimos el menú y lo activamos.
document.addEventListener('DOMContentLoaded', () => {
  const boton = document.getElementById('boton-estilo');
  const menu = document.getElementById('menu-estilos');
  if (!boton || !menu) return;

  // El contenedor de botón + menú (para saber si un clic fue "dentro")
  const selector = boton.parentElement;

  function abrirMenu() {
    boton.setAttribute('aria-expanded', 'true');
  }

  function cerrarMenu() {
    boton.setAttribute('aria-expanded', 'false');
  }

  function menuAbierto() {
    return boton.getAttribute('aria-expanded') === 'true';
  }

  // Creamos un <li><button> por cada estilo de la lista.
  // Usamos textContent (no innerHTML): así el texto nunca se
  // interpreta como HTML. Buena costumbre en un imageboard.
  for (const [clave, nombre] of Object.entries(ESTILOS)) {
    const item = document.createElement('li');
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'opcion-estilo';
    opcion.dataset.estilo = clave;
    opcion.textContent = nombre;

    opcion.addEventListener('click', () => {
      aplicarEstilo(clave);
      guardarEstilo(clave);
      cerrarMenu();
      boton.focus();   // devolvemos el foco al botón (útil con teclado)
    });

    item.append(opcion);
    menu.append(item);
  }

  // Marcamos la opción activa ahora que los botones existen
  aplicarEstilo(document.documentElement.dataset.estilo);

  // Clic en "Estilo": si está abierto se cierra y viceversa
  boton.addEventListener('click', () => {
    if (menuAbierto()) {
      cerrarMenu();
    } else {
      abrirMenu();
    }
  });

  // Clic en cualquier otro sitio de la página: cerramos
  document.addEventListener('click', (evento) => {
    if (!selector.contains(evento.target)) {
      cerrarMenu();
    }
  });

  // Tecla Escape: cerramos y devolvemos el foco al botón
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menuAbierto()) {
      cerrarMenu();
      boton.focus();
    }
  });

  // Si el foco sale del selector con Tab, también cerramos.
  // relatedTarget = el elemento que RECIBE el foco.
  selector.addEventListener('focusout', (evento) => {
    if (!selector.contains(evento.relatedTarget)) {
      cerrarMenu();
    }
  });
});
