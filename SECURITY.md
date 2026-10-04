# 🔒 SECURITY NOTICE

## API Key Security

⚠️ **IMPORTANT**: An API key was previously exposed in this repository's documentation files and has been removed.

### If you downloaded/cloned this repository before this commit:
1. **DO NOT USE** the previously exposed key (starts `AIzaSyCUInx2…`). It has been revoked. If you ever find a live key in an old clone, rotate it immediately.
2. Generate your own API keys from the respective services

### Security Best Practices Implemented:
- ✅ Removed all exposed API keys from documentation
- ✅ Enhanced `.gitignore` to prevent future key exposure
- ✅ All sensitive data now uses placeholder values
- ✅ Added security patterns to prevent accidental commits

### How to Safely Use API Keys:
1. Create a `.env` file locally (it's in `.gitignore`)
2. Add your keys to `.env`:
   ```
   GEMINI_API_KEY=your_actual_key_here
   OPENAI_API_KEY=your_actual_key_here
   ```
3. Never commit `.env` files to version control
4. Use environment variables in production (Railway, Vercel, etc.)

### Reporting Security Issues
If you find any security vulnerabilities, please report them privately by opening an issue with the label "security".

---
*Last updated: July 14, 2025*
