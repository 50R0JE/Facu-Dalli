// Junta en www/ solo lo que usa la app (sin landing, supabase, capturas, etc.), para que
// Capacitor lo empaquete en las apps de Android y iPhone. La web (GitHub Pages) no usa esto.
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
const OUT = "www";
const KEEP = ["index.html", "manifest.json", "sw.js", "install.js", "app", "css", "brand", "vendor",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of KEEP) if (existsSync(f)) cpSync(f, `${OUT}/${f}`, { recursive: true });
console.log("www/ listo:", KEEP.filter(existsSync).join(", "));
