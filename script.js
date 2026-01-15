
// === Configuración ===
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxWs2psT6STx9F5sUPgIicUqYvPqypVEJLWn_4GEhUfMGmc5E7cTted7jMzLYuqMuHncg/exec';
const ALLOWED_ORIGIN = 'https://encuestasonlineweb.github.io'; // dominio base de tu GitHub Pages

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
  // Agrupar cuerpo en miles con puntos
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
    // Mejor esfuerzo para mantener el caret
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

    // Honeypot anti-spam (si existe)
    const hp = form.querySelector('#empresa');
    if (hp && hp.value.trim() !== '') {
      setStatus('Error de validación.', true);
      disableSubmit(false);
      return;
    }

    // Validaciones de notas requeridas
    const terrenoEl = document.getElementById('terreno');
    const callcenterEl = document.getElementById('callcenter');
    const despachoEl = document.getElementById('despacho');
    const comentarioEl = document.getElementById('comentario');

    const terreno = terrenoEl ? terrenoEl.value : '';
    const callcenter = callcenterEl ? callcenterEl.value : '';
    const despacho = despachoEl ? despachoEl.value : '';
    const comentario = comentarioEl ? comentarioEl.value.trim() : '';

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
      setStatus('RUT inválido. Revisa el dígito verificador y el formato sugerido.', true);
      disableSubmit(false);
      return;
    }

    // Payload alineado con el backend (GAS)
    const payload = {
      terreno,
      callcenter,
      despacho,
      comentario,
      rut: cleanRut(rutVal),           // sin puntos, DV al final
      rut_formateado: formatRut(rutVal),
      origin: ALLOWED_ORIGIN,          // validación cruzada en el backend
      userAgent: navigator.userAgent || ''
    };

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // evitamos headers extra para no complicar CORS
        },
        body: JSON.stringify(payload)
      });

      // Apps Script habitualmente responde 200; interpretamos el JSON {ok: true/false}
      const data = await res.json().catch(() => ({}));

      if (data && data.ok) {
        setStatus('¡Gracias! Tus respuestas fueron registradas.');
        form.reset();
        if (rutInput) rutInput.classList.remove('is-invalid');
      } else {
        const msg = (data && data.error) ? `Error: ${data.error}` : 'No se pudo registrar la respuesta.';
        setStatus(msg, true);
      }
    } catch (err) {
      console.error(err);
      setStatus('Ocurrió un error de red. Intenta nuevamente en unos segundos.', true);
    } finally {
      disableSubmit(false);
    }
  });
}

