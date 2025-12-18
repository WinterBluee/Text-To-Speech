// =======================================================
// Voz Natural - Leitor de Script com Web Speech API (Estável)
// Parser [Personagem] + Highlight + Pause/Resume confiável
// =======================================================

// =======================
// DOM ELEMENTS
// =======================
const textInput   = document.getElementById("text-input");
const voiceSelect = document.getElementById("voice-select");
const speakBtn    = document.getElementById("speak-btn");
const stopBtn     = document.getElementById("stop-btn");
const charCount   = document.getElementById("char-count");
const statusText  = document.getElementById("status-text");
const themeToggle = document.getElementById("theme-toggle");
const scriptDiv   = document.getElementById("script");

// =======================
// ESTADO GLOBAL DA LEITURA
// =======================
let isReading = false;
let currentBlockIndex = 0;  // índice da linha atual
let allBlocks = [];         // todas as linhas do script
let currentUtterance = null;

// =======================
// TEMA
// =======================
const body = document.body;
const THEME_KEY = "voz-natural-theme";

function applyTheme(theme) {
  body.classList.toggle("light", theme === "light");
  themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

themeToggle.addEventListener("click", () => {
  const newTheme = body.classList.contains("light") ? "dark" : "light";
  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
});

// =======================
// WEB SPEECH API - VOZES
// =======================
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth.getVoices();

  if (voices.length === 0) {
    voiceSelect.innerHTML = '<option value="">Carregando vozes...</option>';
    return;
  }

  voiceSelect.innerHTML = '<option value="">Selecione uma voz</option>';

  const ptVoices = voices.filter(v => v.lang.includes("pt"));
  const otherVoices = voices.filter(v => !v.lang.includes("pt"));

  ptVoices.sort((a, b) => {
    if (a.name.toLowerCase().includes("google") && !b.name.toLowerCase().includes("google")) return -1;
    if (b.name.toLowerCase().includes("google") && !a.name.toLowerCase().includes("google")) return 1;
    return 0;
  });

  ptVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang}) ${voice.name.toLowerCase().includes("google") ? "(Google - Top)" : ""}`;
    voiceSelect.appendChild(option);
  });

  if (ptVoices.length > 0 && otherVoices.length > 0) {
    const sep = document.createElement("option");
    sep.disabled = true;
    sep.textContent = "── Outras línguas ──";
    voiceSelect.appendChild(sep);
  }

  otherVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  const best = ptVoices.find(v => v.name.toLowerCase().includes("google"));
  if (best) voiceSelect.value = best.name;

  statusText.textContent = `Vozes carregadas: ${voices.length}`;
}

// =======================
// PARSER DE SCRIPT
// =======================
function parseScript(text) {
  const lines = text.split("\n").filter(l => l.trim() !== "");
  return lines.map((line, i) => {
    const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (match) {
      return { id: i, character: match[1].trim(), text: match[2].trim() };
    }
    return { id: i, character: "padrão", text: line.trim() };
  });
}

// =======================
// RENDER E HIGHLIGHT
// =======================
function renderScript(blocks) {
  scriptDiv.innerHTML = "";
  blocks.forEach(b => {
    const p = document.createElement("p");
    p.id = `line-${b.id}`;
    p.innerHTML = `<strong>[${b.character.toUpperCase()}]</strong> ${b.text}`;
    scriptDiv.appendChild(p);
  });
}

function highlightLine(id) {
  document.querySelectorAll("#script p").forEach(p => p.classList.remove("line-active"));
  const line = document.getElementById(`line-${id}`);
  if (line) {
    line.classList.add("line-active");
    line.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// =======================
// FALA DE UMA LINHA
// =======================
function speakBlock(block) {
  synth.cancel(); // limpa qualquer fala anterior

  const utterance = new SpeechSynthesisUtterance(block.text);
  currentUtterance = utterance;

  const selectedVoiceName = voiceSelect.value;
  const voice = voices.find(v => v.name === selectedVoiceName);
  if (voice) utterance.voice = voice;

  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    statusText.textContent = "Falando...";
    speakBtn.disabled = true;
  };

  utterance.onend = () => {
    statusText.textContent = "Linha concluída";
    currentUtterance = null;
  };

  utterance.onerror = (e) => {
    console.error("Erro na fala:", e);
    statusText.textContent = "Erro na linha";
    currentUtterance = null;
  };

  synth.speak(utterance);
}

// =======================
// LEITURA SEQUENCIAL COM PAUSE/RESUME ESTÁVEL
// =======================
async function readScript() {
  if (isReading) {
    // Se já está lendo, pausa ou resume
    if (currentUtterance) {
      synth.cancel();
    }
    isReading = false;
    speakBtn.disabled = false;
    stopBtn.textContent = "⏸ Pause";
    statusText.textContent = "Parado";
    return;
  }

  const text = textInput.value.trim();
  if (!text) {
    statusText.textContent = "Digite um script!";
    return;
  }

  allBlocks = parseScript(text);
  renderScript(allBlocks);

  currentBlockIndex = 0;
  isReading = true;
  speakBtn.disabled = true;
  stopBtn.disabled = false;
  stopBtn.textContent = "⏸ Pause";
  statusText.textContent = "Iniciando leitura...";

  while (currentBlockIndex < allBlocks.length && isReading) {
    const block = allBlocks[currentBlockIndex];
    highlightLine(block.id);
    speakBlock(block);

    // Espera a fala terminar
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!synth.speaking || !isReading) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    currentBlockIndex++;
  }

  // Fim
  isReading = false;
  speakBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = "Leitura concluída!";
}

// =======================
// EVENTOS
// =======================
speakBtn.addEventListener("click", readScript);

stopBtn.addEventListener("click", () => {
  if (!isReading) return;

  isReading = false;
  synth.cancel();
  statusText.textContent = "Parado";
  speakBtn.disabled = false;
  stopBtn.textContent = "▶ Continuar";
});

// Atualiza contador
textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length;
});

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadVoices();
  charCount.textContent = textInput.value.length;

  synth.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 500);
  setTimeout(loadVoices, 1000);
  setTimeout(loadVoices, 2000);
});