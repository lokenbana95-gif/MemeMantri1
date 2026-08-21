MemeMantri browser-only voice setup
AI-persona narration
The final build does not need an API key or a TTS provider. It uses the browser's Web Speech API and presents tuned AI-like personas such as News Anchor, Radio Jockey, Bollywood Narrator, Cricket Commentator, Stand-up Comic, Roast Master, Desi Uncle, Desi Aunty, Dada, and Dadi.
Each persona has its own language preference, gender-oriented voice matching, pitch, rate, punctuation cleanup, sentence splitting, and pause timing. The app detects installed voices, scores them for Hindi/Indian language and gender clues, and avoids reusing the same installed voice during persona assignment when alternatives exist.
The actual vocal timbre still depends on the voices installed in the operating system and exposed by the browser. If only one system voice is available, all personas will necessarily share that underlying timbre, but their delivery, pitch, rate, wording cleanup, and pauses will differ. To get more genuine timbre differences without an API, install multiple Hindi/Indian or male/female voice packs in the device speech settings and reload the page.
Online Meme Adda
True random chat between different users cannot be delivered by static files alone. The included server.js is the small chat-only component: it serves the static files and pairs waiting Socket.IO clients in memory. It does not handle TTS, require an API key, or store chat history.
From this directory, run:
Bash
npm install
npm start
Then open http://localhost:3000/. For two people to use the same random chat online, deploy this directory to any Node-compatible HTTPS host and set ALLOWED_ORIGIN if you want to restrict which website can connect:
Bash
ALLOWED_ORIGIN="https://your-website.example" npm start
If the website and chat server use different domains, set this line before mm.js in index.html:
HTML
<script>window.MEME_CHAT_SERVER_URL = "https://your-chat-domain.example";</script>
Use HTTPS in production because browsers can block mixed-content realtime requests when the website is HTTPS but the chat server is HTTP.
Global Memes page
global.html is a separate page for country-wise, continent-wise, universal, and extra regional memes. Its search, filters, likes, plays, and browser persona narration run independently from the main page.