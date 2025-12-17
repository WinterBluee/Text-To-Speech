// ========================================
// Text-to-Speech App
// Using Browser Web Speech API
// ========================================

// DOM Element References
const textInput = document.getElementById("text-input");
const voiceSelect = document.getElementById("voice-select");
const speedSlider = document.getElementById("speed-slider");
const pitchSlider = document.getElementById("pitch-slider");
const speedValue = document.getElementById("speed-value");
const pitchValue = document.getElementById("pitch-value");
const speakBtn = document.getElementById("speak-btn");
const stopBtn = document.getElementById("stop-btn");
const charCount = document.getElementById("char-count");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");

// ===== MODO CLARO/ESCURO =====
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const THEME_KEY = 'voz-natural-theme';

function applyTheme(theme) {
  if (theme === 'light') {
    body.classList.add('light');
    themeToggle.textContent = '☀️';
  } else {
    body.classList.remove('light');
    themeToggle.textContent = '🌙';
  }
}

// Carrega preferência salva ou respeita o sistema
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    // Respeita preferência do sistema (escuro se o user usa dark mode no SO)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

// Toggle ao clicar
themeToggle.addEventListener('click', () => {
  const newTheme = body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
});

// Detecta mudança no sistema (ex: user muda no Windows)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem(THEME_KEY)) { // só se não tiver preferência manual
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

// Carrega o tema ao abrir
loadTheme();


// Web Speech API
const synth = window.speechSynthesis;
let voices = [];

// Load available voices from the browser
function loadVoices() {
  // Get voices from the speech synthesis
  voices = synth.getVoices();

  // If no voices yet, wait for them to load
  if (voices.length === 0) {
    return;
  }

  // Clear the dropdown
  voiceSelect.innerHTML = "";

  // Populate dropdown with voice options
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  console.log(`Loaded ${voices.length} voices`);
}

// Update character counter
function updateCharCount() {
  const count = textInput.value.length;
  charCount.textContent = count;
}

// Update slider value displays
function updateSliderValues() {
  speedValue.textContent = speedSlider.value;
  pitchValue.textContent = pitchSlider.value;
}

// Speak the text
function speak() {
  // Stop any ongoing speech
  if (synth.speaking) {
    synth.cancel();
  }

  // Get the text
  const text = textInput.value.trim();

  if (!text) {
    alert("Please enter some text to speak");
    return;
  }

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);

  // Set voice
  const selectedVoiceIndex = voiceSelect.value;
  if (selectedVoiceIndex !== "") {
    utterance.voice = voices[selectedVoiceIndex];
  }

  // Set parameters
  utterance.rate = parseFloat(speedSlider.value);
  utterance.pitch = parseFloat(pitchSlider.value);
  utterance.volume = 1.0;

  // Event handlers
  utterance.onstart = () => {
    status.classList.add("speaking");
    statusText.textContent = "Speaking...";
    speakBtn.disabled = true;
    stopBtn.disabled = false;
  };

  utterance.onend = () => {
    status.classList.remove("speaking");
    statusText.textContent = "Ready";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
  };

  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    status.classList.remove("speaking");
    statusText.textContent = "Error occurred";
    speakBtn.disabled = false;
    stopBtn.disabled = true;
  };

  // Speak!
  synth.speak(utterance);

  console.log("Speaking:", text.substring(0, 50) + "...");
}

// Stop speaking
function stop() {
  synth.cancel();
  status.classList.remove("speaking");
  statusText.textContent = "Stopped";
  speakBtn.disabled = false;
  stopBtn.disabled = true;
}

// Set up event listeners
function init() {
  console.log("Text-to-Speech App initialized");

  // Load voices
  loadVoices();

  // Voices load asynchronously in some browsers
  synth.addEventListener("voiceschanged", loadVoices);

  // Input events
  textInput.addEventListener("input", updateCharCount);
  speedSlider.addEventListener("input", updateSliderValues);
  pitchSlider.addEventListener("input", updateSliderValues);

  // Button events
  speakBtn.addEventListener("click", speak);
  stopBtn.addEventListener("click", stop);

  // Initialize displays
  updateCharCount();
  updateSliderValues();

  // Disable stop button initially
  stopBtn.disabled = true;
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
