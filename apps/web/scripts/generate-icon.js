const sharp = require('sharp');
const path = require('path');

const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="224" fill="#0E7490"/>

  <!-- Paddle face -->
  <rect x="280" y="200" width="340" height="440" rx="140" fill="white"/>

  <!-- Paddle handle -->
  <rect x="375" y="600" width="110" height="200" rx="40" fill="white"/>

  <!-- Ball -->
  <circle cx="700" cy="340" r="140" fill="#F97316"/>

  <!-- Ball holes for pickleball look -->
  <circle cx="660" cy="300" r="20" fill="#EA580C"/>
  <circle cx="720" cy="320" r="20" fill="#EA580C"/>
  <circle cx="680" cy="370" r="20" fill="#EA580C"/>
  <circle cx="740" cy="360" r="20" fill="#EA580C"/>
</svg>`;

async function generateIcon() {
  const outputPath = path.join(__dirname, '..', 'public', 'icons', 'app-icon-1024.png');

  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(outputPath);

  console.log('Generated:', outputPath);
}

generateIcon().catch(console.error);
