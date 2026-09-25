/* =========================================================
   TABLÓN — lógica de un tablón (crear y mostrar hilos)
   Los hilos se guardan en Supabase (tabla "hilos") y las imágenes
   en el bucket "imagenes". Así todos los visitantes ven lo mismo.
   Usa "clienteSupabase" (js/supabase.js) y las funciones de js/comun.js.
   ========================================================= */

// ---------- 1. CONFIGURACIÓN ----------

// Leemos data-tablon="anime" del <body>. dataset convierte data-* en propiedades.
const idTablon = document.body.dataset.tablon;

// Cuántos hilos mostramos como máximo (los de actividad más reciente)
const LIMITE_HILOS = 50;

// ---------- 2. REFERENCIAS A ELEMENTOS DEL HTML ----------
const formulario = document.getElementById('form-hilo');
const botonPublicar = formulario.querySelector('button[type="submit"]');
const mensajeError = document.getElementById('form-error');
const listaHilos = document.getElementById('lista-hilos');
const avisoSinHilos = document.getElementById('sin-hilos');
const plantilla = document.getElementById('plantilla-hilo');

// ---------- 3. LEER Y CREAR HILOS EN SUPABASE ----------

// Pide a Supabase los hilos de este tablón. Es "async" porque la respuesta
// viaja por internet y tarda: "await" espera a que llegue sin congelar la página.
async function cargarHilos() {
  // Se lee casi como una frase: "de la tabla hilos, selecciona estas columnas,
  // donde tablon sea igual a idTablon, ordenadas por último bump (más reciente
  // primero), como máximo 50".
  // respuestas(count) = "y cuántas respuestas tiene cada hilo". Supabase lo
  // sabe gracias a la clave foránea respuestas.hilo_id → hilos.id
  const { data, error } = await clienteSupabase
    .from('hilos')
    .select('id, nombre, asunto, comentario, imagen, creado_en, respuestas(count)')
    .eq('tablon', idTablon)
    .order('ultimo_bump', { ascending: false })
    .limit(LIMITE_HILOS);

  if (error) throw error;
  return data;
}

// Guarda un hilo nuevo en la tabla y devuelve su número (id).
// Solo enviamos las columnas que la base de datos nos deja escribir
// (id, fechas y bump los pone el servidor).
// .select('id').single() = "después de insertar, devuélveme el id nuevo"
async function crearHilo(hilo) {
  const { data, error } = await clienteSupabase
    .from('hilos')
    .insert(hilo)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ---------- 4. PINTAR LOS HILOS ----------

// Crea el <article> de UN hilo a partir de la plantilla y lo devuelve.
function crearElementoHilo(hilo) {
  // cloneNode(true) copia la plantilla con todo lo que tiene dentro
  const copia = plantilla.content.cloneNode(true);

  // Dirección de la página del hilo. hilo.id es un número (lo pone la
  // base de datos), así que es seguro meterlo en la URL.
  const urlHilo = `../hilo.html?id=${hilo.id}`;

  // id="p123": permite enlazar a este mensaje con #p123
  copia.querySelector('.hilo').id = `p${hilo.id}`;

  ponerImagen(copia.querySelector('.hilo-imagen'), hilo.imagen);

  // El asunto es opcional: si es null ponemos texto vacío ("??" = "si es null, usa esto")
  copia.querySelector('.hilo-asunto').textContent = hilo.asunto ?? '';

  // Las citas >>123 de este hilo llevan a su página
  rellenarMensaje(copia, hilo, { idOP: hilo.id, enlaceBase: urlHilo });

  copia.querySelector('.boton-responder').href = urlHilo;

  // Supabase devuelve el recuento así: respuestas: [{ count: 3 }]
  const total = hilo.respuestas[0]?.count ?? 0;
  copia.querySelector('.hilo-resumen').textContent =
    total === 1 ? '1 respuesta' : `${total} respuestas`;

  return copia;
}

// Descarga los hilos, vacía la lista y los vuelve a pintar.
async function mostrarHilos() {
  let hilos;
  try {
    hilos = await cargarHilos();
  } catch (error) {
    // Sin conexión, Supabase caído... Avisamos en vez de dejar la página rota.
    // console.error lo muestra en la consola del navegador (F12) para depurar.
    console.error(error);
    avisoSinHilos.textContent = 'No se pudieron cargar los hilos. Recarga la página.';
    avisoSinHilos.hidden = false;
    return;
  }

  // replaceChildren() sin argumentos borra todo lo que había dentro
  listaHilos.replaceChildren();
  hilos.forEach((hilo) => listaHilos.append(crearElementoHilo(hilo)));

  // hidden oculta el aviso si hay al menos un hilo
  avisoSinHilos.hidden = hilos.length > 0;
}

// ---------- 5. ENVÍO DEL FORMULARIO ----------

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
  // Son para dar mensajes claros; la seguridad real está en la base de datos,
  // porque cualquiera puede saltarse este JavaScript.
  if (!comentario) {
    mensajeError.textContent = 'Escribe un comentario.';
    return;
  }
  if (!archivo) {
    mensajeError.textContent = 'Para crear un hilo necesitas una imagen.';
    return;
  }
  const errorImagen = validarImagen(archivo);
  if (errorImagen) {
    mensajeError.textContent = errorImagen;
    return;
  }

  // Desactivamos el botón mientras se publica: así un doble clic
  // no crea el hilo dos veces.
  botonPublicar.disabled = true;

  try {
    // Primero la imagen (necesitamos su ruta) y después el hilo
    const imagen = await subirImagen(archivo, idTablon);
    const idNuevo = await crearHilo({
      tablon: idTablon,
      nombre,
      asunto: asunto || null,  // asunto vacío → null (sin asunto)
      comentario,
      imagen,
    });
    // Lo apuntamos como nuestro para que salga "(Tú)"
    guardarMiMensaje(idNuevo);
  } catch (error) {
    console.error(error);
    mensajeError.textContent = 'No se pudo publicar el hilo. Inténtalo de nuevo.';
    return;
  } finally {
    // "finally" se ejecuta SIEMPRE, haya ido bien o mal:
    // volvemos a activar el botón en los dos casos.
    botonPublicar.disabled = false;
  }

  formulario.reset();  // vacía el formulario
  await mostrarHilos();
});

// ---------- 6. ARRANQUE ----------
// Al cargar la página, pintamos los hilos que haya en Supabase.
mostrarHilos();
