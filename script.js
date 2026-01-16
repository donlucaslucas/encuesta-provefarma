// URL de tu Web App (Verifica que sea la que termina en ...9_cjg/exec)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz1nofMJ95SIA9TLS1937DTfR5b0MJCZmx0KEwEIOl11povNbyDtuwbPTT35bYOY9_cjg/exec';
const ALLOWED_ORIGIN = 'https://encuestasonlineweb.github.io';

const form = document.getElementById('encuestaForm');
const statusEl = document.getElementById('status');
const rutInput = document.getElementById('rut');

// --- Utilidades de RUT ---
function cleanRut(rut) { return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase(); }

function formatRut(rut) {
  rut = cleanRut(rut);
  if (rut.length <= 1) return rut;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let out = '';
  for (let i = cuerpo.length - 1, count = 0; i >= 0; i--, count++) {
    if (count === 3) { out = '.' + out; count = 0; }
    out = cuerpo[i] + out;
  }
  return `${out}-${dv}`;
}

function isValidRut(rut) {
  rut = cleanRut(rut);
  if (rut.length < 2) return false;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  let suma = 0, multi = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multi;
    multi = multi === 7 ? 2 : multi + 1;
  }
  const esperado = 11 - (suma % 11);
  const dvEsperado = esperado === 11 ? '0' : esperado === 10 ? 'K' : String(esperado);
  return dv === dvEsperado;
}

// --- Eventos de Interfaz ---
if (rutInput) {
  rutInput.addEventListener('input', (e) => {
    e.target.value = formatRut(e.target.value);
    e.target.classList.remove('is-invalid');
  });
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validaciones previas
    const rutVal = rutInput.value;
    if (!isValidRut(rutVal)) {
      statusEl.textContent = 'RUT inválido. Verifique el dígito verificador.';
      statusEl.style.color = '#cc1f1a';
      rutInput.classList.add('is-invalid');
      return;
    }

    statusEl.textContent = 'Enviando respuestas...';
    statusEl.style.color = '#233044';
    const btn = form.querySelector('button');
    btn.disabled = true;

    // Preparamos el objeto de datos
    const payload = {
      terreno: document.getElementById('terreno').value,
      callcenter: document.getElementById('callcenter').value,
      despacho: document.getElementById('despacho').value,
      comentario: document.getElementById('comentario').value,
      rut: cleanRut(rutVal),
      rut_formateado: rutVal,
      origin: ALLOWED_ORIGIN,
      userAgent: navigator.userAgent
    };

    try {
      // Usamos 'text/plain' para evitar problemas de CORS con Google Apps Script
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante para Google Apps Script
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      // Como usamos no-cors, no podemos leer la respuesta, pero si llega aquí
      // es que el navegador logró enviar el paquete.
      statusEl.textContent = '¡Gracias! Tus respuestas fueron registradas.';
      statusEl.style.color = '#0b6e4f';
      form.reset();
      rutInput.classList.remove('is-invalid');
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error de conexión. Intente nuevamente.';
      statusEl.style.color = '#cc1f1a';
    } finally {
      btn.disabled = false;
    }
  });
}



