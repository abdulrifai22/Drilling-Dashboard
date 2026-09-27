// Parses uploaded Excel files off the main/render thread. A consolidated multi-year,
// multi-contractor "Big Data" file can take long enough for XLSX.read() to run that
// the renderer stops responding to Chromium's input/paint loop, which Electron then
// reports as "Aplikasi tidak merespons" (see main.js's 'unresponsive' handler). Doing
// the parse here keeps the window responsive while it works.
importScripts('./xlsx.lib.js');

self.onmessage = function (e) {
  try {
    const buffer = e.data && e.data.buffer;
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    self.postMessage({ ok: true, workbook });
  } catch (err) {
    self.postMessage({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
};
