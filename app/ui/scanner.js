// Escáner de código de barras para cargar productos envasados en Comida.
//
// Usa la cámara trasera. En los navegadores que traen lector propio (BarcodeDetector:
// Chrome en Android) se usa ese; en los que no (Safari en iPhone) se carga ZXing
// (vendor/zxing.min.js, licencia MIT), solo la primera vez que se abre el escáner.
// Si no hay cámara o el usuario no da permiso, queda el campo para escribir el número.

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
let zxingLoading = null;
let session = null; // escaneo activo: { stream, stop() }

function loadZXing(){
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (!zxingLoading){
    zxingLoading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "vendor/zxing.min.js";
      s.onload = () => res(window.ZXing);
      s.onerror = () => { zxingLoading = null; rej(new Error("No se pudo cargar el lector de códigos")); };
      document.head.appendChild(s);
    });
  }
  return zxingLoading;
}

async function nativeDetector(){
  if (!("BarcodeDetector" in window)) return null;
  try{
    const ok = await window.BarcodeDetector.getSupportedFormats();
    const f = FORMATS.filter(x => ok.indexOf(x) >= 0);
    return f.length ? new window.BarcodeDetector({ formats: f }) : null;
  }catch(e){ return null; }
}

export function closeScanner(){
  if (session){ try{ session.stop(); }catch(e){} session = null; }
  const host = document.getElementById("scanHost"); if (host) host.innerHTML = "";
  document.body.classList.remove("scan-open");
}

// onCode(código) se llama una sola vez, con el primer código leído o escrito a mano.
export async function openScanner(onCode){
  closeScanner();
  const host = document.getElementById("scanHost"); if (!host) return;
  document.body.classList.add("scan-open");
  host.innerHTML =
    '<div class="scan-wrap" role="dialog" aria-label="Escanear código de barras">' +
      '<div class="scan-top"><span>Escaneá el código de barras</span><button class="scan-x" data-action="scan-close" aria-label="Cerrar">✕</button></div>' +
      '<div class="scan-view"><video id="scanVideo" playsinline muted autoplay></video><div class="scan-frame" aria-hidden="true"></div><div class="scan-line" aria-hidden="true"></div></div>' +
      '<div class="scan-msg" id="scanMsg">Abriendo la cámara…</div>' +
      '<div class="scan-manual"><input id="scanCode" class="form-input" type="text" inputmode="numeric" placeholder="Número del código" aria-label="O escribí el número del código">' +
      '<button class="ctrl ghost" data-action="scan-manual">Buscar</button></div>' +
    '</div>';
  const msg = t => { const m = document.getElementById("scanMsg"); if (m) m.textContent = t; };
  let done = false;
  const finish = code => { if (done) return; done = true; closeScanner(); onCode(String(code)); };
  session = { stream: null, stop(){ if (this.stream) this.stream.getTracks().forEach(t => t.stop()); if (this.zx) try{ this.zx.reset(); }catch(e){} this.stopped = true; }, finish };

  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  }catch(e){
    msg("No pudimos usar la cámara (permiso denegado o no disponible). Escribí el número que está debajo de las barras.");
    return;
  }
  if (!session || session.stopped){ stream.getTracks().forEach(t => t.stop()); return; }
  session.stream = stream;
  const video = document.getElementById("scanVideo");
  video.srcObject = stream;
  try{ await video.play(); }catch(e){}
  msg("Apuntá al código de barras del paquete");

  const det = await nativeDetector();
  if (det){
    const tick = async () => {
      if (!session || session.stopped || done) return;
      try{
        const codes = await det.detect(video);
        if (codes && codes.length){ if (navigator.vibrate) navigator.vibrate(60); finish(codes[0].rawValue); return; }
      }catch(e){}
      setTimeout(tick, 200);
    };
    tick();
    return;
  }
  try{
    const ZX = await loadZXing();
    if (!session || session.stopped) return;
    const hints = new Map();
    hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E]);
    const reader = new ZX.BrowserMultiFormatReader(hints, 250);
    session.zx = reader;
    reader.decodeFromStream(stream, video, (result) => {
      if (result && !done){ if (navigator.vibrate) navigator.vibrate(60); finish(result.getText()); }
    });
  }catch(e){
    msg("No se pudo iniciar el lector. Escribí el número del código.");
  }
}

// Botón "Buscar" del campo manual.
export function scannerManualCode(){
  const i = document.getElementById("scanCode");
  const code = i ? i.value.replace(/\D/g, "") : "";
  if (code.length < 6){ if (i) i.focus(); return; }
  if (session && session.finish) session.finish(code);
}
