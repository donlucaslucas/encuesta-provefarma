const GAS_URL = 'https://script.google.com/macros/s/AKfycbx3fdCKRqHQcqykPniodiWCOsjTDmPKxEZnQV3jRtkL-Raiq2TM1tN9Rx7ZbsAUMvohBw/exec';
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

// --- Eventos ---
rutInput.addEventListener('input', (e) => {
  const pos = e.target.selectionStart;
  const val = e.target.value;
  e.target.value = formatRut(val);
  e.target.classList.remove('is-invalid');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Enviando...';
  statusEl.style.color = 'var(--text)';
  
  const btn = form.querySelector('button');
  btn.disabled = true;

  const rutVal = rutInput.value;
  if (!isValidRut(rutVal)) {
    statusEl.textContent = 'RUT inválido. Verifique el formato.';
    statusEl.style.color = 'var(--error)';
    rutInput.classList.add('is-invalid');
    btn.disabled = false;
    return;
  }

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
    // Enviamos como text/plain para evitar errores de CORS preflight
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    // Con no-cors no podemos leer la respuesta, pero si llega aquí sin error de red, usualmente es éxito
    statusEl.textContent = '¡Gracias! Tus respuestas fueron registradas.';
    statusEl.style.color = 'var(--success)';
    form.reset();
  } catch (err) {
    statusEl.textContent = 'Error de conexión. Intente más tarde.';
    statusEl.style.color = 'var(--error)';
  } finally {
    btn.disabled = false;
  }
});




