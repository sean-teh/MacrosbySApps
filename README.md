# 🥩 Macros by S. Apps 

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)

**An AI-Powered Progressive Web App (PWA) for frictionless, minimalist nutritional tracking.**

👉 **[Live Demo: Play with the App Here!](https://macrosby-s-apps.vercel.app)**

---

## 📖 The Philosophy
Traditional fitness applications suffer from feature bloat, leading to user fatigue. **Macros by S. Apps** was engineered around a streamlined, highly deliberate nutritional strategy:
1. **Calories:** For basic thermodynamic weight management.
2. **Protein:** For muscle preservation and high satiety.
3. **Fibre:** The underrated macro—promoting gut health and stable blood glucose without the stress of micro-managing complex carbohydrates.

## ✨ Core Features
* **Zero-Friction Onboarding:** Utilizes Firebase Anonymous Auth so users can start logging meals instantly without hitting a "Sign Up" wall.
* **AI "Guesstimation" Engine:** Powered by Google's `gemini-1.5-flash` model. Users can simply type *"A bowl of chicken fried rice"* or upload a photo, and the AI strictly formats the estimated macros into the database.
* **Resilient Fallbacks:** Implemented robust `try/catch` error handling to provide mock data and prevent app crashes during network limits or API outages.
* **Progressive Web App (PWA):** Fully installable on Android/iOS via the browser, featuring a standalone native UI, caching, and a mobile-first design.

## 🛠️ Read the Engineering Case Study
This project involved navigating cloud architecture, dependency conflicts, and strict AI JSON formatting. 

I have documented the entire step-by-step build process, my UX intuition, and how I solved DevOps hurdles (like Vite 8 peer-dependency crashes and Vercel routing issues) in a detailed post-mortem.

👉 **[Read the Detailed Engineering & Product Log Here](./ENGINEERING_LOG.md)**

---

## 💻 Running Locally

If you'd like to clone and run this project locally:

1. Clone the repository:
   ```bash
   git clone [https://github.com/YourUsername/YourRepoName.git](https://github.com/YourUsername/YourRepoName.git)
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
