const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const source = path.join(__dirname, '..', 'src', 'assets', 'icon-source.png');
const target = path.join(__dirname, '..', 'build', 'icon.ico');

async function main() {
  if (!fs.existsSync(source)) {
    console.error('Icon source tidak ditemukan:', source);
    process.exit(1);
  }
  const buf = await pngToIco(source);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  console.log('icon.ico dibuat di', target);
}

main().catch((err) => {
  console.error('Gagal membuat icon.ico:', err.message);
  process.exit(1);
});
