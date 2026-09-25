/* =========================================================
   COMÚN — funciones que usan tanto el tablón (tablon.js)
   como la página de un hilo (hilo.js). Así no repetimos código.
   Necesita "clienteSupabase" (de js/supabase.js).
   ========================================================= */

// ---------- 1. IMÁGENES: CONFIGURACIÓN ----------

// Nombre del bucket de Supabase Storage donde van las imágenes
const BUCKET = 'imagenes';

// Tamaño máximo de la imagen: 2 MB, el mismo límite que tiene el bucket.
// Comprobarlo aquí solo sirve para avisar antes; el que manda es el servidor.
const TAMANO_MAXIMO = 2 * 1024 * 1024;

// Tipos de imagen permitidos → extensión que tendrá el archivo.
// SVG NO está: un SVG puede contener <script>.
const EXTENSIONES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// El mismo formato de ruta que exige la base de datos: tablon/uuid.extension
// (mira el "check" de la columna imagen en supabase/tablas.txt).
const FORMATO_RUTA = /^[a-z0-9]{1,20}\/[0-9a-f-]{36}\.(png|jpg|jpeg|gif|webp)$/;

// ---------- 2. IMÁGENES: FUNCIONES ----------

// Comprueba la imagen elegida. Devuelve el texto del error,
// o una cadena vacía ('') si todo está bien.
function validarImagen(archivo) {
  // Object.hasOwn: ¿el tipo del archivo está en nuestra lista de EXTENSIONES?
  if (!Object.hasOwn(EXTENSIONES, archivo.type)) {
    return 'Formato no permitido. Usa PNG, JPG, GIF o WEBP.';
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return 'La imagen pesa más de 2 MB.';
  }
  return '';
}

// Sube la imagen al bucket, dentro de la carpeta del tablón,
// y devuelve su ruta (ej. "anime/3f2b...c.png").
async function subirImagen(archivo, tablon) {
  // crypto.randomUUID() genera un identificador aleatorio e irrepetible.
  // Así el nombre original del archivo (que puede decir cosas de ti,
  // como "foto_de_juan_perez.jpg") nunca llega al servidor.
  const ruta = `${tablon}/${crypto.randomUUID()}.${EXTENSIONES[archivo.type]}`;

  const { error } = await clienteSupabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { contentType: archivo.type });

  // Supabase no lanza errores: los devuelve en "error". Lo lanzamos
  // nosotros con throw para que lo capture el try/catch de quien llama.
  if (error) throw error;
  return ruta;
}

// Convierte la ruta guardada en la URL pública de la imagen.
function urlImagen(ruta) {
  // Nunca nos fiamos de lo que viene de la base de datos: si la ruta no
  // tiene el formato esperado, no cargamos nada.
  if (!FORMATO_RUTA.test(ruta)) return '';
  return clienteSupabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

// Rellena la <figure> de un mensaje con su imagen.
// Si el mensaje no tiene imagen (respuestas sin foto), quita la figure.
function ponerImagen(figura, ruta) {
  const url = ruta ? urlImagen(ruta) : '';
  if (!url) {
    figura.remove();
    return;
  }

  // El enlace apunta a la imagen: sin JavaScript (o con Ctrl+clic)
  // se abre en una pestaña nueva. imagenes.js cambia el clic normal
  // por "abrir en grande en el centro de la pantalla".
  figura.querySelector('a').href = url;

  const img = figura.querySelector('img');
  img.src = url;
  // loading="lazy": la imagen solo se descarga cuando vas a verla al hacer scroll
  img.loading = 'lazy';
}

// ---------- 3. MIS MENSAJES ("(Tú)") ----------
// En un sitio anónimo no hay cuentas, así que cada navegador recuerda
// los números de los mensajes que publicó. Con eso marcamos "(Tú)" y
// sabemos cuándo alguien te cita. Esta lista NUNCA sale de tu navegador:
// el servidor no sabe qué mensajes son de quién.

const CLAVE_MIS_MENSAJES = 'truechan-mis-mensajes';

// Guardamos como máximo los últimos 1000 números
const MAXIMO_MIS_MENSAJES = 1000;

// Lee la lista guardada y la devuelve como un Set (un conjunto:
// como un array, pero sin repetidos y con .has() para buscar rápido).
function leerMisMensajes() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_MIS_MENSAJES) ?? '[]');
    // Nunca nos fiamos de localStorage: solo aceptamos números enteros
    return new Set(Array.isArray(guardado) ? guardado.filter(Number.isSafeInteger) : []);
  } catch {
    return new Set();
  }
}

// Se lee una vez al cargar la página y se usa en todas las funciones de abajo
const misMensajes = leerMisMensajes();

// Apunta un mensaje recién publicado como "mío"
function guardarMiMensaje(id) {
  misMensajes.add(id);
  try {
    // [...conjunto] convierte el Set en array; slice(-1000) se queda
    // con los 1000 últimos
    const lista = [...misMensajes].slice(-MAXIMO_MIS_MENSAJES);
    localStorage.setItem(CLAVE_MIS_MENSAJES, JSON.stringify(lista));
  } catch {
    // Si no se puede guardar (modo privado...), simplemente no habrá "(Tú)"
  }
}

// ---------- 4. COMENTARIOS Y CITAS ----------

// Expresión regular de una cita: ">>" y de 1 a 15 cifras.
// La "g" (global) sirve para encontrar TODAS las citas de un texto.
const PATRON_CITA = />>(\d{1,15})/g;

// Devuelve los números que cita un comentario, sin repetir.
// Ejemplo: ">>5 hola >>7 >>5" → [5, 7]
function numerosCitados(texto) {
  // matchAll da cada coincidencia; c[1] es lo que hay dentro de los ( )
  const numeros = [...texto.matchAll(PATRON_CITA)].map((c) => Number(c[1]));
  return [...new Set(numeros)];
}

// Crea el enlace <a> de una cita ">>123".
//   opciones.idOP        → si la cita apunta al OP, le añadimos "(OP)"
//   opciones.enlaceBase  → página a la que lleva el enlace ('' = esta misma)
function crearEnlaceCita(numero, opciones = {}) {
  const enlace = document.createElement('a');
  enlace.className = 'cita';
  // #p123 = "salta al elemento con id='p123'" (cada mensaje lo tiene)
  enlace.href = `${opciones.enlaceBase ?? ''}#p${numero}`;

  let texto = `>>${numero}`;
  if (numero === opciones.idOP) texto += ' (OP)';
  // Si el mensaje citado es tuyo: alguien te está "tageando"
  if (misMensajes.has(numero)) texto += ' (Tú)';
  enlace.textContent = texto;

  return enlace;
}

// Añade "texto" dentro de "destino", convirtiendo cada >>123 en un enlace.
function anadirTextoConCitas(destino, texto, opciones) {
  // split con un grupo ( ) en la expresión regular conserva los trozos
  // que coinciden. Ejemplo: "hola >>12 qué tal" → ["hola ", ">>12", " qué tal"]
  const trozos = texto.split(/(>>\d{1,15})/);

  trozos.forEach((trozo) => {
    // Los trozos que empiezan por >> seguido de cifras son citas
    if (/^>>\d+$/.test(trozo)) {
      // slice(2) quita los ">>" y Number() lo pasa a número
      destino.append(crearEnlaceCita(Number(trozo.slice(2)), opciones));
    } else if (trozo) {
      // append() con un texto crea un nodo de texto: no interpreta HTML
      destino.append(trozo);
    }
  });
}

// Escribe el comentario línea a línea:
// - las líneas que empiezan por ">" van en verde (greentext)
// - pero ">>123" al principio NO es greentext: es una cita
// SEGURIDAD: usamos textContent / append(texto), NUNCA innerHTML.
// Si alguien escribe <script>...</script>, se mostrará como texto normal.
function pintarComentario(elemento, texto, opciones = {}) {
  const lineas = texto.split('\n');

  lineas.forEach((linea, indice) => {
    // Entre línea y línea añadimos un salto <br>
    if (indice > 0) {
      elemento.append(document.createElement('br'));
    }

    const esGreentext = linea.startsWith('>') && !/^>>\d/.test(linea);

    if (esGreentext) {
      const verde = document.createElement('span');
      verde.className = 'greentext';
      anadirTextoConCitas(verde, linea, opciones);
      elemento.append(verde);
    } else {
      anadirTextoConCitas(elemento, linea, opciones);
    }
  });
}

// Rellena la parte común de un mensaje (OP o respuesta) a partir de
// la plantilla ya copiada: nombre, fecha, número y comentario.
function rellenarMensaje(copia, mensaje, opciones = {}) {
  const nombre = copia.querySelector('.hilo-nombre');
  nombre.textContent = mensaje.nombre;

  // Si el mensaje es tuyo, "(Tú)" justo después del nombre.
  // after() inserta un elemento justo detrás de otro.
  if (misMensajes.has(mensaje.id)) {
    const marca = document.createElement('span');
    marca.className = 'hilo-tu';
    marca.textContent = '(Tú)';
    nombre.after(marca);
  }

  // Si este mensaje cita alguno de los tuyos, lo resaltamos:
  // es alguien que te ha respondido. some() = "¿alguno cumple...?"
  if (numerosCitados(mensaje.comentario).some((n) => misMensajes.has(n))) {
    copia.querySelector('.hilo').classList.add('te-cita');
  }

  const fecha = copia.querySelector('.hilo-fecha');
  fecha.dateTime = mensaje.creado_en;  // formato máquina (atributo datetime)
  fecha.textContent = new Date(mensaje.creado_en).toLocaleString('es');  // formato humano

  // El número lo pone la base de datos (el contador compartido)
  copia.querySelector('.hilo-numero').textContent = `N.º ${mensaje.id}`;

  pintarComentario(copia.querySelector('.hilo-comentario'), mensaje.comentario, opciones);
}

// ---------- 5. VENTANAS FLOTANTES (vistas previas) ----------
// hayRaton lo usan imagenes.js y citas.js; colocarFlotante() solo
// citas.js (la vista previa de imagen va centrada con CSS).

// Separación (en píxeles) entre el cursor, la ventana flotante y los bordes
const MARGEN_FLOTANTE = 16;

// ¿El dispositivo tiene ratón? En móviles no existe "pasar por encima",
// así que allí no mostramos vistas previas.
const hayRaton = window.matchMedia('(hover: hover) and (pointer: fine)');

// Coloca "elemento" (que tiene position: fixed) junto al cursor (x, y),
// sin salirse de la ventana.
function colocarFlotante(elemento, x, y) {
  const anchoVentana = window.innerWidth;
  const altoVentana = window.innerHeight;

  // Si el cursor está en la mitad izquierda, va a su derecha (y al revés).
  // Así siempre usamos el lado con más espacio.
  const aLaDerecha = x < anchoVentana / 2;
  const espacio = aLaDerecha
    ? anchoVentana - x - MARGEN_FLOTANTE * 2
    : x - MARGEN_FLOTANTE * 2;
  elemento.style.maxWidth = `${espacio}px`;

  // offsetWidth / offsetHeight = tamaño real con el que se está dibujando
  const ancho = elemento.offsetWidth;
  const alto = elemento.offsetHeight;

  const izquierda = aLaDerecha
    ? x + MARGEN_FLOTANTE
    : x - MARGEN_FLOTANTE - ancho;

  // Centrado verticalmente en el cursor, pero Math.min / Math.max lo
  // "sujetan" para que no se salga ni por arriba ni por abajo.
  const arriba = Math.max(
    MARGEN_FLOTANTE,
    Math.min(y - alto / 2, altoVentana - alto - MARGEN_FLOTANTE),
  );

  elemento.style.left = `${izquierda}px`;
  elemento.style.top = `${arriba}px`;
}
