const fs = require('fs');
const path = require('path');

const MAX_LOG_BYTES = 2 * 1024 * 1024; // 2MB cap, log dipangkas kalau melebihi ini

let logFilePath = null;

function init(userDataPath) {
  const logDir = path.join(userDataPath, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, 'app.log');
  trimIfTooBig();
}

function trimIfTooBig() {
  try {
    if (!fs.existsSync(logFilePath)) return;
    const { size } = fs.statSync(logFilePath);
    if (size <= MAX_LOG_BYTES) return;
    const content = fs.readFileSync(logFilePath, 'utf8');
    fs.writeFileSync(logFilePath, content.slice(-MAX_LOG_BYTES));
  } catch (_) {
    // logging tidak boleh membuat app crash
  }
}

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  if (!logFilePath) {
    console.log(line.trim());
    return;
  }
  try {
    fs.appendFileSync(logFilePath, line);
  } catch (_) {
    // ignore, jangan sampai error logging mengganggu aplikasi
  }
}

module.exports = {
  init,
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
  error: (msg) => write('ERROR', msg),
  getLogFilePath: () => logFilePath,
};
