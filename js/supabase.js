/* =========================================================
   SUPABASE — conexión con la base de datos
   Este archivo crea el "cliente": el objeto que usan los demás
   scripts para hablar con Supabase (leer hilos, subir imágenes...).

   Necesita que ANTES se haya cargado la librería supabase-js
   (el <script> del CDN en el HTML), que crea la variable global
   "supabase" con la función createClient().
   ========================================================= */

// Dirección de TU proyecto en Supabase
const SUPABASE_URL = 'https://jqquwqbhvgrdwqgzadft.supabase.co';

// Clave PÚBLICA ("publishable"). Es normal que esté a la vista en el
// código: cualquiera puede verla desde el navegador. Lo que protege los
// datos no es esta clave, sino los permisos (grant) y las reglas RLS
// de tablas.txt.
// SEGURIDAD: NUNCA pongas aquí la clave "secret" / "service_role".
// Esa se salta RLS y daría control total de la base de datos a cualquiera.
const SUPABASE_CLAVE = 'sb_publishable_xp02S_js-7wnaTKb7YARjg_-1Tdqr-t';

// El cliente que usarán los demás scripts (por ejemplo tablon.js).
// Una "const" declarada fuera de cualquier función en un <script> normal
// se puede usar desde los scripts que se cargan después.
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_CLAVE);
