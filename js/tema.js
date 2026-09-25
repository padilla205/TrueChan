/* =========================================================
   TEMA — modo claro / modo oscuro
   Este script se carga en el <head> SIN defer, así que se ejecuta
   antes de que se pinte la página. Por eso aplicamos el tema
   enseguida (evita un destello blanco) y esperamos a que exista
   el botón para darle funcionalidad.
   ========================================================= */

const CLAVE_TEMA = 'truechan-tema';

// Lee el tema guardado. try/catch porque localStorage puede estar
// bloqueado (modo privado, cookies desactivadas...).
function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

function guardarTema(tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Si no se puede guardar, el tema funciona igual; solo no se recordará
  }
}

// Decide el tema con el que arranca la página.
function temaInicial() {
  const guardado = leerTemaGuardado();

  // Solo aceptamos los dos valores válidos: nunca nos fiamos de lo
  // que haya en localStorage (alguien podría haberlo modificado)
  if (guardado === 'oscuro' || guardado === 'claro') {
    return guardado;
  }

  // Si no hay nada guardado, usamos la preferencia del sistema operativo
  const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return sistemaOscuro ? 'oscuro' : 'claro';
}

// Pone el tema en <html data-tema="..."> (el CSS reacciona a eso)
// y actualiza el texto del botón si ya existe.
function aplicarTema(tema) {
  // document.documentElement es la etiqueta <html>
  document.documentElement.dataset.tema = tema;

  const texto = document.querySelector('.boton-tema-texto');
  if (texto) {
    // El texto dice a qué modo CAMBIARÁS al pulsar
    texto.textContent = tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro';
  }
}

// 1) Ahora mismo, antes de pintar: aplicamos el tema inicial.
aplicarTema(temaInicial());

// 2) Cuando el HTML esté cargado, el botón ya existe: le damos vida.
document.addEventListener('DOMContentLoaded', () => {
  const boton = document.getElementById('boton-tema');
  if (!boton) return;

  // Actualiza el texto del botón (antes aún no existía)
  aplicarTema(document.documentElement.dataset.tema);

  boton.addEventListener('click', () => {
    const actual = document.documentElement.dataset.tema;
    const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
    aplicarTema(nuevo);
    guardarTema(nuevo);
  });
});
