(function () {
  'use strict';

  var IS_PREPROD = location.hostname.indexOf('staging.') === 0 ||
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var WORKER_URL = IS_PREPROD
    ? 'https://shift-chatbot-preprod.velos.workers.dev'
    : 'https://shift-chatbot.velos.workers.dev';
  var MAX_MESSAGES = 30;
  var LEAD_AFTER_EXCHANGES = 3;

  var lang = window.location.pathname.startsWith('/en') ? 'en' : 'fr';
  var sessionId = (function () {
    var id = sessionStorage.getItem('velos_sid');
    if (!id) { id = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('velos_sid', id); }
    return id;
  }());
  var msgCount = parseInt(sessionStorage.getItem('velos_msg_count') || '0', 10);
  var exchangeCount = 0;
  var isOpen = false;
  var isStreaming = false;
  var leadShown = false;
  var leadSubmitted = false;
  var messages = [];

  var T = {
    fr: {
      headerTitle: 'VELOS — AI',
      headerSub: 'Répond sur nos offres uniquement',
      greeting: 'Bonjour ! Je suis l\'assistant Velos. Pose-moi tes questions sur nos offres, tarifs ou processus.',
      suggestions: ['Voir les offres web', 'Tarifs & délais', 'Comment ça marche ?'],
      placeholder: 'Pose ta question…',
      send: '↑',
      leadTitle: 'POUR ALLER PLUS LOIN',
      leadBody: 'Laisse tes coordonnées et on te recontacte sous 24h.',
      labelName: 'PRÉNOM',
      labelContact: 'EMAIL OU WHATSAPP',
      labelProject: 'TYPE DE PROJET',
      projects: [
        { v: '', l: 'Sélectionne…' },
        { v: 'vitrine', l: 'Site vitrine' },
        { v: 'ecommerce', l: 'E-commerce' },
        { v: 'automation', l: 'Automatisation IA' },
        { v: 'bot', l: 'Bot conversationnel' },
        { v: 'autre', l: 'Autre / Sur-mesure' }
      ],
      btnLead: 'ENVOYER',
      skipLead: 'Passer',
      thanks: '✓ Reçu ! On te recontacte très vite.',
      limitMsg: 'Limite de session atteinte. Contacte-nous via le formulaire.',
      errMsg: 'Erreur de connexion. Réessaie dans un instant.',
    },
    en: {
      headerTitle: 'VELOS — AI',
      headerSub: 'Answers about our offers only',
      greeting: 'Hello! I\'m the Velos assistant. Ask me anything about our offers, pricing or process.',
      suggestions: ['See web offers', 'Pricing & timelines', 'How does it work?'],
      placeholder: 'Ask your question…',
      send: '↑',
      leadTitle: 'LET\'S GO FURTHER',
      leadBody: 'Leave your details and we\'ll get back to you within 24h.',
      labelName: 'FIRST NAME',
      labelContact: 'EMAIL OR WHATSAPP',
      labelProject: 'PROJECT TYPE',
      projects: [
        { v: '', l: 'Select…' },
        { v: 'vitrine', l: 'Showcase site' },
        { v: 'ecommerce', l: 'E-commerce' },
        { v: 'automation', l: 'AI Automation' },
        { v: 'bot', l: 'Conversational bot' },
        { v: 'autre', l: 'Other / Custom' }
      ],
      btnLead: 'SEND',
      skipLead: 'Skip',
      thanks: '✓ Received! We\'ll be in touch shortly.',
      limitMsg: 'Session limit reached. Contact us via the form.',
      errMsg: 'Connection error. Please try again.',
    }
  }[lang];

  var style = document.createElement('style');
  style.textContent = [
    '#velos-chat-toggle{position:fixed;bottom:24px;right:24px;z-index:9998;width:52px;height:52px;background:#CCFF00;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:4px 4px 0 #000;transition:transform .075s,box-shadow .075s}',
    '#velos-chat-toggle:hover{transform:translate(-4px,-4px);box-shadow:4px 4px 0 #FFFFFF}',
    '#velos-chat-toggle svg{width:24px;height:24px;fill:#131313}',
    '#velos-chat-panel{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;background:#131313;z-index:9999;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);border-left:2px solid #353534}',
    '#velos-chat-panel.open{transform:translateX(0)}',
    '#velos-chat-header{padding:16px 16px 12px;border-bottom:2px solid #353534;flex-shrink:0}',
    '#velos-chat-header-top{display:flex;justify-content:space-between;align-items:center}',
    '#velos-chat-title{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;color:#CCFF00;letter-spacing:.08em;text-transform:uppercase}',
    '#velos-chat-sub{font-family:"Inter",sans-serif;font-size:10px;color:#8E9379;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}',
    '#velos-chat-close{background:none;border:none;cursor:pointer;color:#8E9379;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;padding:0}',
    '#velos-chat-close:hover{color:#E5E2E1}',
    '#velos-chat-messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}',
    '#velos-chat-messages::-webkit-scrollbar{width:3px}',
    '#velos-chat-messages::-webkit-scrollbar-thumb{background:#353534}',
    /* USER bubble */
    '.vc-msg.user{background:#2C2B29;align-self:flex-end;max-width:80%;padding:10px 14px;font-family:"Inter",sans-serif;font-size:13px;line-height:1.6;color:#E5E2E1;border-right:3px solid #8E9379;word-break:break-word}',
    /* BOT card */
    '.vc-msg.bot{background:#1C1B1B;align-self:stretch;border-left:4px solid #CCFF00;font-family:"Inter",sans-serif;font-size:13.5px;line-height:1.75;color:#E8E5E2;word-break:break-word}',
    '.vc-bot-content{padding:12px 16px}',
    '.vc-msg.bot strong{color:#CCFF00;font-weight:600}',
    '.vc-msg.bot ul{margin:8px 0 4px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}',
    '.vc-msg.bot li{padding-left:18px;position:relative;color:#E8E5E2}',
    '.vc-msg.bot li::before{content:"—";position:absolute;left:0;color:#CCFF00;font-weight:700}',
    '.vc-msg.bot p{margin:0 0 7px 0;color:#E8E5E2}',
    '.vc-msg.bot p:last-child{margin-bottom:0}',
    '.vc-msg.bot.streaming .vc-bot-content::after{content:"▋";animation:vc-blink .7s step-end infinite;color:#CCFF00;font-size:11px;margin-left:2px}',
    '@keyframes vc-blink{0%,100%{opacity:1}50%{opacity:0}}',
    '#velos-suggestions{padding:0 16px 12px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}',
    '.vc-sug{background:transparent;border:1px solid #353534;color:#8E9379;font-family:"Inter",sans-serif;font-size:11px;padding:5px 10px;cursor:pointer;transition:border-color .15s,color .15s;text-align:left}',
    '.vc-sug:hover{border-color:#CCFF00;color:#CCFF00}',
    '#velos-chat-input-area{padding:12px 16px;border-top:2px solid #353534;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}',
    '#velos-chat-input{flex:1;background:#0E0E0E;border:2px solid #353534;color:#E5E2E1;font-family:"Inter",sans-serif;font-size:13px;padding:10px 12px;resize:none;min-height:40px;max-height:120px;outline:none;transition:border-color .15s}',
    '#velos-chat-input:focus{border-color:#CCFF00}',
    '#velos-chat-send{background:#CCFF00;border:none;color:#131313;font-weight:700;font-size:18px;width:40px;height:40px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 #000;transition:transform .1s,box-shadow .1s}',
    '#velos-chat-send:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 #000}',
    '#velos-chat-send:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:2px 2px 0 #000}',
    '#velos-lead-form{padding:16px;background:#1C1B1B;border-top:2px solid #CCFF00;flex-shrink:0}',
    '#velos-lead-form.hidden{display:none}',
    '.vc-lead-title{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:#CCFF00;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}',
    '.vc-lead-body{font-family:"Inter",sans-serif;font-size:11px;color:#8E9379;margin-bottom:10px}',
    '.vc-lead-label{font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:600;color:#8E9379;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:3px;margin-top:8px}',
    '.vc-lead-input,.vc-lead-select{width:100%;background:#0E0E0E;border:2px solid #353534;color:#E5E2E1;font-family:"Inter",sans-serif;font-size:12px;padding:7px 10px;outline:none;box-sizing:border-box;transition:border-color .15s}',
    '.vc-lead-input:focus,.vc-lead-select:focus{border-color:#CCFF00}',
    '.vc-lead-select{appearance:none;cursor:pointer}',
    '.vc-lead-actions{display:flex;gap:8px;margin-top:12px}',
    '#velos-lead-submit{background:#CCFF00;border:none;color:#131313;font-family:"JetBrains Mono",monospace;font-weight:700;font-size:11px;padding:9px 16px;cursor:pointer;letter-spacing:.06em;box-shadow:2px 2px 0 #000;transition:transform .1s,box-shadow .1s}',
    '#velos-lead-submit:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 #000}',
    '#velos-lead-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}',
    '#velos-lead-skip{background:none;border:none;color:#8E9379;font-family:"Inter",sans-serif;font-size:11px;cursor:pointer;padding:9px 8px}',
    '#velos-lead-skip:hover{color:#E5E2E1}',
    '@media(max-width:420px){#velos-chat-panel{width:100vw}#velos-chat-toggle{bottom:16px;right:16px}}',
  ].join('');
  document.head.appendChild(style);

  var toggle = document.createElement('button');
  toggle.id = 'velos-chat-toggle';
  toggle.setAttribute('aria-label', 'Open chat');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'velos-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', T.headerTitle);

  var projectOpts = T.projects.map(function (p) {
    return '<option value="' + p.v + '">' + p.l + '</option>';
  }).join('');

  panel.innerHTML = [
    '<div id="velos-chat-header">',
      '<div id="velos-chat-header-top">',
        '<div>',
          '<div id="velos-chat-title">' + T.headerTitle + '</div>',
          '<div id="velos-chat-sub">' + T.headerSub + '</div>',
        '</div>',
        '<button id="velos-chat-close" aria-label="Close chat">✕</button>',
      '</div>',
    '</div>',
    '<div id="velos-chat-messages" role="log" aria-live="polite"></div>',
    '<div id="velos-suggestions"></div>',
    '<div id="velos-lead-form" class="hidden">',
      '<div class="vc-lead-title">' + T.leadTitle + '</div>',
      '<div class="vc-lead-body">' + T.leadBody + '</div>',
      '<label class="vc-lead-label" for="velos-lead-name">' + T.labelName + '</label>',
      '<input class="vc-lead-input" id="velos-lead-name" type="text" autocomplete="given-name">',
      '<label class="vc-lead-label" for="velos-lead-contact">' + T.labelContact + '</label>',
      '<input class="vc-lead-input" id="velos-lead-contact" type="text" autocomplete="email">',
      '<label class="vc-lead-label" for="velos-lead-project">' + T.labelProject + '</label>',
      '<select class="vc-lead-select" id="velos-lead-project">' + projectOpts + '</select>',
      '<div class="vc-lead-actions">',
        '<button id="velos-lead-submit">' + T.btnLead + '</button>',
        '<button id="velos-lead-skip">' + T.skipLead + '</button>',
      '</div>',
    '</div>',
    '<div id="velos-chat-input-area">',
      '<textarea id="velos-chat-input" rows="1" placeholder="' + T.placeholder + '" aria-label="' + T.placeholder + '"></textarea>',
      '<button id="velos-chat-send" aria-label="Send">' + T.send + '</button>',
    '</div>',
  ].join('');

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('velos-chat-messages');
  var suggestionsEl = document.getElementById('velos-suggestions');
  var inputEl = document.getElementById('velos-chat-input');
  var sendBtn = document.getElementById('velos-chat-send');
  var leadForm = document.getElementById('velos-lead-form');
  var leadSubmitBtn = document.getElementById('velos-lead-submit');
  var leadSkipBtn = document.getElementById('velos-lead-skip');

  // renderMarkdown: HTML-escaped first, then only controlled tags (strong/ul/li/p) injected
  function renderMarkdown(text) {
    var s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Normalise inline list separators "- item" not preceded by newline → put each on its own line
    s = s.replace(/ - ([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ*\w])/g, '\n- $1');
    // Bold
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Line-by-line list detection
    var lines = s.split('\n');
    var out = []; var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var li = line.match(/^[-*•] (.+)/);
      if (li) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + li[1] + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (line) out.push('<p>' + line + '</p>');
      }
    }
    if (inList) out.push('</ul>');
    return out.join('');
  }

  function addMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'vc-msg ' + role;
    if (role === 'bot') {
      var content = document.createElement('div');
      content.className = 'vc-bot-content';
      // bot content: HTML-escaped + controlled tags only (see renderMarkdown)
      if (text) content.innerHTML = renderMarkdown(text);
      el.appendChild(content);
    } else {
      el.textContent = text;
    }
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showSuggestions() {
    suggestionsEl.innerHTML = '';
    T.suggestions.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'vc-sug';
      btn.textContent = s;
      btn.addEventListener('click', function () {
        suggestionsEl.innerHTML = '';
        sendMessage(s);
      });
      suggestionsEl.appendChild(btn);
    });
  }

  function maybeTriggerLead() {
    if (leadShown || leadSubmitted) return;
    if (exchangeCount >= LEAD_AFTER_EXCHANGES) {
      leadShown = true;
      leadForm.classList.remove('hidden');
      panel.scrollTop = panel.scrollHeight;
    }
  }

  async function sendMessage(text) {
    if (isStreaming || !text.trim()) return;
    if (msgCount >= MAX_MESSAGES) { addMessage('bot', T.limitMsg); return; }

    suggestionsEl.innerHTML = '';
    messages.push({ role: 'user', content: text });
    addMessage('user', text);
    msgCount++;
    sessionStorage.setItem('velos_msg_count', String(msgCount));

    isStreaming = true;
    sendBtn.disabled = true;

    var botEl = addMessage('bot', '');
    botEl.classList.add('streaming');
    var botText = '';

    try {
      var res = await fetch(WORKER_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, lang: lang, session_id: sessionId }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var reader = res.body.getReader();
      var decoder = new TextDecoder();

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        var lines = decoder.decode(chunk.value, { stream: true }).split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line.startsWith('data: ')) continue;
          var data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            var parsed = JSON.parse(data);
            var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
            if (delta) {
              botText += delta;
              var bc = botEl.querySelector('.vc-bot-content');
              if (bc) bc.innerHTML = renderMarkdown(botText);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          } catch (e) { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      var bcErr = botEl.querySelector('.vc-bot-content'); if (bcErr) bcErr.textContent = T.errMsg;
    } finally {
      botEl.classList.remove('streaming');
      var bcFin = botEl.querySelector('.vc-bot-content'); if (bcFin && !bcFin.textContent.trim()) bcFin.textContent = T.errMsg;
      messages.push({ role: 'assistant', content: botText || T.errMsg });
      isStreaming = false;
      sendBtn.disabled = false;
      exchangeCount++;
      maybeTriggerLead();
    }
  }

  leadSubmitBtn.addEventListener('click', async function () {
    var name = document.getElementById('velos-lead-name').value.trim();
    var contact = document.getElementById('velos-lead-contact').value.trim();
    var project = document.getElementById('velos-lead-project').value;
    if (!name || !contact) return;
    leadSubmitBtn.disabled = true;
    leadSubmitted = true;
    await fetch(WORKER_URL + '/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, contact: contact, project_type: project, session_id: sessionId, lang: lang }),
    }).catch(function () {});
    track('generate_lead', { lead_source: 'chatbot', project_type: project });
    leadForm.innerHTML = '<div style="padding:8px 0;font-family:JetBrains Mono,monospace;font-size:12px;color:#CCFF00;font-weight:700">' + T.thanks + '</div>';
    setTimeout(function () { leadForm.classList.add('hidden'); }, 3000);
  });

  leadSkipBtn.addEventListener('click', function () {
    leadForm.classList.add('hidden');
    leadSubmitted = true;
  });

  var panelOpenedOnce = false;

  function track(event, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, params || {}));
    } catch (err) { /* analytics must never break the widget */ }
  }

  function openPanel() {
    isOpen = true;
    if (!panelOpenedOnce) { panelOpenedOnce = true; track('chat_opened'); }
    panel.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    if (messages.length === 0) {
      addMessage('bot', T.greeting);
      showSuggestions();
    }
    setTimeout(function () { inputEl.focus(); }, 300);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  document.getElementById('velos-chat-close').addEventListener('click', closePanel);

  sendBtn.addEventListener('click', function () {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendMessage(text);
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendMessage(text);
    }
  });

  inputEl.addEventListener('input', function () {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

}());
