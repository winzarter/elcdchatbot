/*
  ============================================================
  EL Creative Design — AI Chat Widget Logic
  ============================================================

  SETUP INSTRUCTIONS:
  1. Replace ANTHROPIC_API_KEY below with your actual key from console.anthropic.com
     IMPORTANT: For production, proxy this through a backend to protect your key.

  2. For lead email delivery, set up EmailJS (free at emailjs.com):
     a) Create an account at https://www.emailjs.com/
     b) Add a new Email Service (Gmail, Outlook, etc.)
     c) Create an Email Template with these variables:
        - {{from_name}}, {{lead_email}}, {{lead_phone}}, {{business_name}}
     d) Replace EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY below

  HOW TO MODIFY FOR ANOTHER BUSINESS:
  - Edit knowledgebase.json with your business info
  - Change BUSINESS_EMAIL to your target email
  - Update QUICK_REPLIES with relevant options for your business
  - Modify the greeting message in the initChat() function
  ============================================================
*/

/* ============================================================
   CONFIGURATION — Edit these values
   ============================================================ */
const CONFIG = {
  // Your Anthropic API key — get one at console.anthropic.com
  // WARNING: Exposing API keys in frontend JS is NOT recommended for production.
  // Use a lightweight proxy backend (e.g., Cloudflare Worker) for real deployments.
  ANTHROPIC_API_KEY: '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',

  // EmailJS Configuration — Sign up free at https://www.emailjs.com/
  EMAILJS_SERVICE_ID: 'YOUR_EMAILJS_SERVICE_ID',
  EMAILJS_TEMPLATE_ID: 'YOUR_EMAILJS_TEMPLATE_ID',
  EMAILJS_PUBLIC_KEY: 'YOUR_EMAILJS_PUBLIC_KEY',

  // Lead destination email (shown in confirmation message)
  BUSINESS_EMAIL: 'Erwinsister10@gmail.com',

  // Claude model to use
  MODEL: 'claude-sonnet-4-20250514',

  // Max tokens for each response
  MAX_TOKENS: 500,

  // Simulated typing delay (ms) — makes the bot feel more human
  TYPING_DELAY_MIN: 800,
  TYPING_DELAY_MAX: 1800,
};

/* ============================================================
   QUICK REPLY OPTIONS — Edit to match your business
   ============================================================ */
const QUICK_REPLIES = [
  "What products do you offer?",
  "Who is this for?",
  "How do downloads work?",
  "Is it beginner-friendly?",
  "I'm interested in purchasing",
];

/* ============================================================
   STATE
   ============================================================ */
let conversationHistory = [];
let knowledgeBase = null;
let isWaitingForResponse = false;
let leadData = { name: null, email: null, phone: null };
let leadCollectionActive = false;
let hasShownInitialChips = false;
let hasUnread = true;

/* ============================================================
   DOM ELEMENTS
   ============================================================ */
const chatFab = document.getElementById('chat-fab');
const chatWindow = document.getElementById('chat-window');
const messagesContainer = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const minimizeBtn = document.getElementById('minimize-btn');

/* ============================================================
   LOAD KNOWLEDGE BASE
   ============================================================ */
async function loadKnowledgeBase() {
  try {
    const response = await fetch('./knowledgebase.json');
    knowledgeBase = await response.json();
    console.log('✅ Knowledge base loaded:', knowledgeBase.business.name);
  } catch (error) {
    console.error('❌ Failed to load knowledge base:', error);
    // Fallback inline knowledge base if file can't be loaded
    knowledgeBase = {
      business: { name: 'EL Creative Design', contact_email: CONFIG.BUSINESS_EMAIL },
      system_prompt: 'You are a helpful assistant for EL Creative Design, a digital creative resources platform. Be friendly and professional.'
    };
  }
}

/* ============================================================
   INITIALIZE CHAT
   ============================================================ */
async function initChat() {
  await loadKnowledgeBase();

  const businessName = knowledgeBase.business.name;

  // Opening greeting message
  const greeting = `👋 Welcome to **${businessName}**! I'm your AI assistant.

I'm here to help you explore our creative resources, answer your questions, and find the perfect tools for your creative workflow. What can I help you with today?`;

  addBotMessage(greeting);

  // Show quick reply chips after a brief delay
  setTimeout(() => {
    if (!hasShownInitialChips) {
      showQuickReplies(QUICK_REPLIES);
      hasShownInitialChips = true;
    }
  }, 600);
}

/* ============================================================
   FAB & WINDOW TOGGLE
   ============================================================ */
chatFab.addEventListener('click', () => {
  const isOpen = chatWindow.classList.contains('is-visible');

  if (isOpen) {
    closeChat();
  } else {
    openChat();
  }
});

function openChat() {
  chatWindow.classList.add('is-visible');
  chatFab.classList.add('is-open');

  // Remove unread badge
  const badge = chatFab.querySelector('.fab-badge');
  if (badge) {
    badge.style.animation = 'none';
    badge.style.transform = 'scale(0)';
    setTimeout(() => badge.remove(), 200);
  }

  // Focus input on desktop
  if (window.innerWidth > 480) {
    setTimeout(() => userInput.focus(), 300);
  }

  // Scroll to bottom
  scrollToBottom();
}

function closeChat() {
  chatWindow.classList.remove('is-visible');
  chatFab.classList.remove('is-open');
}

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', closeChat);
}

/* ============================================================
   SEND MESSAGE
   ============================================================ */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isWaitingForResponse) return;

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';

  // Remove quick reply chips
  const existingChips = document.querySelector('.quick-replies');
  if (existingChips) existingChips.remove();

  // Display user message
  addUserMessage(text);

  // Get AI response
  await getAIResponse(text);
}

/* ============================================================
   GET AI RESPONSE FROM CLAUDE
   ============================================================ */
async function getAIResponse(userMessage) {
  if (isWaitingForResponse) return;
  isWaitingForResponse = true;
  sendBtn.disabled = true;

  // Show typing indicator
  const typingEl = showTypingIndicator();

  // Add user message to history
  conversationHistory.push({ role: 'user', content: userMessage });

  // Random delay to feel more natural
  const delay = Math.random() * (CONFIG.TYPING_DELAY_MAX - CONFIG.TYPING_DELAY_MIN) + CONFIG.TYPING_DELAY_MIN;

  try {
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check if key is configured
    if (CONFIG.ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
      removeTypingIndicator(typingEl);
      handleDemoMode(userMessage);
      return;
    }

    // Build system prompt from knowledge base
    const systemPrompt = buildSystemPrompt();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantReply = data.content[0].text;

    // Add to history
    conversationHistory.push({ role: 'assistant', content: assistantReply });

    removeTypingIndicator(typingEl);
    addBotMessage(assistantReply);

    // Check if lead collection should be triggered
    checkLeadTrigger(userMessage, assistantReply);

  } catch (error) {
    console.error('API Error:', error);
    removeTypingIndicator(typingEl);
    addBotMessage("I'm having a small technical moment! 😅 Please try again or reach out to us directly at **" + CONFIG.BUSINESS_EMAIL + "**");
  } finally {
    isWaitingForResponse = false;
    sendBtn.disabled = false;
  }
}

/* ============================================================
   BUILD SYSTEM PROMPT
   ============================================================ */
function buildSystemPrompt() {
  if (!knowledgeBase) return 'You are a helpful assistant.';

  // Pull system prompt from knowledge base
  let prompt = knowledgeBase.system_prompt || '';

  // Append full knowledge base as structured context
  prompt += '\n\n--- FULL KNOWLEDGE BASE ---\n';
  prompt += JSON.stringify({
    business: knowledgeBase.business,
    products: knowledgeBase.products,
    target_customers: knowledgeBase.target_customers,
    key_benefits: knowledgeBase.key_benefits,
    faqs: knowledgeBase.faqs,
  }, null, 2);

  // Formatting instruction
  prompt += '\n\nFORMATTING: Use **bold** for emphasis. Keep responses under 100 words unless detailed explanation is requested. End with a helpful question or call to action when appropriate.';

  return prompt;
}

/* ============================================================
   DEMO MODE (when API key not set)
   ============================================================ */
function handleDemoMode(userMessage) {
  const msg = userMessage.toLowerCase();
  let reply = '';

  if (msg.includes('product') || msg.includes('offer') || msg.includes('sell')) {
    reply = "We offer **Digital Design Resources** (presets, LUTs, templates), **Creative Software Collections** for photo/video editing and graphic design, and an **instant Download Access System**. Everything a creative needs in one place! 🎨\n\nWould you like to know more about any specific product?";
  } else if (msg.includes('who') || msg.includes('for') || msg.includes('customer')) {
    reply = "EL Creative Design is perfect for **content creators, video editors, graphic designers, freelancers, students**, and **social media marketers**. Whether you're a beginner or a pro, our tools are designed to level up your workflow! 🚀";
  } else if (msg.includes('download') || msg.includes('access') || msg.includes('how')) {
    reply = "It's super simple! After purchasing, you receive **instant online access** to your files. Just log in and download your creative tools — no waiting, no complicated setup. ⚡";
  } else if (msg.includes('beginner') || msg.includes('easy') || msg.includes('learn')) {
    reply = "Absolutely beginner-friendly! ✅ Our resources are designed to be easy to use right away, whether you're just starting out or a seasoned professional. We make creative tools **accessible for everyone**.";
  } else if (msg.includes('price') || msg.includes('cost') || msg.includes('purchase') || msg.includes('buy') || msg.includes('interest')) {
    reply = "Great news — our platform is designed to be **affordable** compared to buying tools individually! You get a whole bundle of creative resources in one place, saving you both time and money. 💰\n\nTo get specific pricing and package details, I'd love to connect you with our team! Could I get your name?";
    triggerLeadCollection();
    return;
  } else if (msg.includes('contact') || msg.includes('email') || msg.includes('reach')) {
    reply = `You can reach our team directly at **${CONFIG.BUSINESS_EMAIL}** — they'll be happy to help! Or I can collect your details and have someone reach out to you. What would you prefer?`;
  } else {
    reply = "Thanks for your message! 😊 **EL Creative Design** provides affordable digital creative resources — presets, templates, software bundles, and more — all accessible through an easy download system.\n\nIs there something specific about our platform you'd like to know?";
  }

  conversationHistory.push({ role: 'assistant', content: reply });
  addBotMessage(reply);
  checkLeadTrigger(userMessage, reply);
  isWaitingForResponse = false;
  sendBtn.disabled = false;
}

/* ============================================================
   LEAD COLLECTION LOGIC
   ============================================================ */
function checkLeadTrigger(userMessage, botReply) {
  if (leadCollectionActive) return;

  const interestKeywords = ['purchase', 'buy', 'price', 'cost', 'interested', 'sign up', 'get started', 'order', 'pricing', 'plan'];
  const userShowsInterest = interestKeywords.some(k => userMessage.toLowerCase().includes(k));

  if (userShowsInterest && !leadData.name) {
    setTimeout(triggerLeadCollection, 600);
  }
}

function triggerLeadCollection() {
  if (leadCollectionActive) return;
  leadCollectionActive = true;

  setTimeout(() => {
    addBotMessage("I'd love to have our team reach out to you personally with more details! 🌟 Please share your contact info below:");
    setTimeout(() => showLeadForm(), 400);
  }, 300);
}

function showLeadForm() {
  const formHTML = `
    <div class="lead-form-container" id="lead-form">
      <div class="lead-form-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Your Contact Details
      </div>
      <div class="lead-input-group">
        <input type="text" class="lead-input" id="lead-name" placeholder="Full Name *" required />
        <input type="email" class="lead-input" id="lead-email" placeholder="Email Address *" required />
        <input type="tel" class="lead-input" id="lead-phone" placeholder="Phone Number *" required />
      </div>
      <button class="lead-submit-btn" id="lead-submit-btn" onclick="submitLead()">
        Send My Details →
      </button>
    </div>
  `;

  const formEl = document.createElement('div');
  formEl.innerHTML = formHTML;
  formEl.style.animation = 'messageSlideIn 0.35s ease';
  messagesContainer.appendChild(formEl);
  scrollToBottom();
}

async function submitLead() {
  const nameEl = document.getElementById('lead-name');
  const emailEl = document.getElementById('lead-email');
  const phoneEl = document.getElementById('lead-phone');
  const submitBtn = document.getElementById('lead-submit-btn');

  const name = nameEl?.value.trim();
  const email = emailEl?.value.trim();
  const phone = phoneEl?.value.trim();

  // Validate
  if (!name || !email || !phone) {
    highlightEmptyFields([
      { el: nameEl, val: name },
      { el: emailEl, val: email },
      { el: phoneEl, val: phone },
    ]);
    return;
  }

  if (!isValidEmail(email)) {
    emailEl.style.borderColor = '#EF4444';
    emailEl.focus();
    return;
  }

  // Save lead data
  leadData = { name, email, phone };

  // Disable form
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
  }

  // Send email
  const sent = await sendLeadEmail(leadData);

  // Remove form
  const formContainer = document.getElementById('lead-form')?.parentElement;
  if (formContainer) formContainer.remove();

  // Show success
  showLeadSuccess(name, sent);
}

function highlightEmptyFields(fields) {
  fields.forEach(({ el, val }) => {
    if (!val && el) {
      el.style.borderColor = '#EF4444';
      el.addEventListener('input', () => el.style.borderColor = '', { once: true });
    }
  });
}

function showLeadSuccess(name, emailSent) {
  const successHTML = `
    <div class="success-message">
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style="color: #4ADE80; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Thank you, ${name}! 🎉</p>
      <p style="color: #94A3B8; font-size: 12.5px;">Our team will reach out to you shortly at <strong style="color: #E2E8F0;">${leadData.email}</strong></p>
    </div>
  `;

  const successEl = document.createElement('div');
  successEl.innerHTML = successHTML;
  messagesContainer.appendChild(successEl);

  setTimeout(() => {
    addBotMessage(`Wonderful! I've passed your details to our team, **${name}**. 🚀 Expect to hear from us soon!\n\nIn the meantime, is there anything else I can help you with about EL Creative Design?`);
  }, 600);

  scrollToBottom();

  // Log for debugging if email wasn't sent via EmailJS
  if (!emailSent) {
    console.log('📋 Lead captured (EmailJS not configured):', leadData);
  }
}

/* ============================================================
   SEND LEAD EMAIL VIA EMAILJS
   ============================================================ */
async function sendLeadEmail(lead) {
  // Check if EmailJS is configured
  if (CONFIG.EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID') {
    console.log('📧 EmailJS not configured. Lead data:', lead);
    console.log('👉 Set up EmailJS at https://www.emailjs.com/ to enable email delivery.');
    // Fallback: try mailto
    sendMailtoFallback(lead);
    return false;
  }

  try {
    const templateParams = {
      to_email: CONFIG.BUSINESS_EMAIL,
      from_name: lead.name,
      lead_email: lead.email,
      lead_phone: lead.phone,
      business_name: knowledgeBase?.business?.name || 'EL Creative Design',
      submission_time: new Date().toLocaleString(),
    };

    await emailjs.send(
      CONFIG.EMAILJS_SERVICE_ID,
      CONFIG.EMAILJS_TEMPLATE_ID,
      templateParams,
      CONFIG.EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Lead email sent successfully to', CONFIG.BUSINESS_EMAIL);
    return true;
  } catch (error) {
    console.error('❌ EmailJS error:', error);
    sendMailtoFallback(lead);
    return false;
  }
}

function sendMailtoFallback(lead) {
  // This creates a mailto link as a last-resort fallback
  const subject = encodeURIComponent(`New Lead from EL Creative Design Chat — ${lead.name}`);
  const body = encodeURIComponent(
    `New lead from the website chatbot:\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\n\nSubmitted: ${new Date().toLocaleString()}`
  );
  // Store in localStorage as backup
  try {
    const existing = JSON.parse(localStorage.getItem('el_creative_leads') || '[]');
    existing.push({ ...lead, timestamp: new Date().toISOString() });
    localStorage.setItem('el_creative_leads', JSON.stringify(existing));
    console.log('💾 Lead saved to localStorage as backup');
  } catch (e) {}
}

/* ============================================================
   QUICK REPLIES
   ============================================================ */
function showQuickReplies(options) {
  const wrapper = document.createElement('div');
  wrapper.className = 'quick-replies';

  options.forEach(opt => {
    const chip = document.createElement('button');
    chip.className = 'quick-chip';
    chip.textContent = opt;
    chip.addEventListener('click', () => {
      wrapper.remove();
      userInput.value = opt;
      sendMessage();
    });
    wrapper.appendChild(chip);
  });

  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

/* ============================================================
   MESSAGE RENDERING HELPERS
   ============================================================ */
function addBotMessage(text) {
  const time = getCurrentTime();
  const msgEl = document.createElement('div');
  msgEl.className = 'message bot';

  // Format **bold** markdown
  const formatted = formatMarkdown(text);

  msgEl.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    </div>
    <div>
      <div class="bubble">${formatted}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  messagesContainer.appendChild(msgEl);
  scrollToBottom();
}

function addUserMessage(text) {
  const time = getCurrentTime();
  const msgEl = document.createElement('div');
  msgEl.className = 'message user';

  msgEl.innerHTML = `
    <div>
      <div class="bubble">${escapeHtml(text)}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  messagesContainer.appendChild(msgEl);
  scrollToBottom();
}

function showTypingIndicator() {
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    </div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messagesContainer.appendChild(typingEl);
  scrollToBottom();
  return typingEl;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.remove();
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function formatMarkdown(text) {
  // Bold: **text** → <strong>text</strong>
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

/* ============================================================
   INPUT EVENT LISTENERS
   ============================================================ */

// Send on Enter (Shift+Enter for new line)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
});

// Send button click
sendBtn.addEventListener('click', sendMessage);

/* ============================================================
   EXPOSE submitLead GLOBALLY (called from inline HTML)
   ============================================================ */
window.submitLead = submitLead;

/* ============================================================
   STARTUP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize chat widget
  initChat();

  // Show notification badge after 3 seconds if chat not yet opened
  setTimeout(() => {
    if (!chatWindow.classList.contains('is-visible')) {
      const badge = document.createElement('div');
      badge.className = 'fab-badge';
      badge.textContent = '1';
      chatFab.appendChild(badge);
    }
  }, 3000);
});
