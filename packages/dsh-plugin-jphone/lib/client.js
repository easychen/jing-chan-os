/**
 * 鲸Phone (JPhone) DSH Client Overlay
 * Animated Sprite-Sheet Mini-Pet (with drag/throw physics, autonomous stroll,
 * speech bubbles & right-click menu) + Expandable iPhone 16 Pro Shell.
 *
 * Pet animation & interaction architecture inspired by PC2005-cloud/dsh-pet
 * (MIT: https://github.com/PC2005-cloud/dsh-pet).
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-jphone',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { useState, useEffect, useRef, useCallback } = React
    const h = React.createElement

    const SPRITE_VER = 'm2v1'
    const SPRITES = {
      // 6 calm standing micro-idle strips (unified Seedream 5.5 2-head chibi, exact 192px height & baseline y=242)
      idle: {
        url: `/jphone/assets/character/sprites/sprite_idle.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [1650, 920, 170, 980],
      },
      idle_sway: {
        url: `/jphone/assets/character/sprites/sprite_idle_sway.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [680, 760, 680, 760],
      },
      idle_hair: {
        url: `/jphone/assets/character/sprites/sprite_idle_hair.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [520, 560, 740, 520],
      },
      idle_pose: {
        url: `/jphone/assets/character/sprites/sprite_idle_pose.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [760, 840, 760, 840],
      },
      idle_drowsy: {
        url: `/jphone/assets/character/sprites/sprite_idle_drowsy.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [640, 680, 780, 580],
      },
      idle_look: {
        url: `/jphone/assets/character/sprites/sprite_idle_look.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [620, 780, 560, 780],
      },
      // Interactive & activity poses (strictly proportion-matched 2-head chibi)
      happy: {
        url: `/jphone/assets/character/sprites/sprite_happy.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [155, 165, 240, 195],
      },
      wave: {
        url: `/jphone/assets/character/sprites/sprite_wave.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [240, 220, 340, 260],
      },
      tea: {
        url: `/jphone/assets/character/sprites/sprite_tea.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [560, 680, 760, 620],
      },
      music: {
        url: `/jphone/assets/character/sprites/sprite_music.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [280, 280, 280, 280],
      },
      working: {
        url: `/jphone/assets/character/sprites/sprite_working.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [360, 320, 460, 340],
      },
      thinking: {
        url: `/jphone/assets/character/sprites/sprite_working.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [400, 360, 520, 380],
      },
      sleepy: {
        url: `/jphone/assets/character/sprites/sprite_sleepy.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [780, 680, 880, 680],
      },
      // True 8-direction walk sprites (front, back, 3/4 down-right, 3/4 up-right)
      walk_down: {
        url: `/jphone/assets/character/sprites/sprite_walk_down.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [160, 160, 160, 160],
      },
      walk_up: {
        url: `/jphone/assets/character/sprites/sprite_walk_up.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [160, 160, 160, 160],
      },
      walk_dr: {
        url: `/jphone/assets/character/sprites/sprite_walk_dr.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [160, 160, 160, 160],
      },
      walk_ur: {
        url: `/jphone/assets/character/sprites/sprite_walk_ur.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [160, 160, 160, 160],
      },
      walk: {
        url: `/jphone/assets/character/sprites/sprite_walk_dr.png?v=${SPRITE_VER}`,
        frames: 4,
        durations: [160, 160, 160, 160],
      },
    }

    const CALM_IDLE_ACTIONS = ['idle_sway', 'idle_hair', 'idle_pose', 'idle_drowsy', 'idle_look']
    const WALK_ACTIONS = new Set(['walk', 'walk_down', 'walk_up', 'walk_dr', 'walk_ur'])
    const TEA_LINES = [
      '泡杯海盐乌龙茶，一起歇一歇吧 ☕',
      '深海特调热茶真香～工作也要记得喝水哦！',
      '咕噜咕噜…补满茶香能量继续写代码 ✨',
    ]
    const WAVE_LINES = [
      '嗨嗨～小鲸同学在这里陪着你呢！',
      '招招手～需要打开小鲸同学 随时点我哦 👋',
    ]
    const MUSIC_LINES = [
      '戴上耳机一起听 Lo-Fi，进入深海心流吧 🎧',
      '这首节奏真舒服～摇头晃脑中 ♪',
    ]

    function pickWalkDirSprite(dx, dy) {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx < ady * 0.45) {
        return dy >= 0 ? { action: 'walk_down', facing: 1 } : { action: 'walk_up', facing: 1 }
      }
      if (dy < -adx * 0.32) {
        return { action: 'walk_ur', facing: dx >= 0 ? 1 : -1 }
      }
      return { action: 'walk_dr', facing: dx >= 0 ? 1 : -1 }
    }

    const POKE_LINES = [
      '嘿嘿，点我一下就能打开小鲸同学 哦～',
      '小鲸同学随时待命！重活尽管派给我～',
      '呀，痒痒的！要一起手搓个小应用吗？',
      '今天的代码也在深海里闪闪发光呢 ✨',
    ]

    const SIZE_PRESETS = { sm: 108, md: 136, lg: 168 }

    function prefersMov() {
      const ua = navigator.userAgent || ''
      if (/iPhone|iPad|iPod/i.test(ua)) return true
      if (/Chrome|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua)) return false
      return /Mac/i.test(navigator.platform || ua)
    }

    function clampPos(x, y, size) {
      const margin = 12
      const maxX = Math.max(margin, window.innerWidth - size - margin)
      const maxY = Math.max(margin, window.innerHeight - size - margin)
      return {
        x: Math.max(margin, Math.min(maxX, x)),
        y: Math.max(margin, Math.min(maxY, y)),
      }
    }

    function defaultCornerPos(size) {
      return clampPos(window.innerWidth - size - 24, window.innerHeight - size - 16, size)
    }

    function loadSavedSize() {
      try {
        const s = localStorage.getItem('jphone_pet_size_v3')
        if (s && SIZE_PRESETS[s]) return s
      } catch {}
      return 'md'
    }

    const PHONE_BASE_W = 390
    const PHONE_BASE_H = 816
    const PHONE_MIN_SCALE = 0.64 // ~250px width; below 0.62 auto-collapses into mini-pet
    const PHONE_COLLAPSE_SCALE = 0.62
    const PHONE_MAX_SCALE = 1.14

    function clampPhoneRect(x, y, scale) {
      const sc = Math.max(0.50, Math.min(PHONE_MAX_SCALE, scale))
      const w = PHONE_BASE_W * sc
      const h = Math.min(PHONE_BASE_H * sc, window.innerHeight - 28)
      const maxX = Math.max(12, window.innerWidth - w - 12)
      const maxY = Math.max(12, window.innerHeight - h - 12)
      return {
        x: Math.max(54, Math.min(maxX, x)),
        y: Math.max(14, Math.min(maxY, y)),
        scale: sc,
      }
    }

    function defaultPhoneRect() {
      const fitScale = Math.min(0.94, (window.innerHeight - 36) / PHONE_BASE_H)
      const sc = Math.max(PHONE_MIN_SCALE, fitScale)
      const w = PHONE_BASE_W * sc
      const h = PHONE_BASE_H * sc
      return clampPhoneRect(window.innerWidth - w - 14, Math.max(14, (window.innerHeight - h) / 2), sc)
    }

    function loadSavedPhoneRect() {
      try {
        const raw = localStorage.getItem('jphone_phone_rect_v1')
        if (raw) {
          const p = JSON.parse(raw)
          if (typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.scale === 'number') {
            return clampPhoneRect(p.x, p.y, Math.max(PHONE_MIN_SCALE, p.scale))
          }
        }
      } catch {}
      return defaultPhoneRect()
    }

    function loadSavedPos(size) {
      try {
        const raw = localStorage.getItem('jphone_pet_pos_v3')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            return clampPos(parsed.x, parsed.y, size)
          }
        }
      } catch {}
      return defaultCornerPos(size)
    }

    function loadSavedPhoneOpen() {
      try {
        return localStorage.getItem('jphone_phone_open_v1') === '1'
      } catch {}
      return false
    }

    function ensureOverlayStyles() {
      if (document.getElementById('jphone-overlay-keyframes')) return
      const style = document.createElement('style')
      style.id = 'jphone-overlay-keyframes'
      style.textContent = `
        @keyframes jphonePetBreath {
          0%, 100% { transform: translate3d(0, 0px, 0) scaleY(1); }
          50% { transform: translate3d(0, -3px, 0) scaleY(1.015); }
        }
        @keyframes jphoneSquashLand {
          0% { transform: scaleX(1.13) scaleY(0.87); }
          45% { transform: scaleX(0.95) scaleY(1.05); }
          100% { transform: scaleX(1) scaleY(1); }
        }
        @keyframes jphoneBubbleIn {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        #jphone-pet-bubble {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        #jphone-pet-bubble .jphone-pet-stage {
          transition: filter 180ms ease;
          filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.22));
        }
        #jphone-pet-bubble:hover .jphone-pet-stage {
          filter: drop-shadow(0 12px 18px rgba(15, 23, 42, 0.28));
        }
        @keyframes jphoneMusicGroove {
          0%, 100% { transform: translate3d(0, 0px, 0) rotate(-1.6deg); }
          50% { transform: translate3d(0, -3.5px, 0) rotate(1.6deg); }
        }
        @keyframes jphoneNoteFloat {
          0% { opacity: 0; transform: translate3d(0, 6px, 0) scale(0.82); }
          30% { opacity: 0.95; }
          100% { opacity: 0; transform: translate3d(7px, -16px, 0) scale(1.06); }
        }
        #jphone-pet-bubble.jphone-breathing .jphone-pet-sprite {
          animation: jphonePetBreath 3.2s ease-in-out infinite;
        }
        #jphone-pet-bubble.jphone-vibing .jphone-pet-sprite {
          animation: jphoneMusicGroove 1.08s ease-in-out infinite;
        }
        .jphone-pet-note {
          position: absolute;
          top: 4px;
          right: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #38BDF8;
          text-shadow: 0 2px 8px rgba(56, 189, 248, 0.55);
          pointer-events: none;
          animation: jphoneNoteFloat 2.1s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          #jphone-pet-bubble.jphone-breathing .jphone-pet-sprite,
          #jphone-pet-bubble.jphone-vibing .jphone-pet-sprite,
          .jphone-pet-note {
            animation: none !important;
          }
        }
        #jphone-pet-bubble.jphone-landed .jphone-pet-stage {
          animation: jphoneSquashLand 340ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .jphone-speech-bubble {
          animation: jphoneBubbleIn 180ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
        }
        .jphone-menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          border: none;
          background: transparent;
          color: #1C1C1E;
          font-size: 13px;
          font-weight: 500;
          padding: 7px 11px;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: background 120ms ease;
        }
        .jphone-menu-item:hover {
          background: rgba(0, 122, 255, 0.12);
          color: #007AFF;
        }
        #jphone-collapse-btn {
          opacity: 0.80;
          transition: opacity 150ms ease, transform 150ms ease, background 150ms ease;
        }
        @keyframes jphonePhoneShake {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          15% { transform: translate3d(-11px, -2px, 0) rotate(-2.1deg); }
          32% { transform: translate3d(10px, 2px, 0) rotate(1.9deg); }
          50% { transform: translate3d(-7px, -1px, 0) rotate(-1.3deg); }
          68% { transform: translate3d(5px, 1px, 0) rotate(0.9deg); }
          84% { transform: translate3d(-2px, 0, 0) rotate(-0.4deg); }
        }
        #jphone-phone-shell.jphone-shaking .jphone-phone-frame {
          animation: jphonePhoneShake 540ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .jphone-side-btn {
          opacity: 0.82;
          transition: opacity 150ms ease, transform 150ms ease, background 150ms ease;
        }
        .jphone-side-btn:hover {
          opacity: 1;
          transform: scale(1.08);
          background: rgba(28, 28, 30, 0.94) !important;
        }
        .jphone-side-btn:active {
          transform: scale(0.94);
        }
        #jphone-resize-handle {
          opacity: 0.55;
          transition: opacity 140ms ease, transform 140ms ease;
        }
        #jphone-resize-handle:hover {
          opacity: 1;
          transform: scale(1.12);
        }
      `
      document.head.appendChild(style)
    }

    function JPhoneOverlay(props) {
      const openSessionInDsh = props.openSessionInDsh
      const [phoneOpen, setPhoneOpen] = useState(loadSavedPhoneOpen)
      useEffect(() => {
        try { localStorage.setItem('jphone_phone_open_v1', phoneOpen ? '1' : '0') } catch {}
      }, [phoneOpen])
      const [mood, setMood] = useState('idle')
      const [moodText, setMoodText] = useState('')
      const [activeTasks, setActiveTasks] = useState(0)
      const [musicPlaying, setMusicPlaying] = useState(false)
      const [musicTitle, setMusicTitle] = useState('')
      const musicPlayingRef = useRef(false)
      musicPlayingRef.current = musicPlaying
      const [sizeKey, setSizeKey] = useState(loadSavedSize)
      const petSize = SIZE_PRESETS[sizeKey] || 136

      const [pos, setPos] = useState(() => loadSavedPos(SIZE_PRESETS[loadSavedSize()] || 136))
      const [facing, setFacing] = useState(1) // 1 = right/default, -1 = left
      const [overrideAction, setOverrideAction] = useState(null) // 'walk' | 'happy' | null
      const [frameIdx, setFrameIdx] = useState(0)
      const [dragging, setDragging] = useState(false)
      const [dragTilt, setDragTilt] = useState(0)
      const [landedPulse, setLandedPulse] = useState(false)
      const [bubbleText, setBubbleText] = useState('')
      const [menuPos, setMenuPos] = useState(null)
      const [customVideoUrl, setCustomVideoUrl] = useState(null)
      const [phoneRect, setPhoneRect] = useState(() => loadSavedPhoneRect())
      const [phoneShaking, setPhoneShaking] = useState(false)
      const [consoleOpen, setConsoleOpen] = useState(false)
      const [consoleInfo, setConsoleInfo] = useState(null)
      const [consoleTunnelInput, setConsoleTunnelInput] = useState('')
      const [consoleStatusMsg, setConsoleStatusMsg] = useState('')
      const [tunnelBusy, setTunnelBusy] = useState(false)
      const [lanBusy, setLanBusy] = useState(false)
      const [qrTab, setQrTab] = useState('lan')

      const openConsole = useCallback(async () => {
        setMenuPos(null)
        setConsoleOpen(true)
        setConsoleStatusMsg('')
        try {
          const r = await fetch('/jphone/api/console/info')
          if (r.ok) {
            const d = await r.json()
            setConsoleInfo(d)
            setConsoleTunnelInput((d.pairing && d.pairing.publicUrl) || '')
          }
        } catch {}
      }, [])

      const refreshConsoleInfo = useCallback(async () => {
        try {
          const infoR = await fetch('/jphone/api/console/info')
          if (infoR.ok) {
            const d = await infoR.json()
            setConsoleInfo(d)
            setConsoleTunnelInput((d.pairing && d.pairing.publicUrl) || '')
          }
        } catch {}
      }, [])

      const saveConsoleTunnel = useCallback(async () => {
        try {
          const val = consoleTunnelInput.trim()
          const r = await fetch('/jphone/api/endpoint', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ publicUrl: val, provider: val ? 'custom' : '' }),
          })
          if (r.ok) {
            setConsoleStatusMsg(val ? '已保存公网穿透地址并更新二维码' : '已清空外网地址，二维码已切回局域网直连')
            await refreshConsoleInfo()
          }
        } catch {
          setConsoleStatusMsg('保存失败，请检查 DSH 连接')
        }
      }, [consoleTunnelInput, refreshConsoleInfo])

      const toggleQuickTunnel = useCallback(async () => {
        const running = consoleInfo?.tunnel?.status === 'running'
        setTunnelBusy(true)
        setConsoleStatusMsg(running ? '正在关闭公网穿透...' : '正在启动 Cloudflare Tunnel（约 3~8 秒）...')
        try {
          const r = await fetch(running ? '/jphone/api/tunnel/stop' : '/jphone/api/tunnel/start', {
            method: 'POST',
          })
          const d = await r.json().catch(() => ({}))
          await refreshConsoleInfo()
          if (r.ok && d.ok) {
            if (running) {
              setQrTab('lan')
              setConsoleStatusMsg(
                d.pairing?.lanAvailable
                  ? '已关闭公网穿透，二维码已切换为局域网直连'
                  : '已关闭公网穿透（局域网也未开启，配对二维码已隐藏）'
              )
            } else {
              setQrTab('public')
              setConsoleStatusMsg(`公网穿透已开启：${d.tunnel?.publicUrl || ''}`)
            }
          } else {
            setConsoleStatusMsg(d.tunnel?.error || d.error || '公网穿透操作失败')
          }
        } catch {
          setConsoleStatusMsg('请求公网穿透接口失败，请检查 DSH 连接')
        } finally {
          setTunnelBusy(false)
        }
      }, [consoleInfo, refreshConsoleInfo])

      const toggleLanBridge = useCallback(async () => {
        const currentEnabled = consoleInfo?.pairing?.lanBridgeEnabled !== false
        const nextEnabled = !currentEnabled
        setLanBusy(true)
        setConsoleStatusMsg(nextEnabled ? '正在开启局域网直连（0.0.0.0）...' : '正在关闭局域网直连（切换为仅本机 127.0.0.1）...')
        try {
          const r = await fetch('/jphone/api/bridge/lan', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled: nextEnabled }),
          })
          const d = await r.json().catch(() => ({}))
          await refreshConsoleInfo()
          if (r.ok && d.ok) {
            setConsoleStatusMsg(
              nextEnabled
                ? `局域网直连已开启（${d.pairing?.lanUrl || ''} · 需配对 Token 访问）`
                : '局域网直连已关闭（仅监听 127.0.0.1，局域网设备无法直连）'
            )
          } else {
            setConsoleStatusMsg(d.error || '切换局域网直连失败')
          }
        } catch {
          setConsoleStatusMsg('请求局域网开关失败，请检查 DSH 连接')
        } finally {
          setLanBusy(false)
        }
      }, [consoleInfo, refreshConsoleInfo])

      const exportConsoleBackup = useCallback(async () => {
        try {
          const r = await fetch('/jphone/api/console/export')
          if (!r.ok) return
          const d = await r.json()
          const blob = new Blob([JSON.stringify(d.backup, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `jphone-backup-${new Date().toISOString().slice(0, 10)}.json`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
          setConsoleStatusMsg('已导出完整 JSON 备份')
        } catch {
          setConsoleStatusMsg('导出失败')
        }
      }, [])
      const [shrinkPreview, setShrinkPreview] = useState(false)
      const phoneRectRef = useRef(phoneRect)
      const phoneDragRef = useRef(null)
      const phoneResizeRef = useRef(null)
      phoneRectRef.current = phoneRect

      const iframeRef = useRef(null)
      const posRef = useRef(pos)
      const moodRef = useRef(mood)
      const phoneOpenRef = useRef(phoneOpen)
      const draggingRef = useRef(false)
      const bubbleTimerRef = useRef(null)
      const overrideTimerRef = useRef(null)
      const physicsRafRef = useRef(null)
      const walkRafRef = useRef(null)
      const dragSessionRef = useRef(null)

      posRef.current = pos
      moodRef.current = mood
      phoneOpenRef.current = phoneOpen

      const activeAction = dragging
        ? 'happy'
        : (overrideAction || (musicPlaying && mood === 'idle' ? 'music' : (SPRITES[mood] ? mood : 'idle')))

      // Preload & decode all sprite sheets and retain references so GPU textures stay warm (ZERO flash!)
      const spriteCacheRef = useRef([])
      useEffect(() => {
        ensureOverlayStyles()
        const seen = new Set()
        const loaded = []
        Object.values(SPRITES).forEach((spec) => {
          if (!seen.has(spec.url)) {
            seen.add(spec.url)
            const img = new Image()
            img.decoding = 'async'
            img.src = spec.url
            if (typeof img.decode === 'function') {
              img.decode().catch(() => {})
            }
            loaded.push(img)
          }
        })
        spriteCacheRef.current = loaded
      }, [])

      const showBubble = useCallback((text, durationMs = 4200) => {
        if (!text) return
        setBubbleText(String(text))
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
        if (durationMs > 0) {
          bubbleTimerRef.current = setTimeout(() => {
            setBubbleText('')
          }, durationMs)
        }
      }, [])

      const playTempAction = useCallback((action, durationMs = 2600) => {
        setOverrideAction(action)
        if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current)
        overrideTimerRef.current = setTimeout(() => {
          setOverrideAction((cur) => (cur === action ? null : cur))
        }, durationMs)
      }, [])

      const triggerLandSquash = useCallback(() => {
        setLandedPulse(false)
        requestAnimationFrame(() => {
          setLandedPulse(true)
          setTimeout(() => setLandedPulse(false), 360)
        })
      }, [])

      // Sprite frame ticker driven by per-frame natural durations
      useEffect(() => {
        if (phoneOpen || customVideoUrl) return
        const spec = SPRITES[activeAction] || SPRITES.idle
        let idx = 0
        setFrameIdx(0)
        let timer = null
        let alive = true
        const step = () => {
          if (!alive) return
          const dur = spec.durations[idx % spec.durations.length] || 220
          timer = setTimeout(() => {
            if (!alive) return
            idx = (idx + 1) % spec.frames
            setFrameIdx(idx)
            step()
          }, dur)
        }
        step()
        return () => {
          alive = false
          if (timer) clearTimeout(timer)
        }
      }, [activeAction, phoneOpen, customVideoUrl])

      // First-visit cold-start greeting so new users immediately discover click/drag/right-click
      useEffect(() => {
        try {
          if (localStorage.getItem('jphone_pet_welcomed_v1')) return
          const t = setTimeout(() => {
            if (!phoneOpenRef.current) {
              showBubble('嗨～我是小鲸同学！点我展开小鲸同学，右键还能调大小或带我散步～', 5600)
              try { localStorage.setItem('jphone_pet_welcomed_v1', '1') } catch {}
            }
          }, 1200)
          return () => clearTimeout(t)
        } catch {}
      }, [])

      // Keep pet inside viewport on window resize
      useEffect(() => {
        const onResize = () => {
          setPos((prev) => clampPos(prev.x, prev.y, petSize))
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      }, [petSize])

      // Close context menu on outside click / Esc
      useEffect(() => {
        if (!menuPos) return
        const close = () => setMenuPos(null)
        const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null) }
        window.addEventListener('pointerdown', close)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('pointerdown', close)
          window.removeEventListener('keydown', onKey)
        }
      }, [menuPos])

      // True 8-direction autonomous stroll runner (grounded speed, zero cardboard flip!)
      const startStroll = useCallback((distanceHint) => {
        if (phoneOpenRef.current || draggingRef.current) return
        if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current)
        if (physicsRafRef.current) cancelAnimationFrame(physicsRafRef.current)

        const cur = posRef.current
        const maxX = Math.max(12, window.innerWidth - petSize - 12)
        const maxY = Math.max(12, window.innerHeight - petSize - 12)
        const minY = Math.max(24, Math.round(window.innerHeight * 0.28))

        // Pick an organic 8-direction compass angle biased away from screen edges
        let angle = Math.random() * Math.PI * 2
        if (cur.x > window.innerWidth * 0.72 && Math.cos(angle) > 0) angle = Math.PI - angle
        if (cur.x < window.innerWidth * 0.22 && Math.cos(angle) < 0) angle = Math.PI - angle
        if (cur.y > window.innerHeight * 0.78 && Math.sin(angle) > 0) angle = -angle
        if (cur.y < window.innerHeight * 0.36 && Math.sin(angle) < 0) angle = -angle

        const dist = distanceHint || (90 + Math.random() * 130)
        const targetX = Math.max(12, Math.min(maxX, cur.x + Math.cos(angle) * dist))
        const targetY = Math.max(minY, Math.min(maxY, cur.y + Math.sin(angle) * dist))
        const dx = targetX - cur.x
        const dy = targetY - cur.y
        const totalDist = Math.hypot(dx, dy)
        if (totalDist < 24) return

        const { action: walkAction, facing: walkFacing } = pickWalkDirSprite(dx, dy)
        const ux = dx / totalDist
        const uy = dy / totalDist
        setFacing(walkFacing)
        setOverrideAction(walkAction)
        const speedPxPerSec = 66
        let traveled = 0
        let lastTs = performance.now()

        const tick = (now) => {
          if (phoneOpenRef.current || draggingRef.current || moodRef.current === 'sleepy') {
            walkRafRef.current = null
            setOverrideAction((c) => (WALK_ACTIONS.has(c) ? null : c))
            return
          }
          const dt = Math.min(0.05, (now - lastTs) / 1000)
          lastTs = now
          traveled += speedPxPerSec * dt
          const done = traveled >= totalDist
          const ratio = done ? 1 : (traveled / totalDist)
          const next = clampPos(cur.x + dx * ratio, cur.y + dy * ratio, petSize)
          posRef.current = next
          setPos(next)

          if (done) {
            walkRafRef.current = null
            setFacing(1)
            try { localStorage.setItem('jphone_pet_pos_v3', JSON.stringify(next)) } catch {}
            // 30% chance to wave happily after arriving!
            if (Math.random() < 0.30 && !musicPlayingRef.current) {
              playTempAction('wave', 1800)
            } else {
              setOverrideAction((c) => (WALK_ACTIONS.has(c) ? null : c))
            }
            return
          }
          walkRafRef.current = requestAnimationFrame(tick)
        }
        walkRafRef.current = requestAnimationFrame(tick)
      }, [petSize, playTempAction])

      // Calm, non-distracting standby micro-idle rotation (gentle sway, hair tuck, stance shift, drowsy blink, glance, quiet tea, occasional soft stroll — NO distracting arm-waving!)
      useEffect(() => {
        if (phoneOpen) return
        let alive = true
        let timer = null
        let lastCalmIdx = -1
        const scheduleNext = () => {
          const delay = 7200 + Math.random() * 6800
          timer = setTimeout(() => {
            if (!alive) return
            if (!phoneOpenRef.current && !draggingRef.current && moodRef.current === 'idle') {
              if (musicPlayingRef.current) {
                // Stay calmly in headphones music-vibing mode
                if (Math.random() < 0.16) startStroll(92)
              } else {
                const r = Math.random()
                if (r < 0.68) {
                  // Rotate smoothly across 5 subtle standing micro-idles (zero attention grab!)
                  let nextIdx = Math.floor(Math.random() * CALM_IDLE_ACTIONS.length)
                  if (nextIdx === lastCalmIdx) nextIdx = (nextIdx + 1) % CALM_IDLE_ACTIONS.length
                  lastCalmIdx = nextIdx
                  const calmAct = CALM_IDLE_ACTIONS[nextIdx]
                  setFacing(1)
                  playTempAction(calmAct, calmAct === 'idle_hair' ? 2400 : 3000)
                } else if (r < 0.84) {
                  setFacing(1)
                  playTempAction('tea', 4200)
                } else {
                  startStroll(135)
                }
              }
            }
            scheduleNext()
          }, delay)
        }
        scheduleNext()
        return () => {
          alive = false
          if (timer) clearTimeout(timer)
        }
      }, [phoneOpen, startStroll, playTempAction])

      // Fetch initial state & subscribe to WebSocket live updates (including DSH session/event)
      const fetchState = useCallback(async () => {
        try {
          const res = await fetch('/jphone/api/state', { cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json()
          if (data?.mood) setMood(data.mood)
          if (data?.moodText) setMoodText(data.moodText)
          if (data?.character?.petVideo) {
            const vid = prefersMov() && data.character.petVideo.mov
              ? data.character.petVideo.mov
              : data.character.petVideo.webm
            setCustomVideoUrl(vid || null)
          }
          if (Array.isArray(data?.tasks)) {
            setActiveTasks(data.tasks.filter((t) => t.status === 'running').length)
          }
        } catch {}
      }, [])

      const pushMoodToHost = useCallback(async (nextMood, nextText) => {
        setMood(nextMood)
        if (nextText) setMoodText(nextText)
        try {
          await fetch('/jphone/api/mood', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mood: nextMood, moodText: nextText }),
          })
        } catch {}
      }, [])

      useEffect(() => {
        void fetchState()
        let ws = null
        let closed = false
        let reconnectTimer = null

        const connect = () => {
          if (closed) return
          try {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            ws = new WebSocket(`${proto}//${window.location.host}/jphone/ws`)
            ws.onmessage = (ev) => {
              try {
                const msg = JSON.parse(ev.data)
                if (msg.type === 'character:mood') {
                  if (msg.mood) setMood(msg.mood)
                  if (msg.moodText) setMoodText(msg.moodText)
                  if (msg.bubble) {
                    showBubble(msg.bubble, msg.mood === 'working' ? 8000 : 4500)
                  }
                } else if (msg.type === 'task:dispatched' || msg.type === 'task:update') {
                  void fetchState()
                }
              } catch {}
            }
            ws.onclose = () => {
              if (!closed) reconnectTimer = setTimeout(connect, 3000)
            }
          } catch {
            if (!closed) reconnectTimer = setTimeout(connect, 4000)
          }
        }
        connect()

        const onPostMessage = (ev) => {
          const data = ev.data
          if (!data || typeof data !== 'object') return
          if (data.type === 'jphone:open-session' && data.sessionId) {
            openSessionInDsh(String(data.sessionId))
          } else if (data.type === 'jphone:collapse') {
            setPhoneOpen(false)
          } else if (data.type === 'jphone:notify' && data.message) {
            showBubble(String(data.message), 3600)
          } else if (data.type === 'jphone:media') {
            const playing = !!data.playing
            setMusicPlaying(playing)
            if (typeof data.title === 'string') setMusicTitle(data.title)
          }
        }
        window.addEventListener('message', onPostMessage)

        return () => {
          closed = true
          if (reconnectTimer) clearTimeout(reconnectTimer)
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
          if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current)
          if (physicsRafRef.current) cancelAnimationFrame(physicsRafRef.current)
          if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current)
          window.removeEventListener('message', onPostMessage)
          try { ws && ws.close() } catch {}
        }
      }, [fetchState, openSessionInDsh, showBubble])

      // Pointer drag with inertia throw & crisp click-vs-drag discrimination
      const onPetPointerDown = (e) => {
        if (e.button !== 0) return
        setMenuPos(null)
        if (walkRafRef.current) { cancelAnimationFrame(walkRafRef.current); walkRafRef.current = null }
        if (physicsRafRef.current) { cancelAnimationFrame(physicsRafRef.current); physicsRafRef.current = null }

        const startX = e.clientX
        const startY = e.clientY
        const origin = { ...posRef.current }
        dragSessionRef.current = {
          pointerId: e.pointerId,
          startX,
          startY,
          originX: origin.x,
          originY: origin.y,
          lastX: startX,
          lastY: startY,
          lastTs: performance.now(),
          vx: 0,
          vy: 0,
          moved: false,
        }
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
      }

      const onPetPointerMove = (e) => {
        const d = dragSessionRef.current
        if (!d || d.pointerId !== e.pointerId) return
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        if (!d.moved && Math.hypot(dx, dy) >= 6) {
          d.moved = true
          draggingRef.current = true
          setDragging(true)
          setOverrideAction(null)
        }
        if (!d.moved) return

        const now = performance.now()
        const dt = Math.max(8, now - d.lastTs)
        d.vx = ((e.clientX - d.lastX) / dt) * 16
        d.vy = ((e.clientY - d.lastY) / dt) * 16
        d.lastX = e.clientX
        d.lastY = e.clientY
        d.lastTs = now

        const next = clampPos(d.originX + dx, d.originY + dy, petSize)
        posRef.current = next
        setPos(next)
        setDragTilt(Math.max(-14, Math.min(14, d.vx * 0.65)))
        if (Math.abs(d.vx) > 2) setFacing(d.vx >= 0 ? 1 : -1)
      }

      const onPetPointerUp = (e) => {
        const d = dragSessionRef.current
        if (!d || d.pointerId !== e.pointerId) return
        dragSessionRef.current = null
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}

        if (!d.moved) {
          // Crisp click! If sleeping, gently wake first; otherwise open iPhone shell immediately
          if (moodRef.current === 'sleepy') {
            void pushMoodToHost('idle', '唔…醒来啦！找小鲸同学有事嘛～')
            playTempAction('happy', 1800)
            showBubble('唔…醒来啦！再点一下打开小鲸同学 哦～', 3200)
            triggerLandSquash()
            return
          }
          setPhoneOpen(true)
          return
        }

        draggingRef.current = false
        setDragging(false)
        setDragTilt(0)

        // Smooth throw inertia + edge bounce + squash landing
        let vx = Math.max(-24, Math.min(24, d.vx))
        let vy = Math.max(-24, Math.min(24, d.vy))
        const margin = 12
        const maxX = Math.max(margin, window.innerWidth - petSize - margin)
        const maxY = Math.max(margin, window.innerHeight - petSize - margin)

        const glide = () => {
          let nx = posRef.current.x + vx
          let ny = posRef.current.y + vy
          if (nx < margin) { nx = margin; vx = -vx * 0.45 }
          else if (nx > maxX) { nx = maxX; vx = -vx * 0.45 }
          if (ny < margin) { ny = margin; vy = -vy * 0.45 }
          else if (ny > maxY) { ny = maxY; vy = -vy * 0.45 }

          vx *= 0.89
          vy *= 0.89
          const next = { x: nx, y: ny }
          posRef.current = next
          setPos(next)

          if (Math.hypot(vx, vy) < 0.45) {
            physicsRafRef.current = null
            setFacing(1)
            triggerLandSquash()
            try { localStorage.setItem('jphone_pet_pos_v3', JSON.stringify(next)) } catch {}
            return
          }
          physicsRafRef.current = requestAnimationFrame(glide)
        }

        if (Math.hypot(vx, vy) >= 1.2) {
          physicsRafRef.current = requestAnimationFrame(glide)
        } else {
          setFacing(1)
          triggerLandSquash()
          try { localStorage.setItem('jphone_pet_pos_v3', JSON.stringify(posRef.current)) } catch {}
        }
      }

      const onPetContextMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const mw = 192
        const mh = 310
        const p = posRef.current || { x: e.clientX - petSize / 2, y: e.clientY - petSize / 2 }
        // Place cleanly beside the pet (left side preferred) so Xiaojing's face is NEVER obscured
        const preferLeft = p.x - mw - 12
        const preferRight = p.x + petSize + 12
        const mx = preferLeft >= 12
          ? preferLeft
          : Math.min(window.innerWidth - mw - 12, Math.max(12, preferRight))
        const my = Math.max(12, Math.min(window.innerHeight - mh - 12, p.y + petSize - mh))
        setMenuPos({ x: mx, y: my })
      }

      const applySizePreset = (key) => {
        const nextSz = SIZE_PRESETS[key] || 136
        setSizeKey(key)
        try { localStorage.setItem('jphone_pet_size_v3', key) } catch {}
        setPos((prev) => clampPos(prev.x, prev.y, nextSz))
        setMenuPos(null)
      }

      const triggerPhoneShake = useCallback(() => {
        setPhoneShaking(false)
        requestAnimationFrame(() => {
          setPhoneShaking(true)
          setTimeout(() => setPhoneShaking(false), 580)
        })
        try {
          iframeRef.current?.contentWindow?.postMessage({ type: 'jphone:shake', strength: 1.0 }, '*')
        } catch {}
      }, [])

      const onPhoneDragDown = (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        phoneDragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originX: phoneRectRef.current.x,
          originY: phoneRectRef.current.y,
        }
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
      }

      const onPhoneDragMove = (e) => {
        const d = phoneDragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        const next = clampPhoneRect(
          d.originX + (e.clientX - d.startX),
          d.originY + (e.clientY - d.startY),
          phoneRectRef.current.scale,
        )
        phoneRectRef.current = next
        setPhoneRect(next)
      }

      const onPhoneDragUp = (e) => {
        const d = phoneDragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        phoneDragRef.current = null
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
        try { localStorage.setItem('jphone_phone_rect_v1', JSON.stringify(phoneRectRef.current)) } catch {}
      }

      const onPhoneResizeDown = (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        const cur = phoneRectRef.current
        phoneResizeRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originScale: cur.scale,
          anchorRight: cur.x + PHONE_BASE_W * cur.scale,
          anchorBottom: cur.y + PHONE_BASE_H * cur.scale,
        }
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
      }

      const onPhoneResizeMove = (e) => {
        const r = phoneResizeRef.current
        if (!r || r.pointerId !== e.pointerId) return
        // Bottom-left handle: drag left = bigger, drag right = smaller
        const dx = r.startX - e.clientX
        const dy = e.clientY - r.startY
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx / PHONE_BASE_W : dy / PHONE_BASE_H
        const nextScale = Math.max(0.50, Math.min(PHONE_MAX_SCALE, r.originScale + delta))
        const nextX = r.anchorRight - PHONE_BASE_W * nextScale
        const nextY = r.anchorBottom - PHONE_BASE_H * nextScale
        const clamped = clampPhoneRect(nextX, nextY, nextScale)
        phoneRectRef.current = clamped
        setPhoneRect(clamped)
        setShrinkPreview(nextScale < PHONE_COLLAPSE_SCALE)
      }

      const onPhoneResizeUp = (e) => {
        const r = phoneResizeRef.current
        if (!r || r.pointerId !== e.pointerId) return
        phoneResizeRef.current = null
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
        const finalScale = phoneRectRef.current.scale
        setShrinkPreview(false)
        if (finalScale < PHONE_COLLAPSE_SCALE) {
          // Restore sensible scale for next reopen, then smoothly morph into mini-pet!
          const restored = clampPhoneRect(phoneRectRef.current.x, phoneRectRef.current.y, Math.max(0.85, PHONE_MIN_SCALE))
          phoneRectRef.current = restored
          setPhoneRect(restored)
          try { localStorage.setItem('jphone_phone_rect_v1', JSON.stringify(restored)) } catch {}
          setPhoneOpen(false)
          showBubble('变身回小鲸桌宠啦！点我随时展开～', 2600)
          triggerLandSquash()
          return
        }
        const safe = clampPhoneRect(phoneRectRef.current.x, phoneRectRef.current.y, Math.max(PHONE_MIN_SCALE, finalScale))
        phoneRectRef.current = safe
        setPhoneRect(safe)
        try { localStorage.setItem('jphone_phone_rect_v1', JSON.stringify(safe)) } catch {}
      }

      const activeSpec = SPRITES[activeAction] || SPRITES.idle
      const bgPosX = activeSpec.frames > 1 ? (frameIdx / (activeSpec.frames - 1)) * 100 : 0
      const isBreathing = !dragging && !WALK_ACTIONS.has(activeAction) && activeAction !== 'happy' && activeAction !== 'music'
      const isVibing = !dragging && activeAction === 'music'

        ? (moodText.length > 13 ? moodText.slice(0, 12) + '…' : moodText)
        : (activeTasks > 0 ? `${activeTasks} 个后台任务` : '')

      return h(
        'div',
        {
          id: 'jphone-root',
          style: {
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", sans-serif',
          },
        },
        // 1. Expanded Authentic iPhone 16 Pro Titanium Bezel Shell (movable, scalable, shakeable, keep-alive iframe)
        h(
          'div',
          {
            id: 'jphone-phone-shell',
            className: phoneShaking ? 'jphone-shaking' : '',
            style: {
              position: 'fixed',
              left: `${Math.round(phoneRect.x)}px`,
              top: `${Math.round(phoneRect.y)}px`,
              width: `${Math.round(PHONE_BASE_W * phoneRect.scale)}px`,
              height: `${Math.round(PHONE_BASE_H * phoneRect.scale)}px`,
              display: phoneOpen ? 'block' : 'none',
              pointerEvents: phoneOpen ? 'auto' : 'none',
            },
          },
          // Left side action buttons: Collapse (top) + Shake (right underneath)
          h(
            'button',
            {
              id: 'jphone-collapse-btn',
              className: 'jphone-side-btn',
              type: 'button',
              title: '收起为小鲸桌宠',
              onClick: () => setPhoneOpen(false),
              style: {
                position: 'absolute',
                left: '-44px',
                top: '18px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(28, 28, 30, 0.76)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#FFFFFF',
                fontSize: '16px',
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.24)',
              },
            },
            '−'
          ),
          h(
            'button',
            {
              id: 'jphone-shake-btn',
              className: 'jphone-side-btn',
              type: 'button',
              title: '晃一晃手机（触发壁纸晃动与视差效果）',
              onClick: triggerPhoneShake,
              style: {
                position: 'absolute',
                left: '-44px',
                top: '62px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(28, 28, 30, 0.76)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.24)',
              },
            },
            // Clean SVG phone-shake icon (zero emoji)
            h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
              h('rect', { x: 7, y: 4, width: 10, height: 16, rx: 2 }),
              h('path', { d: 'M3 8l-1 4 1 4' }),
              h('path', { d: 'M21 8l1 4-1 4' })
            )
          ),
          // DSH Native Plugin Console trigger pill right below Shake
          h(
            'button',
            {
              id: 'jphone-console-btn',
              className: 'jphone-side-btn',
              type: 'button',
              title: '打开小鲸同学（JPhone）DSH 控制台（数据目录、穿透配置、备份导出）',
              onClick: openConsole,
              style: {
                position: 'absolute',
                left: '-44px',
                top: '104px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                background: 'rgba(28, 28, 30, 0.76)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.24)',
              },
            },
            h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
              h('line', { x1: 4, y1: 21, x2: 4, y2: 14 }),
              h('line', { x1: 4, y1: 10, x2: 4, y2: 3 }),
              h('line', { x1: 12, y1: 21, x2: 12, y2: 12 }),
              h('line', { x1: 12, y1: 8, x2: 12, y2: 3 }),
              h('line', { x1: 20, y1: 21, x2: 20, y2: 16 }),
              h('line', { x1: 20, y1: 12, x2: 20, y2: 3 }),
              h('line', { x1: 1, y1: 14, x2: 7, y2: 14 }),
              h('line', { x1: 9, y1: 8, x2: 15, y2: 8 }),
              h('line', { x1: 17, y1: 16, x2: 23, y2: 16 })
            )
          ),
          // Shrink-to-pet threshold feedback badge
          shrinkPreview
            ? h(
                'div',
                {
                  style: {
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    borderRadius: `${Math.round(54 * phoneRect.scale)}px`,
                    background: 'rgba(15, 23, 42, 0.56)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    pointerEvents: 'none',
                  },
                },
                '松手变回小鲸桌宠'
              )
            : null,
          // Scaled titanium iPhone 16 Pro physical frame
          h(
            'div',
            {
              className: 'jphone-phone-frame',
              style: {
                width: `${PHONE_BASE_W}px`,
                height: `${PHONE_BASE_H}px`,
                transform: `scale(${phoneRect.scale})`,
                transformOrigin: 'top left',
                borderRadius: '54px',
                padding: '10px',
                boxSizing: 'border-box',
                background: 'linear-gradient(145deg, #2D2F36 0%, #15161B 48%, #24262D 100%)',
                boxShadow: '0 32px 84px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.16) inset, 0 0 0 1px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              },
            },
            // Invisible top drag handle over the titanium top bezel + Dynamic Island so user can move the phone freely
            h('div', {
              id: 'jphone-phone-dragbar',
              title: '拖动顶部边框移动小鲸同学窗口位置',
              onPointerDown: onPhoneDragDown,
              onPointerMove: onPhoneDragMove,
              onPointerUp: onPhoneDragUp,
              style: {
                position: 'absolute',
                top: '0px',
                left: '68px',
                right: '68px',
                height: '46px',
                zIndex: 30,
                cursor: 'grab',
                touchAction: 'none',
              },
            }),
            // Bottom-left proportional resize grip (shrink below threshold -> auto-collapse to mini-pet)
            h(
              'div',
              {
                id: 'jphone-resize-handle',
                title: '拖拽缩放手机大小（缩到最小时自动变为小鲸桌宠）',
                onPointerDown: onPhoneResizeDown,
                onPointerMove: onPhoneResizeMove,
                onPointerUp: onPhoneResizeUp,
                style: {
                  position: 'absolute',
                  left: '-6px',
                  bottom: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(28, 28, 30, 0.78)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  zIndex: 35,
                  cursor: 'nesw-resize',
                  touchAction: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                },
              },
              h('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' },
                h('path', { d: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7' })
              )
            ),
            // Inner edge-to-edge iPhone OLED screen
            h(
              'div',
              {
                style: {
                  position: 'relative',
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  borderRadius: '44px',
                  overflow: 'hidden',
                  background: '#000000',
                  boxShadow: '0 0 0 0.5px rgba(255,255,255,0.08)',
                },
              },
              h('iframe', {
                ref: iframeRef,
                id: 'jphone-iframe',
                src: '/jphone/',
                title: '小鲸同学 · JingChan (JPhone)',
                allow: 'clipboard-read; clipboard-write; microphone; autoplay',
                style: {
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: '#F2F2F7',
                },
              })
            )
          )
        ),

        // 2. 100% Transparent Animated Sprite-Sheet Mini-Pet (NO box, NO border, NO bottom name label)
        !phoneOpen
          ? h(
              'div',
              {
                id: 'jphone-pet-bubble',
                role: 'button',
                tabIndex: 0,
                'aria-label': '打开小鲸同学（可拖拽，右键更多互动）',
                title: '单击打开小鲸同学 · 拖拽移动 · 右键互动',
                className: `${isBreathing ? 'jphone-breathing' : ''} ${isVibing ? 'jphone-vibing' : ''} ${landedPulse ? 'jphone-landed' : ''}`.trim(),
                onPointerDown: onPetPointerDown,
                onPointerMove: onPetPointerMove,
                onPointerUp: onPetPointerUp,
                onContextMenu: onPetContextMenu,
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPhoneOpen(true)
                  }
                },
                style: {
                  position: 'fixed',
                  left: `${Math.round(pos.x)}px`,
                  top: `${Math.round(pos.y)}px`,
                  width: `${petSize}px`,
                  height: `${petSize}px`,
                  pointerEvents: 'auto',
                  cursor: dragging ? 'grabbing' : 'pointer',
                  padding: 0,
                  margin: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              },
              // Transient Apple-style frosted speech bubble above head (only when talking/working)
              bubbleText
                ? h(
                    'div',
                    {
                      className: 'jphone-speech-bubble',
                      style: {
                        position: 'absolute',
                        bottom: 'calc(100% + 6px)',
                        ...(pos.x > window.innerWidth - 230
                          ? { right: '4px' }
                          : pos.x < 90
                            ? { left: '4px' }
                            : { left: '50%', marginLeft: '-105px' }),
                        width: 'max-content',
                        maxWidth: '210px',
                        padding: '8px 13px',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        border: '0.5px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                        color: '#1C1C1E',
                        fontSize: '12px',
                        fontWeight: 500,
                        lineHeight: 1.38,
                        whiteSpace: 'normal',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      },
                    },
                    bubbleText
                  )
                : null,
              // Animated Sprite (or Workshop transparent video) stage
              // Separate smooth drag-tilt wrapper from instant discrete horizontal facing (zero cardboard flip!)
              h(
                'div',
                {
                  className: 'jphone-pet-stage',
                  style: {
                    position: 'relative',
                    width: `${petSize}px`,
                    height: `${petSize}px`,
                    overflow: 'visible',
                    transform: `rotate(${dragTilt}deg)`,
                    transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.2, 0.9, 0.25, 1)',
                  },
                },
                h(
                  'div',
                  {
                    className: 'jphone-pet-flip',
                    style: {
                      width: '100%',
                      height: '100%',
                      transform: `scaleX(${facing})`,
                      transition: 'none',
                    },
                  },
                  customVideoUrl
                    ? h('video', {
                        src: customVideoUrl,
                        autoPlay: true,
                        loop: true,
                        muted: true,
                        playsInline: true,
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none',
                        },
                      })
                    : h('div', {
                        id: 'jphone-pet-sprite',
                        className: 'jphone-pet-sprite',
                        'data-action': activeAction,
                        'data-frame': String(frameIdx),
                        style: {
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url("${activeSpec.url}")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: `${activeSpec.frames * 100}% 100%`,
                          backgroundPosition: `${bgPosX}% 0%`,
                          pointerEvents: 'none',
                        },
                      })
                ),
                isVibing
                  ? h('span', { className: 'jphone-pet-note', title: musicTitle || '正在听歌' }, '♪')
                  : null
              ),
              // Subtle iOS red badge only when background tasks are active
              activeTasks > 0
                ? h(
                    'span',
                    {
                      style: {
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '999px',
                        background: '#FF3B30',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        boxShadow: '0 2px 6px rgba(255, 59, 48, 0.45)',
                        pointerEvents: 'none',
                      },
                    },
                    String(activeTasks)
                  )
                : null
            )
          : null,

        // 3. Apple Frosted Right-Click Context Menu
        menuPos && !phoneOpen
          ? h(
              'div',
              {
                id: 'jphone-pet-menu',
                onPointerDown: (e) => e.stopPropagation(),
                style: {
                  position: 'fixed',
                  left: `${menuPos.x}px`,
                  top: `${menuPos.y}px`,
                  width: '178px',
                  padding: '6px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(22px)',
                  WebkitBackdropFilter: 'blur(22px)',
                  border: '0.5px solid rgba(0, 0, 0, 0.10)',
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                },
              },
              h(
                'button',
                {
                  type: 'button',
                  className: 'jphone-menu-item',
                  onClick: () => { setMenuPos(null); setPhoneOpen(true) },
                },
                '打开小鲸同学'
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'jphone-menu-item',
                  onClick: openConsole,
                },
                '小鲸同学控制台'
              ),
              h(
                'div',
                {
                  style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    padding: '3px 4px',
                  },
                },
                [
                  { id: 'wave', label: '挥手', dur: 2600, line: () => WAVE_LINES[Math.floor(Math.random() * WAVE_LINES.length)] },
                  { id: 'tea', label: '喝茶', dur: 5200, line: () => TEA_LINES[Math.floor(Math.random() * TEA_LINES.length)] },
                  { id: 'music', label: '听歌', dur: 5600, line: () => MUSIC_LINES[Math.floor(Math.random() * MUSIC_LINES.length)] },
                  { id: 'happy', label: '跳跃', dur: 2200, line: () => POKE_LINES[Math.floor(Math.random() * POKE_LINES.length)] },
                ].map((act) =>
                  h(
                    'button',
                    {
                      key: act.id,
                      type: 'button',
                      onClick: () => {
                        setMenuPos(null)
                        setFacing(1)
                        playTempAction(act.id, act.dur)
                        showBubble(act.line(), 3600)
                      },
                      style: {
                        border: '0.5px solid rgba(56, 189, 248, 0.24)',
                        borderRadius: '8px',
                        padding: '5px 2px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeAction === act.id ? 'rgba(14, 165, 233, 0.16)' : 'rgba(142, 142, 147, 0.09)',
                        color: activeAction === act.id ? '#0284C7' : '#1C1C1E',
                      },
                    },
                    act.label
                  )
                )
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'jphone-menu-item',
                  onClick: () => {
                    setMenuPos(null)
                    if (moodRef.current === 'sleepy') void pushMoodToHost('idle', '出去透透气～')
                    startStroll(165)
                  },
                },
                '八方向散散步'
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'jphone-menu-item',
                  onClick: () => {
                    setMenuPos(null)
                    if (moodRef.current === 'sleepy') {
                      void pushMoodToHost('idle', '睡醒啦，元气满满！')
                      playTempAction('happy', 1800)
                      showBubble('睡醒啦，元气满满！', 3200)
                    } else {
                      setOverrideAction(null)
                      void pushMoodToHost('sleepy', '有点困了，先眯一小会儿…')
                      showBubble('先眯一小会儿…有事点我叫醒哦', 3400)
                    }
                  },
                },
                mood === 'sleepy' ? '叫醒小鲸同学' : '让小鲸打个盹'
              ),
              h('div', { style: { height: '0.5px', background: 'rgba(60,60,67,0.12)', margin: '4px 6px' } }),
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#8E8E93',
                  },
                },
                h('span', null, '大小'),
                h(
                  'div',
                  { style: { display: 'flex', gap: '4px' } },
                  ['sm', 'md', 'lg'].map((k) =>
                    h(
                      'button',
                      {
                        key: k,
                        type: 'button',
                        onClick: () => applySizePreset(k),
                        style: {
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: sizeKey === k ? '#007AFF' : 'rgba(142,142,147,0.14)',
                          color: sizeKey === k ? '#FFFFFF' : '#1C1C1E',
                        },
                      },
                      k === 'sm' ? '小' : k === 'md' ? '中' : '大'
                    )
                  )
                )
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'jphone-menu-item',
                  onClick: () => {
                    setMenuPos(null)
                    const home = defaultCornerPos(petSize)
                    posRef.current = home
                    setPos(home)
                    setFacing(1)
                    triggerLandSquash()
                    try { localStorage.setItem('jphone_pet_pos_v3', JSON.stringify(home)) } catch {}
                  },
                },
                '回到右下角'
              )
            )
          : null,
        consoleOpen
          ? h(
              'div',
              {
                id: 'jphone-console-modal',
                onPointerDown: (e) => e.stopPropagation(),
                style: {
                  position: 'fixed',
                  inset: 0,
                  zIndex: 95,
                  background: 'rgba(15, 23, 42, 0.36)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif',
                },
                onClick: (e) => { if (e.target === e.currentTarget) setConsoleOpen(false) },
              },
              h(
                'div',
                {
                  style: {
                    width: '480px',
                    maxWidth: '92vw',
                    maxHeight: '86vh',
                    overflowY: 'auto',
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    padding: '20px 22px',
                    color: '#1C1C1E',
                  },
                },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' } },
                  h(
                    'div',
                    null,
                    h('div', { style: { fontSize: '18px', fontWeight: 700 } }, '小鲸同学 · JingChan (JPhone) 控制台'),
                    h('div', { style: { fontSize: '12px', color: '#8E8E93', marginTop: '2px' } }, '宿主级存储、内网穿透、DeepSeek API 与备份管理')
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      onClick: () => setConsoleOpen(false),
                      style: {
                        width: '30px', height: '30px', borderRadius: '50%', border: 'none',
                        background: '#F2F2F7', color: '#1C1C1E', fontSize: '16px', cursor: 'pointer',
                      },
                    },
                    '×'
                  )
                ),
                consoleInfo
                  ? h(
                      'div',
                      { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
                      h(
                        'div',
                        { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } },
                        ...[
                          ['小应用', consoleInfo.stats?.miniApps ?? 0],
                          ['技能', consoleInfo.stats?.skills ?? 0],
                          ['记忆', consoleInfo.stats?.memories ?? 0],
                          ['KV 表', consoleInfo.stats?.kvNamespaces ?? 0],
                          ['壁纸', consoleInfo.stats?.wallpapers ?? 0],
                          ['任务', consoleInfo.stats?.tasks ?? 0],
                        ].map(([k, v]) =>
                          h(
                            'div',
                            {
                              key: k,
                              style: {
                                background: '#F2F2F7', borderRadius: '12px', padding: '10px 12px',
                                display: 'flex', flexDirection: 'column', gap: '2px',
                              },
                            },
                            h('span', { style: { fontSize: '11.5px', color: '#8E8E93' } }, k),
                            h('span', { style: { fontSize: '18px', fontWeight: 700, color: '#007AFF' } }, String(v))
                          )
                        )
                      ),
                      h(
                        'div',
                        { style: { background: '#F8F9FB', borderRadius: '12px', padding: '12px', fontSize: '12.5px', lineHeight: 1.65 } },
                        h('div', null, h('strong', null, 'DeepSeek API & 语音引擎：'),
                          h('span', { style: { color: consoleInfo.apiKeyConfigured ? '#34C759' : '#FF9500', fontWeight: 600 } },
                            consoleInfo.apiKeyConfigured ? '已就绪（LLM + ASR/TTS 代理可用）' : '未检测到 DEEPSEEK_API_KEY'
                          )
                        ),
                        h('div', { style: { wordBreak: 'break-all' } }, h('strong', null, '数据与工作区：'), consoleInfo.workspaceDir || '-'),
                        h('div', { style: { wordBreak: 'break-all' } }, h('strong', null, '当前移动端桥接：'), consoleInfo.pairing?.lanBridgeEnabled === false ? `仅本机（http://127.0.0.1:${consoleInfo.bridgePort || 3189}/jphone/）` : `${consoleInfo.pairing?.lanUrl || `http://127.0.0.1:${consoleInfo.bridgePort || 3189}`}/jphone/`),
                        (() => {
                          const p = consoleInfo.pairing || {}
                          const lanAvail = !!p.lanAvailable
                          const pubAvail = !!p.publicAvailable
                          const qrAvail = lanAvail || pubAvail
                          const activeTab = (qrTab === 'public' && pubAvail)
                            ? 'public'
                            : (qrTab === 'lan' && lanAvail)
                              ? 'lan'
                              : (pubAvail ? 'public' : (lanAvail ? 'lan' : 'none'))
                          const activePairUrl = activeTab === 'public' ? (p.publicPairUrl || '') : (activeTab === 'lan' ? (p.lanPairUrl || '') : '')
                          const activeDisplayUrl = activeTab === 'public'
                            ? (p.publicUrl || '')
                            : (activeTab === 'lan' ? `${p.lanUrl}/jphone/` : '')

                          return h(
                            'div',
                            null,
                            qrAvail
                              ? h(
                                  'div',
                                  { style: { marginTop: '8px', padding: '10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)' } },
                                  h(
                                    'div',
                                    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' } },
                                    h('span', { style: { fontWeight: 700, color: '#0F172A', fontSize: '13px' } }, '手机扫码一键配对'),
                                    h(
                                      'div',
                                      {
                                        style: {
                                          display: 'inline-flex',
                                          background: '#F1F5F9',
                                          borderRadius: '999px',
                                          padding: '2px',
                                          gap: '2px',
                                        },
                                      },
                                      [
                                        { key: 'lan', label: '局域网直连', enabled: lanAvail, activeColor: '#007AFF' },
                                        { key: 'public', label: '公网穿透', enabled: pubAvail, activeColor: '#16A34A' },
                                      ].map((tab) => {
                                        const isActive = activeTab === tab.key
                                        return h(
                                          'button',
                                          {
                                            key: tab.key,
                                            type: 'button',
                                            disabled: !tab.enabled,
                                            onClick: () => { if (tab.enabled) setQrTab(tab.key) },
                                            style: {
                                              border: 'none',
                                              borderRadius: '999px',
                                              padding: '3px 10px',
                                              fontSize: '11px',
                                              fontWeight: 600,
                                              cursor: tab.enabled ? 'pointer' : 'not-allowed',
                                              background: isActive ? tab.activeColor : 'transparent',
                                              color: isActive ? '#FFFFFF' : (tab.enabled ? '#334155' : '#94A3B8'),
                                              opacity: tab.enabled ? 1 : 0.65,
                                              transition: 'all 0.15s ease',
                                            },
                                          },
                                          tab.enabled ? tab.label : `${tab.label}(未开)`
                                        )
                                      })
                                    )
                                  ),
                                  h(
                                    'div',
                                    { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                                    h('img', {
                                      key: `${activeTab}:${activePairUrl}`,
                                      src: `/jphone/api/console/pairing-qr.svg?mode=${activeTab}&t=${encodeURIComponent(p.pairingToken || '')}&u=${encodeURIComponent(activePairUrl)}`,
                                      alt: '手机扫码配对二维码',
                                      style: { width: '98px', height: '98px', borderRadius: '8px', background: '#fff', padding: '2px', flexShrink: 0, border: '1px solid rgba(15,23,42,0.06)' },
                                    }),
                                    h(
                                      'div',
                                      { style: { fontSize: '12px', lineHeight: 1.5, color: '#475569', flex: 1, minWidth: 0 } },
                                      h('div', null, '打开「小鲸同学」安卓端「设置 → 扫码配对连接」或点击下方「复制配对链接」发到手机一键粘贴即可完成连接。'),
                                      activeDisplayUrl
                                        ? h(
                                            'div',
                                            { style: { marginTop: '5px', fontSize: '11px', color: activeTab === 'public' ? '#16A34A' : '#007AFF', fontWeight: 600, wordBreak: 'break-all' } },
                                            activeDisplayUrl
                                          )
                                        : null
                                    )
                                  )
                                )
                              : h(
                                  'div',
                                  { style: { marginTop: '8px', padding: '12px', borderRadius: '12px', background: '#FFFFFF', border: '1px dashed rgba(100,116,139,0.32)', color: '#64748B', fontSize: '12px', lineHeight: 1.55 } },
                                  h('div', { style: { fontWeight: 700, color: '#334155', marginBottom: '2px' } }, '手机配对二维码已关闭'),
                                  h('div', null, '当前「局域网直连」和「公网穿透」均未开启（仅限本机 127.0.0.1 访问）。如需手机扫码配对，请在下方开启任一连接方式。')
                                ),
                            h(
                              'div',
                              { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
                              h('span', { style: { wordBreak: 'break-all', flex: 1, fontSize: '12px' } }, h('strong', null, '配对 Token：'), p.pairingToken || '-'),
                              p.pairingToken
                                ? h(
                                    'button',
                                    {
                                      type: 'button',
                                      onClick: () => {
                                        const tok = p.pairingToken || ''
                                        if (navigator.clipboard?.writeText) {
                                          navigator.clipboard.writeText(tok).then(() => setConsoleStatusMsg('配对 Token 已复制到剪贴板')).catch(() => {})
                                        }
                                      },
                                      style: {
                                        padding: '4px 10px', borderRadius: '8px', border: '0.5px solid rgba(0,122,255,0.35)',
                                        background: 'rgba(0,122,255,0.10)', color: '#007AFF', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                                      },
                                    },
                                    '复制 Token'
                                  )
                                : null,
                              activePairUrl
                                ? h(
                                    'button',
                                    {
                                      type: 'button',
                                      onClick: () => {
                                        if (navigator.clipboard?.writeText) {
                                          navigator.clipboard.writeText(activePairUrl).then(() => setConsoleStatusMsg(`已复制${activeTab === 'public' ? '公网穿透' : '局域网'}配对链接`)).catch(() => {})
                                        }
                                      },
                                      style: {
                                        padding: '5px 11px', borderRadius: '8px', border: 'none',
                                        background: '#007AFF', color: '#FFFFFF', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                                      },
                                    },
                                    activeTab === 'public' ? '复制公网链接' : '复制局域网链接'
                                  )
                                : null
                            )
                          )
                        })()
                      ),
                      h(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#F8F9FB', borderRadius: '12px', padding: '11px 12px' } },
                        h(
                          'div',
                          null,
                          h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#1C1C1E' } }, '局域网直连（同 Wi-Fi）'),
                          h(
                            'div',
                            { style: { fontSize: '11.5px', color: consoleInfo.pairing?.lanBridgeEnabled !== false ? '#16A34A' : '#64748B', marginTop: '2px' } },
                            consoleInfo.pairing?.lanBridgeEnabled !== false
                              ? `已开启（${consoleInfo.pairing?.lanUrl || `0.0.0.0:${consoleInfo.bridgePort || 3189}`} · 默认开启，需携带配对 Token 访问）`
                              : '已关闭（仅监听 127.0.0.1，局域网设备不可直连，安全性最高）'
                          )
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            disabled: lanBusy,
                            onClick: toggleLanBridge,
                            style: {
                              padding: '7px 14px', borderRadius: '10px', border: 'none', flexShrink: 0,
                              background: consoleInfo.pairing?.lanBridgeEnabled !== false ? '#FF3B30' : '#007AFF',
                              color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600,
                              opacity: lanBusy ? 0.55 : 1,
                              cursor: lanBusy ? 'wait' : 'pointer',
                            },
                          },
                          lanBusy
                            ? '切换中...'
                            : (consoleInfo.pairing?.lanBridgeEnabled !== false ? '关闭局域网' : '一键开启')
                        )
                      ),
                      h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '8px', background: '#F8F9FB', borderRadius: '12px', padding: '11px 12px' } },
                        h(
                          'div',
                          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
                          h(
                            'div',
                            null,
                            h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#1C1C1E' } }, '公网穿透（Cloudflare Tunnel）'),
                            h(
                              'div',
                              { style: { fontSize: '11.5px', color: consoleInfo.tunnel?.status === 'running' ? '#16A34A' : '#64748B', marginTop: '2px' } },
                              consoleInfo.tunnel?.status === 'running'
                                ? `已开启：${consoleInfo.tunnel.publicUrl}`
                                : (consoleInfo.tunnel?.available ? '未开启 · 离开家/4G 外网访问时可一键开启' : '未检测到 cloudflared（需先 brew install cloudflared）')
                            )
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              disabled: tunnelBusy || (!consoleInfo.tunnel?.available && consoleInfo.tunnel?.status !== 'running'),
                              onClick: toggleQuickTunnel,
                              style: {
                                padding: '7px 14px', borderRadius: '10px', border: 'none', flexShrink: 0,
                                background: consoleInfo.tunnel?.status === 'running' ? '#FF3B30' : '#007AFF',
                                color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600,
                                opacity: tunnelBusy || (!consoleInfo.tunnel?.available && consoleInfo.tunnel?.status !== 'running') ? 0.55 : 1,
                                cursor: tunnelBusy ? 'wait' : 'pointer',
                              },
                            },
                            tunnelBusy
                              ? '处理中...'
                              : (consoleInfo.tunnel?.status === 'running' ? '关闭穿透' : '一键开启')
                          )
                        ),
                        h(
                          'div',
                          { style: { display: 'flex', gap: '8px', marginTop: '2px' } },
                          h('input', {
                            value: consoleTunnelInput,
                            onChange: (e) => setConsoleTunnelInput(e.target.value),
                            placeholder: '或手动填入自定义外网地址（Tailscale / frp / 自有域名）',
                            style: {
                              flex: 1, padding: '8px 10px', borderRadius: '10px', background: '#FFFFFF',
                              border: '1px solid rgba(60,60,67,0.2)', fontSize: '12.5px', outline: 'none',
                            },
                          }),
                          h(
                            'button',
                            {
                              type: 'button',
                              onClick: saveConsoleTunnel,
                              style: {
                                padding: '8px 14px', borderRadius: '10px', border: 'none',
                                background: 'rgba(0,122,255,0.12)', color: '#007AFF', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                              },
                            },
                            '保存'
                          )
                        )
                      ),
                      h(
                        'div',
                        { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                        h(
                          'button',
                          {
                            type: 'button',
                            onClick: exportConsoleBackup,
                            style: {
                              flex: 1, padding: '10px 14px', borderRadius: '12px', border: 'none',
                              background: 'rgba(0, 122, 255, 0.12)', color: '#007AFF', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            },
                          },
                          '导出完整备份 (JSON)'
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            onClick: openConsole,
                            style: {
                              padding: '10px 14px', borderRadius: '12px', border: 'none',
                              background: '#F2F2F7', color: '#1C1C1E', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            },
                          },
                          '刷新状态'
                        )
                      ),
                      consoleStatusMsg
                        ? h('div', { style: { fontSize: '12px', color: '#34C759', fontWeight: 600 } }, consoleStatusMsg)
                        : null
                    )
                  : h('div', { style: { padding: '20px', textAlign: 'center', color: '#8E8E93', fontSize: '13px' } }, '正在读取 DSH 宿主状态...')
              )
            )
          : null
      )
    }

    const name = 'dsh-plugin-jphone'
    const inject = ['slots']

    function apply(ctx) {
      let uiWorkspaceRef = null
      if (typeof ctx.inject === 'function') {
        ctx.inject(['uiWorkspace'], (sub) => {
          uiWorkspaceRef = sub.uiWorkspace
          sub.effect(() => () => {
            if (uiWorkspaceRef === sub.uiWorkspace) uiWorkspaceRef = null
          })
        })
      }
      const openSessionInDsh = (sessionId) => {
        try {
          const ws = uiWorkspaceRef || (typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : null)
          if (ws && typeof ws.openSession === 'function') {
            ws.openSession(sessionId)
            return true
          }
          console.warn('[dsh-plugin-jphone] uiWorkspace.openSession unavailable')
        } catch (err) {
          console.warn('[dsh-plugin-jphone] openSession failed:', err)
        }
        return false
      }

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'jphone.overlay',
            inject: () => ({ openSessionInDsh }),
          },
          JPhoneOverlay
        )
      )
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
