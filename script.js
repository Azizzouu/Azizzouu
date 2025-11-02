(function(){
  // Check browser support
  const supports = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  
  // DOM elements
  const textEl = document.getElementById('text');
  const voiceSel = document.getElementById('voice');
  const voiceHint = document.getElementById('voiceHint');
  const speakBtn = document.getElementById('speakBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const rate = document.getElementById('rate');
  const pitch = document.getElementById('pitch');
  const volume = document.getElementById('volume');
  const rateVal = document.getElementById('rateVal');
  const pitchVal = document.getElementById('pitchVal');
  const volVal = document.getElementById('volVal');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('charCount');

  // Load saved preferences
  if (localStorage.getItem('tts_text')) {
    textEl.value = localStorage.getItem('tts_text');
  }
  
  let selectedVoiceURI = null;
  ['rate', 'pitch', 'volume', 'voiceURI'].forEach(k => {
    const v = localStorage.getItem('tts_' + k);
    if (k === 'voiceURI' && v) selectedVoiceURI = v;
    if (v && k !== 'voiceURI') document.getElementById(k).value = v;
  });

  // Character count and text saving
  function updateCounts() { 
    countEl.textContent = textEl.value.length.toString(); 
    localStorage.setItem('tts_text', textEl.value); 
  }
  textEl.addEventListener('input', updateCounts); 
  updateCounts();

  // Status display
  function setStatus(msg, good = true) { 
    statusEl.textContent = msg || ''; 
    statusEl.style.color = good ? 'var(--success)' : 'var(--error)'; 
  }

  // Check browser support
  if (!supports) {
    setStatus('Your browser does not support Speech Synthesis. Try Chrome, Edge, or Safari.', false);
    document.querySelectorAll('button').forEach(b => b.disabled = true);
    voiceSel.disabled = true;
    rate.disabled = true;
    pitch.disabled = true;
    volume.disabled = true;
    return;
  }

  // Voice management
  let voices = [];

  function populateVoices() {
    voiceSel.innerHTML = '';
    voices = window.speechSynthesis.getVoices();
    const german = voices.filter(v => /de(-|_|\b)/i.test(v.lang) || /German/i.test(v.name));
    const list = german.length ? german : voices;
    if (!german.length) {
      voiceHint.textContent = 'No German voices detected.';
      const btn = document.createElement('button');
      btn.id = 'installHelp';
      btn.textContent = 'How to install';
      btn.style.marginLeft = '8px';
      btn.style.padding = '4px 8px';
      btn.style.background = 'var(--accent)';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.color = 'var(--bg)';
      btn.style.fontWeight = '600';
      btn.addEventListener('click', showInstallGuide);
      voiceHint.appendChild(btn);
    } else {
      voiceHint.textContent = `Found ${german.length} German voice(s).`;
    }
    list.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} — ${v.lang}${v.default ? ' (default)' : ''}`;
      if (selectedVoiceURI && v.voiceURI === selectedVoiceURI) opt.selected = true;
      voiceSel.appendChild(opt);
    });
    if (!selectedVoiceURI && list[0]) selectedVoiceURI = list[0].voiceURI;
    checkGermanVoices();
  }

  function checkGermanVoices() {
    const germanVoices = voices.filter(v => /de(-|_|\b)/i.test(v.lang));
    if (germanVoices.length === 0) {
      // Show a more prominent hint if no German voices are found
      voiceHint.style.color = 'var(--error)';
    }
  }

  function showInstallGuide() {
    const guide = `
      <div class="modal">
        <div class="modal-content">
          <h3>Install German Voices</h3>
          <p><strong>Chrome/Edge:</strong> Settings → Advanced → Accessibility → Text-to-speech → Manage voices</p>
          <p><strong>Windows:</strong> Settings → Time & Language → Speech → Manage voices</p>
          <p><strong>macOS:</strong> System Preferences → Accessibility → Spoken Content → System Voice</p>
          <p><strong>Android:</strong> Settings → Accessibility → Text-to-speech output</p>
          <button onclick="this.closest('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', guide);
  }

  // Initialize voices
  populateVoices();
  if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => { populateVoices(); };
  }

  // Get selected voice
  function getSelectedVoice() {
    const uri = voiceSel.value || selectedVoiceURI;
    return voices.find(v => v.voiceURI === uri) || null;
  }

  // Get the best available German voice
  function getBestGermanVoice() {
    const germanVoices = voices.filter(v => /de(-|_|\b)/i.test(v.lang));
    
    // Prefer voices that are specifically German
    const exactMatch = germanVoices.find(v => v.lang === 'de-DE' || v.lang === 'de-CH' || v.lang === 'de-AT');
    
    return exactMatch || germanVoices[0] || voices[0];
  }

  // UI state management
  function updateUI() {
    const speaking = speechSynthesis.speaking;
    const paused = speechSynthesis.paused;
    speakBtn.disabled = speaking;
    pauseBtn.disabled = !speaking || paused;
    resumeBtn.disabled = !speaking || !paused;
    stopBtn.disabled = !speaking;
  }

  // Speech functions
  function speak() {
    const text = (textEl.value || '').trim();
    if (!text) { 
      setStatus('Please enter some German text first.', false); 
      return; 
    }
    try {
      if (window.speechSynthesis.getVoices().length === 0) {
        setStatus('No local voices available.', false);
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = getSelectedVoice() || getBestGermanVoice();
      if (v) { 
        u.voice = v; 
        u.lang = v.lang || 'de-DE'; 
      } else { 
        u.lang = 'de-DE'; 
      }
      u.rate = parseFloat(rate.value);
      u.pitch = parseFloat(pitch.value);
      u.volume = parseFloat(volume.value);
      u.onstart = () => { setStatus('Speaking…'); updateUI(); };
      u.onend = () => { setStatus('Done.'); updateUI(); };
      u.onerror = (e) => { setStatus('Error: ' + (e.error || 'unknown'), false); updateUI(); };
      u.onpause = () => { setStatus('Paused'); updateUI(); };
      u.onresume = () => { setStatus('Speaking…'); updateUI(); };
      speechSynthesis.speak(u);
      updateUI();
    } catch (error) {
      setStatus(`Error: ${error.message}`, false);
      console.error('TTS Error:', error);
    }
  }

  // Event listeners
  speakBtn.addEventListener('click', speak);
  pauseBtn.addEventListener('click', () => { 
    speechSynthesis.pause(); 
    updateUI(); 
  });
  
  resumeBtn.addEventListener('click', () => { 
    speechSynthesis.resume(); 
    updateUI(); 
  });
  
  stopBtn.addEventListener('click', () => { 
    speechSynthesis.cancel(); 
    setStatus('Stopped.'); 
    updateUI(); 
  });

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
      e.preventDefault(); 
      speak(); 
    }
  });

  // Voice selection
  voiceSel.addEventListener('change', () => {
    selectedVoiceURI = voiceSel.value; 
    localStorage.setItem('tts_voiceURI', selectedVoiceURI);
  });


  // Settings sliders
  [rate, pitch, volume].forEach(el => {
    const map = {rate: rateVal, pitch: pitchVal, volume: volVal};
    el.addEventListener('input', () => {
      map[el.id].textContent = parseFloat(el.value).toFixed(1);
      localStorage.setItem('tts_' + el.id, el.value);
    });
    map[el.id].textContent = parseFloat(el.value).toFixed(1);
  });

  // Initial UI state
  updateUI();
})();

