const tools = [
  // Text & Developer
  { name: "Word Counter", desc: "Count words, characters, sentences & reading time", cat: "Text", link: "tools/word-counter.html" },
  { name: "Password Generator", desc: "Create strong random passwords", cat: "Security", link: "tools/password-generator.html" },
  { name: "QR Code Generator", desc: "Generate QR code for any text or URL", cat: "Finance", link: "tools/qr-code.html" },
  { name: "JSON Formatter", desc: "Format and validate JSON", cat: "Developer", link: "tools/json-formatter.html" },
  { name: "Base64 Encoder", desc: "Encode / Decode Base64", cat: "Developer", link: "tools/base64.html" },
  { name: "Hash Generator", desc: "MD5, SHA-256 hashes", cat: "Security", link: "tools/hash-generator.html" },
  { name: "Text Case Converter", desc: "Upper, lower, title, sentence case", cat: "Text", link: "tools/text-case.html" },

  // Image Tools
  { name: "Image Compress", desc: "Reduce image size while keeping quality", cat: "Image", link: "tools/image-compress.html" },
  { name: "Image Editor", desc: "Basic crop, rotate, brightness, contrast", cat: "Image", link: "tools/image-editor.html" },
  { name: "Photo Editor", desc: "Quick photo adjustments & filters", cat: "Image", link: "tools/photo-editor.html" },
  { name: "Image to PDF", desc: "Convert images to PDF", cat: "PDF", link: "tools/image-to-pdf.html" },
  { name: "PDF to Image", desc: "Convert PDF pages to images", cat: "PDF", link: "tools/pdf-to-image.html" },

  // PDF Tools
  { name: "PDF Merge", desc: "Combine multiple PDFs into one", cat: "PDF", link: "tools/pdf-merge.html" },
  { name: "PDF Edit", desc: "Delete / Rotate pages", cat: "PDF", link: "tools/pdf-edit.html" },
  { name: "PDF Crop", desc: "Crop PDF pages", cat: "PDF", link: "tools/pdf-crop.html" },

  // Calculators
  { name: "Age Calculator", desc: "Calculate exact age from DOB", cat: "Daily", link: "tools/age-calculator.html" },
  { name: "EMI Calculator", desc: "Loan EMI calculator", cat: "Finance", link: "tools/emi-calculator.html" },
  { name: "SIP Calculator", desc: "Mutual Fund SIP returns", cat: "Finance", link: "tools/sip-calculator.html" },
  { name: "Salary Calculator", desc: "In-hand salary after deductions", cat: "Finance", link: "tools/salary-calculator.html" },
];

function renderTools(containerId, list = tools) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = list.map(t => `
    <a href="${t.link}" class="tool-card">
      <span class="badge">${t.cat}</span>
      <h3>${t.name}</h3>
      <p>${t.desc}</p>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderTools('popular-tools', tools.slice(0, 8));
  renderTools('all-tools-list', tools);
});
