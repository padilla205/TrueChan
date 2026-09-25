/* =========================================================
   CITAS — vista previa del mensaje citado
   Al pasar el ratón por una cita >>123, flota una copia del
   mensaje 123 (si está en esta página). Así lees a qué responde
   alguien sin tener que ir a buscarlo.
   Usa colocarFlotante() y hayRaton de js/comun.js.
   ========================================================= */

// Contenedor flotante. Se crea una vez y se reutiliza.
const vistaCita = document.createElement('div');
vistaCita.className = 'vista-cita';
// Es una copia de algo que ya está en la página: los lectores de
// pantalla la ignoran para no leer el mensaje dos veces.
vistaCita.setAttribute('aria-hidden', 'true');
vistaCita.hidden = true;
document.body.append(vistaCita);

function ocultarVistaCita() {
  vistaCita.hidden = true;
  vistaCita.replaceChildren();  // vaciarlo
}

document.addEventListener('mouseover', (evento) => {
  if (!hayRaton.matches) return;
  const enlace = evento.target.closest('a.cita');
  if (!enlace) return;

  // enlace.hash es la parte "#p123" del enlace. slice(1) quita la "#".
  const original = document.getElementById(enlace.hash.slice(1));
  // Si el mensaje citado no está en esta página, no hay nada que enseñar
  if (!original) return;

  // cloneNode(true) = copia completa del mensaje. Le quitamos el id,
  // porque en una página no puede haber dos elementos con el mismo id.
  const copia = original.cloneNode(true);
  copia.removeAttribute('id');

  vistaCita.replaceChildren(copia);
  vistaCita.hidden = false;
  colocarFlotante(vistaCita, evento.clientX, evento.clientY);
});

// La vista previa sigue al ratón mientras está encima de la cita
document.addEventListener('mousemove', (evento) => {
  if (vistaCita.hidden) return;
  colocarFlotante(vistaCita, evento.clientX, evento.clientY);
});

document.addEventListener('mouseout', (evento) => {
  if (evento.target.closest('a.cita')) ocultarVistaCita();
});

// Al hacer clic en la cita saltamos al mensaje: ya no hace falta la vista previa
document.addEventListener('click', (evento) => {
  if (evento.target.closest('a.cita')) ocultarVistaCita();
});

window.addEventListener('scroll', ocultarVistaCita, { passive: true });
