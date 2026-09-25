/* =========================================================
   TABLÓN — lógica de un tablón (crear y mostrar hilos)
   Por ahora los hilos se guardan en localStorage (en TU navegador).
   Cuando pasemos a Supabase, solo cambiarán cargarHilos() y guardarHilos().
   ========================================================= */

// ---------- 1. CONFIGURACIÓN ----------

// Leemos data-tablon="anime" del <body>. dataset convierte data-* en propiedades.
const idTablon = document.body.dataset.tablon;

// Cada tablón guarda sus hilos con una clave distinta: "truechan-hilos-anime", etc.
const CLAVE_ALMACEN = `truechan-hilos-${idTablon}`;

// Tamaño máximo de la imagen: 500 KB (1 KB = 1024 bytes).
// localStorage solo admite unos 5 MB en total, por eso somos estrictos.
const TAMANO_MAXIMO = 500 * 1024;

// Tipos de imagen permitidos. SVG NO está: un SVG puede contener <script>.
const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

// ---------- 2. REFERENCIAS A ELEMENTOS DEL HTML ----------
const formulario = document.getElementById('form-hilo');
const mensajeError = document.getElementById('form-error');
const listaHilos = document.getElementById('lista-hilos');
const avisoSinHilos = document.getElementById('sin-hilos');
const plantilla = document.getElementById('plantilla-hilo');

// ---------- 3. GUARDAR Y CARGAR ----------

// Devuelve el array de hilos guardado, o un array vacío si no hay nada.
function cargarHilos() {
  // try/catch: si los datos están corruptos o el navegador bloquea
  // localStorage, no queremos que la página entera se rompa.
  try {
    const texto = localStorage.getItem(CLAVE_ALMACEN);
    // localStorage solo guarda texto; JSON.parse lo convierte de vuelta en array
    return texto ? JSON.parse(texto) : [];
  } catch {
    return [];
  }
}

// Guarda el array de hilos. Puede lanzar un error si no queda espacio.
function guardarHilos(hilos) {
  // JSON.stringify convierte el array en texto para poder guardarlo
  localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(hilos));
}

// ---------- 4. LEER LA IMAGEN ----------

// FileReader lee el archivo y lo convierte en un "data URL":
// un texto larguísimo tipo "data:image/png;base64,iVBOR..." que <img> sabe mostrar.
// Devuelve una Promise porque leer un archivo tarda (es asíncrono).
function leerImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(archivo);
  });
}

// ---------- 5. PINTAR LOS HILOS ----------

// Escribe el comentario línea a línea. Las líneas que empiezan por ">"
// van dentro de un <span class="greentext"> (el clásico texto verde).
// SEGURIDAD: usamos textContent / append(texto), NUNCA innerHTML.
// Si alguien escribe <script>...</script>, se mostrará como texto normal.
function pintarComentario(elemento, texto) {
  const lineas = texto.split('\n');

  lineas.forEach((linea, indice) => {
    // Entre línea y línea añadimos un salto <br>
    if (indice > 0) {
      elemento.append(document.createElement('br'));
    }

    if (linea.startsWith('>')) {
      const verde = document.createElement('span');
      verde.className = 'greentext';
      verde.textContent = linea;
      elemento.append(verde);
    } else {
      // append() con un texto crea un nodo de texto: tampoco interpreta HTML
      elemento.append(linea);
    }
  });
}

// Crea el <article> de UN hilo a partir de la plantilla y lo devuelve.
function crearElementoHilo(hilo) {
  // cloneNode(true) copia la plantilla con todo lo que tiene dentro
  const copia = plantilla.content.cloneNode(true);

  // Solo aceptamos imágenes "data:image/...". Si alguien manipulara
  // localStorage para meter otra cosa, no la cargamos.
  const img = copia.querySelector('img');
  if (hilo.imagen.startsWith('data:image/')) {
    img.src = hilo.imagen;
  }

  copia.querySelector('.hilo-asunto').textContent = hilo.asunto;
  copia.querySelector('.hilo-nombre').textContent = hilo.nombre;

  const fecha = copia.querySelector('.hilo-fecha');
  fecha.dateTime = hilo.fecha;  // formato máquina (atributo datetime)
  fecha.textContent = new Date(hilo.fecha).toLocaleString('es');  // formato humano

  copia.querySelector('.hilo-numero').textContent = `N.º ${hilo.numero}`;

  pintarComentario(copia.querySelector('.hilo-comentario'), hilo.comentario);

  return copia;
}

// Vacía la lista y vuelve a pintar todos los hilos.
function mostrarHilos() {
  const hilos = cargarHilos();

  // replaceChildren() sin argumentos borra todo lo que había dentro
  listaHilos.replaceChildren();
  hilos.forEach((hilo) => listaHilos.append(crearElementoHilo(hilo)));

  // hidden oculta el aviso si hay al menos un hilo
  avisoSinHilos.hidden = hilos.length > 0;
}

// ---------- 6. ENVÍO DEL FORMULARIO ----------

// "async" permite usar "await" dentro para esperar a que se lea la imagen.
formulario.addEventListener('submit', async (evento) => {
  // Evita el comportamiento normal (recargar la página enviando los datos)
  evento.preventDefault();
  mensajeError.textContent = '';

  // .trim() quita espacios al principio y al final
  const nombre = formulario.nombre.value.trim() || 'Anónimo';
  const asunto = formulario.asunto.value.trim();
  const comentario = formulario.comentario.value.trim();
  const archivo = formulario.imagen.files[0];  // el primer (y único) archivo elegido

  // --- Validaciones: si algo falla, mostramos el error y paramos con "return" ---
  if (!comentario) {
    mensajeError.textContent = 'Escribe un comentario.';
    return;
  }
  if (!archivo) {
    mensajeError.textContent = 'Para crear un hilo necesitas una imagen.';
    return;
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    mensajeError.textContent = 'Formato no permitido. Usa PNG, JPG, GIF o WEBP.';
    return;
  }
  if (archivo.size > TAMANO_MAXIMO) {
    mensajeError.textContent = 'La imagen pesa más de 500 KB.';
    return;
  }

  const hilos = cargarHilos();

  // Número del hilo: el del más reciente + 1. "?." evita un error si no hay hilos,
  // y "?? 0" usa 0 en ese caso.
  const numero = (hilos[0]?.numero ?? 0) + 1;

  try {
    const nuevoHilo = {
      numero,
      nombre,
      asunto,
      comentario,
      imagen: await leerImagen(archivo),
      fecha: new Date().toISOString(),  // fecha en formato estándar
    };

    // unshift() añade al PRINCIPIO: los hilos nuevos salen arriba
    hilos.unshift(nuevoHilo);
    guardarHilos(hilos);
  } catch (error) {
    // El error más probable: localStorage lleno (QuotaExceededError)
    mensajeError.textContent = error.name === 'QuotaExceededError'
      ? 'No queda espacio en el navegador para más hilos.'
      : 'No se pudo publicar el hilo.';
    return;
  }

  formulario.reset();  // vacía el formulario
  mostrarHilos();
});

// ---------- 7. ARRANQUE ----------
// Al cargar la página, pintamos los hilos que ya hubiera guardados.
mostrarHilos();
