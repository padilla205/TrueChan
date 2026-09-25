/* =========================================================
   HILO — página de un hilo: el OP, sus respuestas y el
   formulario para responder. Se abre como hilo.html?id=123
   Usa "clienteSupabase" (js/supabase.js) y las funciones de js/comun.js.
   ========================================================= */

// ---------- 1. ¿QUÉ HILO HAY QUE MOSTRAR? ----------

// URLSearchParams lee la parte "?id=123" de la dirección.
const textoId = new URLSearchParams(window.location.search).get('id');

// SEGURIDAD: la URL la puede escribir cualquiera. Solo aceptamos cifras
// (de 1 a 15, lo que cabe en un número de JavaScript sin perder precisión).
// Si no es válido, idHilo vale null.
const idHilo = /^\d{1,15}$/.test(textoId ?? '') ? Number(textoId) : null;

// Aquí guardaremos el tablón del hilo ("anime"...) y el OP cuando los
// carguemos. "let" porque cambian después; "const" no se podría reasignar.
let tablonHilo = null;
let opHilo = null;

// ---------- 2. REFERENCIAS A ELEMENTOS DEL HTML ----------
const estado = document.getElementById('estado-hilo');
const contenedorOP = document.getElementById('hilo-op');
const listaRespuestas = document.getElementById('lista-respuestas');
const cajaResponder = document.getElementById('caja-responder');
const formulario = document.getElementById('form-respuesta');
const botonPublicar = formulario.querySelector('button[type="submit"]');
const mensajeError = document.getElementById('form-error');
const plantilla = document.getElementById('plantilla-mensaje');

// ---------- 3. LEER Y CREAR EN SUPABASE ----------

// Pide el hilo (el OP). tablones(nombre, descripcion) trae también los
// datos de su tablón, gracias a la clave foránea hilos.tablon → tablones.id
async function cargarHilo() {
  const { data, error } = await clienteSupabase
    .from('hilos')
    .select('id, tablon, nombre, asunto, comentario, imagen, creado_en, tablones(nombre, descripcion)')
    .eq('id', idHilo)
    .maybeSingle();  // un solo resultado, o null si no existe

  if (error) throw error;
  return data;
}

// Pide las respuestas del hilo, de la más antigua a la más nueva
async function cargarRespuestas() {
  const { data, error } = await clienteSupabase
    .from('respuestas')
    .select('id, nombre, comentario, imagen, creado_en')
    .eq('hilo_id', idHilo)
    .order('creado_en', { ascending: true });

  if (error) throw error;
  return data;
}

// Guarda una respuesta y devuelve su número (id).
// .select('id').single() = "después de insertar, devuélveme el id nuevo"
async function crearRespuesta(respuesta) {
  const { data, error } = await clienteSupabase
    .from('respuestas')
    .insert(respuesta)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ---------- 4. PINTAR ----------

// Crea el <article> de un mensaje (OP o respuesta) a partir de la plantilla.
function crearElementoMensaje(mensaje, esRespuesta) {
  const copia = plantilla.content.cloneNode(true);
  const articulo = copia.querySelector('.hilo');

  // id="p123": los enlaces #p123 y las citas >>123 saltan aquí
  articulo.id = `p${mensaje.id}`;
  if (esRespuesta) articulo.classList.add('respuesta');

  ponerImagen(copia.querySelector('.hilo-imagen'), mensaje.imagen);

  // Solo el OP tiene asunto (las respuestas no tienen esa columna)
  copia.querySelector('.hilo-asunto').textContent = mensaje.asunto ?? '';

  // En esta página las citas saltan dentro de la misma página (enlaceBase vacío)
  rellenarMensaje(copia, mensaje, { idOP: idHilo });

  // El número es un enlace permanente a este mensaje
  copia.querySelector('.hilo-numero').href = `#p${mensaje.id}`;

  // Botón [Responder]: escribe >>número en el formulario
  const boton = copia.querySelector('.boton-responder');
  // aria-label = nombre completo para lectores de pantalla ("Responder" a secas
  // repetido en cada mensaje no diría a cuál)
  boton.setAttribute('aria-label', `Responder al mensaje N.º ${mensaje.id}`);
  boton.addEventListener('click', () => citar(mensaje.id));

  return copia;
}

// Pinta la cabecera de la página con los datos del tablón del hilo
function pintarCabecera(hilo) {
  tablonHilo = hilo.tablon;

  // El color del tablón: la misma clase que usan anime/index.html, etc.
  // (la base de datos ya garantiza que tablon solo tiene a-z y 0-9)
  document.body.classList.add(`tablero-${hilo.tablon}`);

  const urlTablon = `${hilo.tablon}/index.html`;
  document.getElementById('banner-nombre').textContent = hilo.tablones.nombre;
  document.getElementById('banner-lema').textContent = hilo.tablones.descripcion;

  const migaTablon = document.getElementById('migas-tablon');
  migaTablon.href = urlTablon;
  migaTablon.textContent = hilo.tablon;
  document.getElementById('migas-hilo').textContent = `Hilo N.º ${hilo.id}`;
  document.getElementById('volver-tablon').href = urlTablon;

  // Marca el tablón actual en la barra de arriba
  document.querySelector(`.barra-tablones a[data-tablon="${hilo.tablon}"]`)
    ?.setAttribute('aria-current', 'page');

  // Título de la pestaña: el asunto, o el principio del comentario
  const resumen = hilo.asunto || hilo.comentario.slice(0, 40);
  document.title = `${hilo.tablones.nombre} - ${resumen} - TrueChan`;
}

// Vuelve a dibujar todas las respuestas (y la lista de quién respondió a quién)
function pintarRespuestas(respuestas) {
  listaRespuestas.replaceChildren();
  respuestas.forEach((respuesta) => {
    listaRespuestas.append(crearElementoMensaje(respuesta, true));
  });
  pintarRespondidoPor([opHilo, ...respuestas]);
}

// Debajo de cada mensaje, "Respuestas: >>7 >>9" con los mensajes que lo citan.
// Recibe TODOS los mensajes del hilo ([...a] "esparce" un array dentro de otro).
function pintarRespondidoPor(mensajes) {
  // Borramos las listas anteriores: el OP no se vuelve a dibujar al
  // publicar una respuesta, y si no, su lista saldría repetida
  document.querySelectorAll('.hilo-respondido').forEach((lista) => lista.remove());

  // Map = diccionario. Aquí: número citado → [números que lo citan]
  const citadoPor = new Map();
  mensajes.forEach((mensaje) => {
    numerosCitados(mensaje.comentario).forEach((numero) => {
      if (!citadoPor.has(numero)) citadoPor.set(numero, []);
      citadoPor.get(numero).push(mensaje.id);
    });
  });

  citadoPor.forEach((quienes, numero) => {
    const articulo = document.getElementById(`p${numero}`);
    if (!articulo) return;  // cita a un mensaje de otro hilo

    const lista = document.createElement('p');
    lista.className = 'hilo-respondido';
    lista.append('Respuestas: ');
    quienes.forEach((id) => {
      lista.append(crearEnlaceCita(id, { idOP: idHilo }), ' ');
    });
    articulo.querySelector('.hilo-contenido').append(lista);
  });
}

// Carga todo y lo muestra. Se llama al abrir la página.
async function mostrarHilo() {
  if (idHilo === null) {
    estado.textContent = 'Este enlace no es válido.';
    return;
  }

  let hilo;
  let respuestas;
  try {
    // Promise.all lanza las dos peticiones A LA VEZ y espera a ambas:
    // más rápido que esperar una y luego la otra.
    [hilo, respuestas] = await Promise.all([cargarHilo(), cargarRespuestas()]);
  } catch (error) {
    console.error(error);
    estado.textContent = 'No se pudo cargar el hilo. Recarga la página.';
    return;
  }

  if (!hilo) {
    estado.textContent = 'Este hilo no existe (o fue borrado).';
    document.getElementById('banner-nombre').textContent = 'Hilo no encontrado';
    return;
  }

  estado.hidden = true;
  opHilo = hilo;
  pintarCabecera(hilo);
  contenedorOP.append(crearElementoMensaje(hilo, false));
  pintarRespuestas(respuestas);
  cajaResponder.hidden = false;

  // Si la dirección trae #p123 (por ejemplo, desde una cita), saltamos a
  // ese mensaje. El navegador no lo hace solo porque al abrir la página
  // los mensajes todavía no existían.
  irAlMensaje(window.location.hash);
}

// Hace scroll hasta el mensaje "#p123" (si existe)
function irAlMensaje(ancla) {
  if (!ancla) return;
  // slice(1) quita la "#"; getElementById es seguro con cualquier texto
  document.getElementById(ancla.slice(1))?.scrollIntoView({ block: 'center' });
}

// ---------- 5. CITAR ([Responder]) ----------

// Escribe ">>123" + salto de línea donde esté el cursor del comentario
function citar(numero) {
  const campo = formulario.comentario;
  // setRangeText sustituye el texto seleccionado (o inserta en el cursor);
  // 'end' deja el cursor justo después de lo insertado
  campo.setRangeText(`>>${numero}\n`, campo.selectionStart, campo.selectionEnd, 'end');
  // focus() pone el cursor en el campo y hace scroll hasta él
  campo.focus();
}

// ---------- 6. ENVÍO DE UNA RESPUESTA ----------

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensajeError.textContent = '';

  const nombre = formulario.nombre.value.trim() || 'Anónimo';
  const comentario = formulario.comentario.value.trim();
  const archivo = formulario.imagen.files[0];  // puede no haber (es opcional)

  if (!comentario) {
    mensajeError.textContent = 'Escribe un comentario.';
    return;
  }
  // Solo validamos la imagen si han elegido una
  if (archivo) {
    const errorImagen = validarImagen(archivo);
    if (errorImagen) {
      mensajeError.textContent = errorImagen;
      return;
    }
  }

  botonPublicar.disabled = true;  // evita publicar dos veces con doble clic

  let idNuevo;
  try {
    // Si hay imagen, se sube primero a la carpeta del tablón del hilo
    const imagen = archivo ? await subirImagen(archivo, tablonHilo) : null;
    idNuevo = await crearRespuesta({ hilo_id: idHilo, nombre, comentario, imagen });
    // Lo apuntamos como nuestro para que salga "(Tú)"
    guardarMiMensaje(idNuevo);
  } catch (error) {
    console.error(error);
    mensajeError.textContent = 'No se pudo publicar la respuesta. Inténtalo de nuevo.';
    return;
  } finally {
    botonPublicar.disabled = false;
  }

  formulario.reset();

  // Recargamos las respuestas (así también vemos las que otros hayan
  // escrito mientras tanto) y saltamos a la nuestra
  try {
    pintarRespuestas(await cargarRespuestas());
    irAlMensaje(`#p${idNuevo}`);
  } catch (error) {
    console.error(error);
    mensajeError.textContent = 'Respuesta publicada. Recarga la página para verla.';
  }
});

// ---------- 7. ARRANQUE ----------
mostrarHilo();
