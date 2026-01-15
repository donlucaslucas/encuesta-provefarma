
// === Configuración ===
// Actualizado con tu nueva ID de implementación
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx3fdCKRqHQcqykPniodiWCOsjTDmPKxEZnQV3jRtkL-Raiq2TM1tN9Rx7ZbsAUMvohBw/exec';

// El origen que el backend validará (debe coincidir con la configuración del Code.gs)
const ALLOWED_ORIGIN = 'https://encuestasonlineweb.github.io'; 

// === Referencias DOM ===
const form = document.getElementById('encuestaForm');
const statusEl = document.getElementById('status');
const rutInput = document.getElementById('rut');
const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

// === Utilidades RUT ===
function cleanRut(rut) {
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

function formatRut(rut) {
  rut = cleanRut(rut);
  if (rut.length <= 1) return rut;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let out = '';
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    out = cuerpo[i] + out;
    count++;
    if (count === 3 && i !== 0) {
      out = '.' + out;
      count = 0;
    }
  }
  return `${out}-${dv}`;
}

function dvRut(cuerpo) {
  let suma = 0, multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const res = 11 - (suma % 11);
  if (res === 11) return '0';
  if (res === 10) return 'K';
  return String(res);
}

function isValidRut(rut) {
  rut = cleanRut(rut);
  if (rut.length < 2) return false;
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  if (!/^\d+$/.test(cuerpo)) return false;
  return dvRut(cuerpo) === dv;
}

// === Helpers UI ===
function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#cc1f1a' : '#0b6e4f';
}

function disableSubmit(disabled) {
  if (submitBtn) submitBtn.disabled = disabled;
}

// === Formateo del RUT mientras se escribe ===
if (rutInput) {
  rutInput.addEventListener('input', () => {
    const before = rutInput.value;
    const pos = rutInput.selectionStart;
    const formatted = formatRut(before);
    rutInput.value = formatted;
    rutInput.classList.remove('is-invalid');
    setStatus('');
    try {
      const delta = formatted.length - before.length;
      const newPos = Math.max(0, (pos || 0) + delta);
      rutInput.setSelectionRange(newPos, newPos);
    } catch (_) {}
  });
}

// === Envío del formulario ===
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('Enviando…');
    disableSubmit(true);

    // Notas
    const terreno = document.getElementById('terreno')?.value || '';
    const callcenter = document.getElementById('callcenter')?.value || '';
    const despacho = document.getElementById('despacho')?.value || '';
    const comentario = document.getElementById('comentario')?.value.trim() || '';

    if (!terreno || !callcenter || !despacho) {
      setStatus('Por favor, completa todas las notas (1 a 7).', true);
      disableSubmit(false);
      return;
    }

    // Validación RUT
    const rutVal = rutInput ? rutInput.value : '';
    if (!isValidRut(rutVal)) {
      if (rutInput) {
        rutInput.classList.add('is-invalid');
        rutInput.focus();
      }
      setStatus('RUT inválido. Revisa el dígito verificador.', true);
      disableSubmit(false);
      return;
    }

    // Payload para el Backend
    const payload = {
      terreno,
      callcenter,
      despacho,
      comentario,
      rut: cleanRut(rutVal),
      rut_formateado: formatRut(rutVal),
      origin: ALLOWED_ORIGIN, 
      userAgent: navigator.userAgent || ''
    };

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante para evitar problemas de CORS en algunos navegadores
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      });

      // Nota: Con 'no-cors', no podemos leer la respuesta JSON directamente.
      // Pero si la petición llega al script de Google, se ejecutará.
      // Para confirmar éxito, solemos asumir que si no hay error de red, se envió.
      
      setStatus('¡Gracias! Tus respuestas fueron registradas.');
      form.reset();
      if (rutInput) rutInput.classList.remove('is-invalid');

    } catch (err) {
      console.error(err);
      setStatus('Ocurrió un error de red. Intenta nuevamente.', true);
    } finally {
      disableSubmit(false);
    }
  });
}




