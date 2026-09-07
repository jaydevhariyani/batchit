const tools = [
  { name: "Word Counter", desc: "Count words, characters, sentences & reading time", cat: "Text", link: "tools/word-counter.html" },
  { name: "Password Generator", desc: "Create strong random passwords", cat: "Security", link: "tools/password-generator.html" },
  { name: "QR Code Generator", desc: "Generate QR code for any text or URL", cat: "Finance", link: "tools/qr-code.html" },
  { name: "JSON Formatter", desc: "Format and validate JSON", cat: "Developer", link: "tools/json-formatter.html" },
  { name: "Base64 Encoder", desc: "Encode / Decode Base64", cat: "Developer", link: "tools/base64.html" },
  { name: "Hash Generator", desc: "MD5, SHA-256 hashes", cat: "Security", link: "tools/hash-generator.html" },
  { name: "Age Calculator", desc: "Calculate exact age from date of birth", cat: "Daily", link: "tools/age-calculator.html" },
  { name: "GST Calculator", desc: "Calculate GST inclusive & exclusive", cat: "Finance", link: "tools/gst-calculator.html" },
  { name: "EMI Calculator", desc: "Loan EMI calculator", cat: "Finance", link: "tools/emi-calculator.html" },
  { name: "Text Case Converter", desc: "Upper, lower, title, sentence case", cat: "Text", link: "tools/text-case.html" },
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
  renderTools('popular-tools', tools.slice(0, 6));
  renderTools('all-tools-list', tools);
});