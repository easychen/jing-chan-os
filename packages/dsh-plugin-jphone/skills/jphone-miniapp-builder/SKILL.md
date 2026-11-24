---
name: jphone-miniapp-builder
description: Build and install an interactive HTML Mini-App into 鲸Phone (JPhone) desktop using the window.jing bridge.
---

# JPhone Mini-App Builder Skill

When the user asks 小鲸同学 to create a small utility, tracker, game, or dashboard app for 鲸Phone (JPhone):

1. Write a self-contained single-file HTML5 app (inline CSS + JS, mobile-first `390px` viewport, `overflow-x: hidden`, clean iOS aesthetic).
2. **Seamless Top Header & Mobile Scrollbar Polish (IMPORTANT)**:
   - Always declare header colors to match your page background seamlessly via `<meta>` tags AND/OR `window.jing.ui.setHeaderStyle(...)`:
     - `<meta name="jphone-header-bg" content="#0A1328">` (exact top background hex)
     - `<meta name="jphone-header-style" content="light">` (`"light"` white text on dark bg, or `"dark"` dark text on light bg)
     - `<meta name="jphone-header-border" content="transparent">`
   - Set matching `color-scheme: dark` (for dark apps) or `color-scheme: light` (for light apps) on `:root`, and hide desktop scrollbars (`scrollbar-width: none; ::-webkit-scrollbar { display: none; }`) so it feels 100% like a native iOS app.
   - Reserve safe bottom padding (`padding-bottom: 48px`) so content never collides with the bottom edge or floating AssistiveTouch bubble.
3. Use the real `window.jing` bridge automatically injected by the JPhone container (all methods below are live and verified):
   - **Persistent KV Storage** (scoped per Mini-App):
     - `await window.jing.storage.get(key)` / `await window.jing.storage.set(key, value)` / `await window.jing.storage.delete(key)` / `await window.jing.storage.keys()`
     - Also aliased as `window.jing.db.get / set / delete / keys`
   - **Chat & Background Task Dispatch**:
     - `await window.jing.chat.send(text)` — send a message to 小鲸同学 in main chat
     - `await window.jing.chat.ask(prompt, { background?: boolean, title?: string, preset?: string })` — ask 小鲸同学 directly (`background: false`) or dispatch a non-blocking DSH background task (`background: true`)
     - `await window.jing.tasks.dispatch(title, prompt, preset)` — dispatch a background DSH task directly
   - **Host UI & Notifications**:
     - `window.jing.ui.setHeaderStyle({ backgroundColor, foregroundColor, borderColor, title })` — dynamically style the native Flutter top navigation bar
     - `window.jing.ui.notify(messageOrObj)` — show an in-app iOS floating toast banner (accepts a string or `{ title, body, message }`)
     - `await window.jing.notify.push(event, title, desp)` — trigger an optional Server酱 external push notification (`event`: `'custom' | 'focus_done' | 'diary_post' | 'task_done'`)
   - **Host Background Audio** (survives exiting the Mini-App):
     - `window.jing.audio.setState({ active, playing, title, subtitle, sceneId, sceneLabel })` / `window.jing.audio.onCommand(cb)`
   - **Live Event Bus**:
     - `const unsub = window.jing.events.on('mood' | 'task' | 'notify', cb)` / `window.jing.events.off(type, cb)` / `window.jing.events.emit(type, payload)`
   - **Character State**:
     - `window.jing.character.get()` / `await window.jing.character.setMood(mood, moodText)`
4. Install the generated Mini-App onto the JPhone virtual desktop by calling `jphone_install_miniapp` (or `POST /jphone/api/miniapps`).
5. Keep permissions minimal in the manifest (`storage`, `chat.ask`, `ui.notify`) and never rely on external CDN scripts that fail offline.
