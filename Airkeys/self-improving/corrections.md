# AirKeys - Corrections & Lessons Learned

## Known Issues & Fixes
- **OS Key Repeat Bug:** Holding the global hotkey triggers OS key repeat (e.g. every 500ms then 30ms). This causes the toggle logic to fire twice and stop recording instantly. **Fix:** Implemented a 600ms debounce in `widget.ts` and updated docs to clarify it's a "press once to start, press again to stop" (toggle) interaction, not Push-To-Talk.
- **Vite Dev Server Conflicts:** Running multiple instances of `npm run dev` leaves zombie `electron.exe` processes that steal the global hotkey and dev server port. Always ensure stray processes are killed before restarting.
