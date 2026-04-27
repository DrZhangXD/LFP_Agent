
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure `.env.local` (multi-provider LLM supported):
   ```bash
   # Provider: gemini | openai | anthropic | openai_compatible
   VITE_LLM_PROVIDER=gemini

   # Gemini
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_GEMINI_MODEL=gemini-2.5-flash

   # OpenAI
   # VITE_LLM_PROVIDER=openai
   # VITE_OPENAI_API_KEY=your_openai_key
   # VITE_OPENAI_MODEL=gpt-4.1-mini

   # Anthropic
   # VITE_LLM_PROVIDER=anthropic
   # VITE_ANTHROPIC_API_KEY=your_anthropic_key
   # VITE_ANTHROPIC_MODEL=claude-3-5-sonnet-latest

   # OpenAI-compatible (e.g. local gateway)
   # VITE_LLM_PROVIDER=openai_compatible
   # VITE_OPENAI_COMPAT_BASE_URL=http://localhost:11434/v1
   # VITE_OPENAI_COMPAT_API_KEY=optional_or_required_by_gateway
   # VITE_OPENAI_COMPAT_MODEL=llama-3.1-70b-instruct
   ```
3. Run the app:
   `npm run dev`
