/* =========================================================
   IMÁGENES — visor con clic y vista previa al pasar el ratón
   (las dos en el centro de la pantalla)
   Funciona con cualquier imagen que tenga esta estructura:

     <a class="enlace-imagen" href="URL"><img class="miniatura"></a>

   Usamos "delegación de eventos": en vez de poner un listener en
   cada imagen, ponemos UNO en todo el documento y miramos sobre qué
   elemento ocurrió. Así funciona también con los mensajes que se
   añaden después (al cargar o al publicar).
   Usa hayRaton de js/comun.js.
   ========================================================= */

// ---------- 1. VISOR (la imagen en grande en el centro) ----------

// <dialog> es el elemento de HTML para ventanas "modales" (las que tapan
// la página hasta que las cierras). Con showModal() el navegador ya:
//   - lo centra en la pantalla y oscurece el fondo (::backdrop en el CSS)
//   - lo cierra con la tecla Esc
//   - no deja usar con el teclado lo que queda detrás
const visor = document.createElement('dialog');
visor.className = 'visor';
visor.setAttribute('aria-label', 'Imagen ampliada');

// Botón para cerrar (para quien usa teclado o lector de pantalla).
// Al abrirse el <dialog>, el foco va a este botón.
const botonCerrarVisor = document.createElement('button');
botonCerrarVisor.type = 'button';
botonCerrarVisor.className = 'visor-cerrar';
botonCerrarVisor.textContent = '×';
botonCerrarVisor.setAttribute('aria-label', 'Cerrar imagen');

const imagenVisor = document.createElement('img');

visor.append(botonCerrarVisor, imagenVisor);
document.body.append(visor);

function abrirVisor(enlace) {
  // La imagen en grande es la original (a la que apunta el enlace)
  imagenVisor.src = enlace.href;
  imagenVisor.alt = enlace.querySelector('img').alt;
  visor.showModal();
}

// Un clic en CUALQUIER parte del visor (la imagen, el fondo, el ×) lo cierra
visor.addEventListener('click', () => visor.close());

// Al cerrarse (por clic o por Esc), quitamos la imagen para liberar memoria
visor.addEventListener('close', () => imagenVisor.removeAttribute('src'));

// Clic en una miniatura → abre el visor
document.addEventListener('click', (evento) => {
  const enlace = evento.target.closest('a.enlace-imagen');
  if (!enlace) return;

  // Ctrl/Cmd/Shift + clic, o clic con la rueda: dejamos que el navegador
  // haga lo normal (abrir la imagen en otra pestaña o ventana).
  if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.button !== 0) return;

  // preventDefault: no sigas el enlace, lo gestionamos nosotros
  evento.preventDefault();
  ocultarVistaPrevia();
  abrirVisor(enlace);
});

// ---------- 2. VISTA PREVIA AL PASAR EL RATÓN ----------
// La imagen aparece en grande en el centro de la pantalla mientras el
// ratón está encima de la miniatura. La coloca el CSS (.vista-previa),
// aquí solo la mostramos y la ocultamos.

// La <img> de la vista previa. Se crea una sola vez y se reutiliza.
const vistaPrevia = document.createElement('img');
vistaPrevia.className = 'vista-previa';
vistaPrevia.alt = '';
// Es una copia decorativa de una imagen que ya está en la página:
// la ocultamos a los lectores de pantalla para no leerla dos veces.
vistaPrevia.setAttribute('aria-hidden', 'true');
vistaPrevia.hidden = true;
document.body.append(vistaPrevia);

function ocultarVistaPrevia() {
  vistaPrevia.hidden = true;
  vistaPrevia.removeAttribute('src');
}

// "mouseover" = el ratón entra en un elemento
document.addEventListener('mouseover', (evento) => {
  if (!hayRaton.matches) return;
  // closest() busca hacia arriba el elemento que cumpla el selector (o null)
  const miniatura = evento.target.closest('img.miniatura');
  if (!miniatura) return;

  vistaPrevia.src = miniatura.src;
  vistaPrevia.hidden = false;
});

// "mouseout" = el ratón sale de un elemento
document.addEventListener('mouseout', (evento) => {
  if (evento.target.closest('img.miniatura')) ocultarVistaPrevia();
});

// Al hacer scroll la miniatura se mueve y el cursor ya no está encima
window.addEventListener('scroll', ocultarVistaPrevia, { passive: true });
