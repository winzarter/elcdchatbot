# 🎨 EL Creative Design — AI Chat Widget

A fully functional AI-powered chat assistant for the EL Creative Design website.
Built with Claude AI (Anthropic), EmailJS for lead delivery, and zero backend required.

---

## 📁 File Structure

```
EL-Creative-Chatbot/
├── index.html          ← Main page / widget container
├── style.css           ← All styles & animations
├── chatbot.js          ← AI logic, lead collection, email sending
├── knowledgebase.json  ← Business info & AI instructions
└── README.md           ← This file
```

---

## 🚀 Quick Setup (3 Steps)

### Step 1 — Get Your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and generate an API key
3. Open `chatbot.js` and replace:
   ```js
   ANTHROPIC_API_KEY: 'YOUR_ANTHROPIC_API_KEY_HERE',
   ```
   with your actual key.

> ⚠️ **Security Note**: For production, don't expose API keys in frontend JS.
> Use a lightweight proxy like a Cloudflare Worker or Vercel Edge Function.

---

### Step 2 — Set Up EmailJS (Free Lead Email Delivery)
1. Sign up at [emailjs.com](https://www.emailjs.com/) (free plan works)
2. Add an **Email Service** (connect your Gmail/Outlook)
3. Create an **Email Template** with these variables:
   ```
   To: {{to_email}}
   Subject: New Lead from EL Creative Design Chat — {{from_name}}

   Name: {{from_name}}
   Email: {{lead_email}}
   Phone: {{lead_phone}}
   Business: {{business_name}}
   Time: {{submission_time}}
   ```
4. Copy your Service ID, Template ID, and Public Key into `chatbot.js`:
   ```js
   EMAILJS_SERVICE_ID: 'service_xxxxxxx',
   EMAILJS_TEMPLATE_ID: 'template_xxxxxxx',
   EMAILJS_PUBLIC_KEY: 'xxxxxxxxxxxx',
   ```

---

### Step 3 — Deploy to GitHub Pages
1. Create a new GitHub repository
2. Upload all 4 files
3. Go to **Settings → Pages → Source → Deploy from main branch**
4. Your chatbot will be live at `https://yourusername.github.io/repo-name/`

---

## 🎨 Customizing for Another Business

### Change Business Info → `knowledgebase.json`
```json
{
  "business": {
    "name": "Your Business Name",
    "description": "What your business does...",
    "contact_email": "your@email.com"
  },
  "products": [...],
  "system_prompt": "You are an assistant for..."
}
```

### Change Brand Colors → `style.css`
```css
:root {
  --accent-primary: #7C3AED;     /* Change to your brand color */
  --accent-secondary: #06B6D4;   /* Change to your accent color */
  --gradient-start: #4F1D96;     /* Header gradient start */
  --gradient-end: #0E7490;       /* Header gradient end */
}
```

### Change Quick Reply Chips → `chatbot.js`
```js
const QUICK_REPLIES = [
  "What do you offer?",
  "Your custom question here",
  ...
];
```

### Change Bot Name → `index.html`
```html
<div class="bot-name">Your Bot Name</div>
```

---

## 📧 Lead Flow

When a customer shows buying interest, the chatbot:
1. Naturally asks for their **name, email, and phone number**
2. Shows a clean inline form in the chat
3. Sends details to `Erwinsister10@gmail.com` via EmailJS
4. Stores a backup in `localStorage` if email fails
5. Confirms to the customer that the team will reach out

---

## 🛡️ Demo Mode

If the Anthropic API key is not set, the chatbot runs in **Demo Mode** with smart keyword-based responses from the knowledge base. This is useful for testing the UI and flow without API credits.

---

## 📱 Mobile Responsive

The chat widget automatically goes **full screen on mobile** (< 480px), providing a native app-like experience.

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Chatbot doesn't respond | Check API key in `chatbot.js` |
| Lead email not received | Verify EmailJS service/template IDs |
| Knowledge base not loading | Ensure `knowledgebase.json` is in the same folder |
| CORS errors | Deploy to a web server (not file://) |

---

Built for **EL Creative Design** · Powered by **Claude AI**
