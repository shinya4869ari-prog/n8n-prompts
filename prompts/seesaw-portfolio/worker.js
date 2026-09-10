export default {
  async fetch(request, env, ctx) {
    return new Response(HTML_CONTENT, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  },
};

const HTML_CONTENT = $(<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Seesaw Portfolio | NASDAQ100 × ゴールド シーソー運用管理</title>
  <meta name="description" content="NASDAQ100 (2631) とゴールド (1540) の50:50シーソー投資運用・リバランス判定ダッシュボード">
  <!-- Google Fonts: Inter & Outfit -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --bg-primary: #090d16;
      --bg-surface: rgba(18, 24, 38, 0.75);
      --bg-card: rgba(23, 32, 51, 0.65);
      --bg-card-hover: rgba(30, 41, 65, 0.8);
      --bg-input: rgba(10, 16, 28, 0.85);
      
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-focus: #38bdf8;
      --border-card: rgba(255, 255, 255, 0.1);
      
      --nasdaq-cyan: #00e5ff;
      --nasdaq-cyan-dim: rgba(0, 229, 255, 0.15);
      --nasdaq-cyan-glow: rgba(0, 229, 255, 0.35);
      
      --gold-amber: #f59e0b;
      --gold-amber-light: #fbbf24;
      --gold-amber-dim: rgba(245, 158, 11, 0.15);
      --gold-amber-glow: rgba(245, 158, 11, 0.35);
      
      --emerald-profit: #10b981;
      --emerald-dim: rgba(16, 185, 129, 0.15);
      --rose-loss: #f43f5e;
      --rose-dim: rgba(244, 63, 94, 0.15);
      
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 24px;
      
      --shadow-card: 0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      --shadow-glow-cyan: 0 0 25px rgba(0, 229, 255, 0.25);
      --shadow-glow-gold: 0 0 25px rgba(245, 158, 11, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(0, 229, 255, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(56, 189, 248, 0.06) 0%, transparent 55%);
      background-attachment: fixed;
      color: var(--text-main);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 16px 12px 60px;
    }

    .app-wrapper {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ============================================================
       Header Section
    ============================================================ */
    .app-header {
      padding: 14px 18px;
      background: var(--bg-surface);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: var(--shadow-card);
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(245, 158, 11, 0.2));
      border: 1px solid var(--border-card);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.1);
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      background: linear-gradient(90deg, #ffffff 30%, var(--nasdaq-cyan) 70%, var(--gold-amber-light) 100%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 500;
      margin-top: 2px;
    }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--nasdaq-cyan);
    }

    .header-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--emerald-profit);
      box-shadow: 0 0 8px var(--emerald-profit);
      animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* ============================================================
       Cards Foundation
    ============================================================ */
    .card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-xl);
      padding: 20px;
      box-shadow: var(--shadow-card);
      transition: transform 0.2s ease, border-color 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    /* ============================================================
       Interactive Seesaw Visualizer
    ============================================================ */
    .seesaw-card {
      padding: 16px 20px 14px;
      text-align: center;
    }

    .seesaw-caption {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      font-weight: 600;
      margin-bottom: 8px;
    }

    .seesaw-stage {
      height: 85px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      perspective: 800px;
    }

    .seesaw-beam-wrap {
      width: 86%;
      height: 48px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-origin: center center;
    }

    .seesaw-beam-bar {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, var(--nasdaq-cyan) 0%, #3b82f6 40%, #d97706 60%, var(--gold-amber) 100%);
      border-radius: 3px;
      transform: translateY(-50%);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
    }

    .seesaw-pan {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      transition: transform 0.3s ease;
    }

    .pan-nasdaq {
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(14, 165, 233, 0.4));
      border: 1px solid var(--nasdaq-cyan);
      box-shadow: var(--shadow-glow-cyan);
      color: #fff;
    }

    .pan-gold {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(217, 119, 6, 0.4));
      border: 1px solid var(--gold-amber-light);
      box-shadow: var(--shadow-glow-gold);
      color: #fff;
    }

    .pan-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .pan-pct {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 800;
    }

    .seesaw-fulcrum {
      width: 0;
      height: 0;
      border-left: 14px solid transparent;
      border-right: 14px solid transparent;
      border-bottom: 22px solid #475569;
      margin-top: -8px;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    }

    .seesaw-balance-status {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* ============================================================
       Portfolio Summary Card (Hero Stats)
    ============================================================ */
    .stat-hero-card {
      position: relative;
    }

    .stat-hero-card::before {
      content: '';
      position: absolute;
      top: -20%;
      right: -10%;
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .stat-hero-title {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .total-valuation {
      font-family: 'Outfit', sans-serif;
      font-size: 2.35rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 4px 0 6px;
      line-height: 1.1;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .currency-symbol {
      font-size: 1.5rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .profit-pill-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 30px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88rem;
      font-weight: 700;
      transition: all 0.3s ease;
    }

    .profit-pill-wrap.profit {
      background: var(--emerald-dim);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald-profit);
    }

    .profit-pill-wrap.loss {
      background: var(--rose-dim);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: var(--rose-loss);
    }

    /* 50:50 Target Gauge Bar */
    .gauge-wrapper {
      margin-top: 18px;
    }

    .gauge-track {
      background: #0f172a;
      height: 14px;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      border: 1px solid var(--border-subtle);
      position: relative;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
    }

    .gauge-segment-nasdaq {
      background: linear-gradient(90deg, #0284c7, var(--nasdaq-cyan));
      height: 100%;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
    }

    .gauge-segment-gold {
      background: linear-gradient(90deg, var(--gold-amber), var(--gold-amber-light));
      height: 100%;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
    }

    .gauge-center-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ffffff;
      transform: translateX(-50%);
      z-index: 5;
      box-shadow: 0 0 6px #fff;
    }

    .gauge-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 0.8rem;
    }

    .gauge-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    .stat-dot-nasdaq {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--nasdaq-cyan);
      box-shadow: 0 0 6px var(--nasdaq-cyan);
    }

    .stat-dot-gold {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--gold-amber);
      box-shadow: 0 0 6px var(--gold-amber);
    }

    /* ============================================================
       Rebalance Action Signal Card
    ============================================================ */
    .signal-card {
      border: 1px solid rgba(56, 189, 248, 0.3);
      background: linear-gradient(145deg, rgba(15, 30, 50, 0.8), rgba(20, 36, 60, 0.65));
      position: relative;
    }

    .signal-card.balanced {
      border-color: rgba(16, 185, 129, 0.4);
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.7));
    }

    .signal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .signal-tag {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .signal-badge-state {
      font-size: 0.72rem;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
    }

    .signal-body {
      font-size: 1.08rem;
      font-weight: 700;
      line-height: 1.45;
      padding: 12px 14px;
      background: rgba(10, 16, 28, 0.7);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      margin-bottom: 8px;
    }

    .signal-detail {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* ============================================================
       Asset Position Cards (Inputs)
    ============================================================ */
    .asset-card {
      position: relative;
    }

    .asset-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .asset-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .asset-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .badge-nasdaq {
      background: var(--nasdaq-cyan-dim);
      color: var(--nasdaq-cyan);
      border: 1px solid rgba(0, 229, 255, 0.3);
    }

    .badge-gold {
      background: var(--gold-amber-dim);
      color: var(--gold-amber-light);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .asset-name {
      font-size: 0.95rem;
      font-weight: 700;
    }

    .asset-subtotal {
      text-align: right;
    }

    .asset-subtotal-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .asset-subtotal-pct {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .input-field-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }

    .input-box-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .custom-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.05rem;
      font-weight: 600;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .custom-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
    }

    /* Stepper buttons */
    .stepper-row {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }

    .step-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      padding: 4px 0;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .step-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    .step-btn:active {
      transform: scale(0.96);
    }

    /* ============================================================
       Settings Accordion Card
    ============================================================ */
    .settings-card {
      padding: 14px 18px;
    }

    .settings-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }

    .settings-toggle-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-chevron {
      transition: transform 0.25s ease;
      font-size: 0.8rem;
      color: var(--text-dim);
    }

    .settings-chevron.open {
      transform: rotate(180deg);
    }

    .settings-content {
      display: none;
      padding-top: 14px;
      margin-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }

    .settings-content.open {
      display: block;
    }

    .action-btn-row {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }

    .util-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 8px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .util-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    /* Toast Notification */
    .toast-msg {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(18, 24, 38, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--text-main);
      padding: 8px 18px;
      border-radius: 24px;
      font-size: 0.8rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 999;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toast-msg.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>

  <div class="app-wrapper">
    <!-- Header -->
    <header class="app-header">
      <div class="brand-left">
        <div class="brand-icon">⚖️</div>
        <div>
          <div class="brand-title">Seesaw Portfolio</div>
          <div class="brand-subtitle">NASDAQ100 × ゴールド シーソー運用管理</div>
        </div>
      </div>
      <div class="header-badge">
        <span class="header-badge-dot"></span>
        <span>50 : 50 Target</span>
      </div>
    </header>

    <!-- Animated Seesaw Balance Visualization -->
    <div class="card seesaw-card">
      <div class="seesaw-caption">Real-Time Balance Angle</div>
      <div class="seesaw-stage">
        <div class="seesaw-beam-wrap" id="seesawBeam">
          <div class="seesaw-pan pan-nasdaq">
            <span class="pan-label">2631</span>
            <span class="pan-pct" id="panPctNasdaq">50%</span>
          </div>
          <div class="seesaw-beam-bar"></div>
          <div class="seesaw-pan pan-gold">
            <span class="pan-label">1540</span>
            <span class="pan-pct" id="panPctGold">50%</span>
          </div>
        </div>
        <div class="seesaw-fulcrum"></div>
      </div>
      <div class="seesaw-balance-status" id="seesawStatus">⚖️ 理想的な均衡状態です</div>
    </div>

    <!-- Portfolio Summary (Hero Stat) -->
    <div class="card stat-hero-card">
      <div class="stat-hero-title">
        <span>ポートフォリオ総評価額</span>
        <span id="saveStatusIndicator" style="font-size:0.7rem; color:var(--text-dim);">Auto-Saved ⚡</span>
      </div>
      <div class="total-valuation">
        <span class="currency-symbol">¥</span>
        <span id="totalAssetDisplay">0</span>
      </div>
      <div id="totalProfitPill" class="profit-pill-wrap profit">
        <span id="profitSign">+</span>¥<span id="profitAmount">0</span>
        (<span id="profitPercentage">0.00%</span>)
      </div>

      <!-- Ratio Progress Gauge -->
      <div class="gauge-wrapper">
        <div class="gauge-track">
          <div class="gauge-segment-nasdaq" id="gaugeNasdaq" style="width: 50%;"></div>
          <div class="gauge-center-line" title="Target 50:50"></div>
          <div class="gauge-segment-gold" id="gaugeGold" style="width: 50%;"></div>
        </div>
        <div class="gauge-footer">
          <div class="gauge-stat" style="color: var(--nasdaq-cyan);">
            <span class="stat-dot-nasdaq"></span>
            <span>2631: <strong id="lblPctNasdaq">50.0%</strong></span>
          </div>
          <div class="gauge-stat" style="color: var(--gold-amber-light);">
            <span class="stat-dot-gold"></span>
            <span>1540: <strong id="lblPctGold">50.0%</strong></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rebalance Action Signal Card -->
    <div class="card signal-card" id="signalContainer">
      <div class="signal-header">
        <div class="signal-tag" id="signalTag" style="color: var(--nasdaq-cyan);">
          <span>🎯 リバランス指示シグナル</span>
        </div>
        <div class="signal-badge-state" id="signalBadgeState">判定中</div>
      </div>
      <div class="signal-body" id="signalText">
        計算中...
      </div>
      <div class="signal-detail" id="signalDetail">
        50:50 目標比率に基づき、乖離額を売買可能口数で自動算出しています。
      </div>
    </div>

    <!-- Position Input 1: NASDAQ100 (2631) -->
    <div class="card asset-card">
      <div class="asset-card-header">
        <div class="asset-title-group">
          <span class="asset-badge badge-nasdaq">2631</span>
          <div>
            <div class="asset-name">MAXIS ナスダック100</div>
            <div style="font-size:0.68rem; color:var(--text-dim);">米ハイテク株指数連動ETF</div>
          </div>
        </div>
        <div class="asset-subtotal">
          <div class="asset-subtotal-val" id="subtotal2631">¥0</div>
          <div class="asset-subtotal-pct" id="subtotalPct2631">0.0%</div>
        </div>
      </div>
      <div class="inputs-grid">
        <div class="input-field-block">
          <div class="input-label">
            <span>保有口数</span>
            <span style="color:var(--nasdaq-cyan);">口</span>
          </div>
          <div class="input-box-wrapper">
            <input type="number" id="qty2631" class="custom-input" value="8" min="0" step="1">
          </div>
          <div class="stepper-row">
            <button type="button" class="step-btn" onclick="adjustInput('qty2631', -1)">-1</button>
            <button type="button" class="step-btn" onclick="adjustInput('qty2631', 1)">+1</button>
            <button type="button" class="step-btn" onclick="adjustInput('qty2631', 5)">+5</button>
          </div>
        </div>
        <div class="input-field-block">
          <div class="input-label">
            <span>現在株価</span>
            <span style="color:var(--nasdaq-cyan);">円</span>
          </div>
          <div class="input-box-wrapper">
            <input type="number" id="price2631" class="custom-input" value="32500" min="1" step="10">
          </div>
          <div class="stepper-row">
            <button type="button" class="step-btn" onclick="adjustInput('price2631', -100)">-100</button>
            <button type="button" class="step-btn" onclick="adjustInput('price2631', 100)">+100</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Position Input 2: Gold (1540) -->
    <div class="card asset-card">
      <div class="asset-card-header">
        <div class="asset-title-group">
          <span class="asset-badge badge-gold">1540</span>
          <div>
            <div class="asset-name">純金上場信託 (金の果実)</div>
            <div style="font-size:0.68rem; color:var(--text-dim);">金現物国内保管型ETF</div>
          </div>
        </div>
        <div class="asset-subtotal">
          <div class="asset-subtotal-val" id="subtotal1540">¥0</div>
          <div class="asset-subtotal-pct" id="subtotalPct1540">0.0%</div>
        </div>
      </div>
      <div class="inputs-grid">
        <div class="input-field-block">
          <div class="input-label">
            <span>保有口数</span>
            <span style="color:var(--gold-amber-light);">口</span>
          </div>
          <div class="input-box-wrapper">
            <input type="number" id="qty1540" class="custom-input" value="12" min="0" step="1">
          </div>
          <div class="stepper-row">
            <button type="button" class="step-btn" onclick="adjustInput('qty1540', -1)">-1</button>
            <button type="button" class="step-btn" onclick="adjustInput('qty1540', 1)">+1</button>
            <button type="button" class="step-btn" onclick="adjustInput('qty1540', 5)">+5</button>
          </div>
        </div>
        <div class="input-field-block">
          <div class="input-label">
            <span>現在価格</span>
            <span style="color:var(--gold-amber-light);">円</span>
          </div>
          <div class="input-box-wrapper">
            <input type="number" id="price1540" class="custom-input" value="20000" min="1" step="10">
          </div>
          <div class="stepper-row">
            <button type="button" class="step-btn" onclick="adjustInput('price1540', -100)">-100</button>
            <button type="button" class="step-btn" onclick="adjustInput('price1540', 100)">+100</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Accordion -->
    <div class="card settings-card">
      <div class="settings-toggle" onclick="toggleSettings()">
        <div class="settings-toggle-title">
          <span>⚙️</span>
          <span>初期元本・運用設定</span>
        </div>
        <span class="settings-chevron" id="settingsChevron">▼</span>
      </div>
      <div class="settings-content" id="settingsContent">
        <div class="input-field-block">
          <div class="input-label">
            <span>初期投資元本 (合計投資額)</span>
            <span>円</span>
          </div>
          <div class="input-box-wrapper">
            <input type="number" id="baseCapital" class="custom-input" value="500000" step="10000">
          </div>
        </div>
        
        <div class="action-btn-row">
          <button type="button" class="util-btn" onclick="loadPresetData()">
            <span>🔄</span> 初期サンプル値に戻す
          </button>
          <button type="button" class="util-btn" onclick="copyRebalanceSignal()">
            <span>📋</span> シグナルをコピー
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="toast-msg" id="toast">✨ 保存完了</div>

  <!-- App Calculation Script -->
  <script>
    const inputIds = ['baseCapital', 'qty2631', 'price2631', 'qty1540', 'price1540'];

    // 1. 初期ロード & LocalStorage復元
    window.addEventListener('DOMContentLoaded', () => {
      inputIds.forEach(id => {
        const saved = localStorage.getItem('seesaw_' + id);
        if (saved !== null) {
          const el = document.getElementById(id);
          if (el) el.value = saved;
        }
        document.getElementById(id).addEventListener('input', () => {
          saveToLocalStorage();
          calculatePortfolio();
        });
      });
      calculatePortfolio();
    });

    // 2. LocalStorage保存
    function saveToLocalStorage() {
      inputIds.forEach(id => {
        localStorage.setItem('seesaw_' + id, document.getElementById(id).value);
      });
    }

    // 3. スリッパ / ボタンによる微調整
    function adjustInput(id, delta) {
      const el = document.getElementById(id);
      let val = parseFloat(el.value) || 0;
      val = Math.max(0, val + delta);
      el.value = val;
      saveToLocalStorage();
      calculatePortfolio();
    }

    // 4. 設定アコーディオンの開閉
    function toggleSettings() {
      const content = document.getElementById('settingsContent');
      const chevron = document.getElementById('settingsChevron');
      content.classList.toggle('open');
      chevron.classList.toggle('open');
    }

    // 5. サンプル初期データの復元
    function loadPresetData() {
      document.getElementById('baseCapital').value = 500000;
      document.getElementById('qty2631').value = 8;
      document.getElementById('price2631').value = 32500;
      document.getElementById('qty1540').value = 12;
      document.getElementById('price1540').value = 20000;
      saveToLocalStorage();
      calculatePortfolio();
      showToast('サンプル初期値を復元しました');
    }

    // 6. トーストメッセージ表示
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }

    // 7. シグナルコピー
    function copyRebalanceSignal() {
      const signalText = document.getElementById('signalText').innerText;
      navigator.clipboard.writeText('【Seesaw Portfolio リバランス判定】\n' + signalText).then(() => {
        showToast('📋 リバランス指示をコピーしました');
      }).catch(() => {
        showToast('コピーできませんでした');
      });
    }

    // 8. メイン計算ロジック & UIレンダリング
    function calculatePortfolio() {
      const capital = parseFloat(document.getElementById('baseCapital').value) || 0;
      const q2631 = parseFloat(document.getElementById('qty2631').value) || 0;
      const p2631 = parseFloat(document.getElementById('price2631').value) || 0;
      const q1540 = parseFloat(document.getElementById('qty1540').value) || 0;
      const p1540 = parseFloat(document.getElementById('price1540').value) || 0;

      // 評価額算出
      const val2631 = q2631 * p2631;
      const val1540 = q1540 * p1540;
      const total = val2631 + val1540;

      // 損益算出
      const profit = total - capital;
      const profitPct = capital > 0 ? (profit / capital) * 100 : 0;

      // 比率算出
      const pct2631 = total > 0 ? (val2631 / total) * 100 : 50;
      const pct1540 = total > 0 ? (val1540 / total) * 100 : 50;

      // 画面反映: 総資産額
      document.getElementById('totalAssetDisplay').innerText = Math.floor(total).toLocaleString('ja-JP');

      // 画面反映: 損益ピル
      const pill = document.getElementById('totalProfitPill');
      const signEl = document.getElementById('profitSign');
      const amountEl = document.getElementById('profitAmount');
      const pctEl = document.getElementById('profitPercentage');

      if (profit >= 0) {
        pill.className = 'profit-pill-wrap profit';
        signEl.innerText = '+';
      } else {
        pill.className = 'profit-pill-wrap loss';
        signEl.innerText = '-';
      }
      amountEl.innerText = Math.abs(Math.floor(profit)).toLocaleString('ja-JP');
      pctEl.innerText = (profit >= 0 ? '+' : '') + profitPct.toFixed(2) + '%';

      // 画面反映: 比率ゲージ
      document.getElementById('gaugeNasdaq').style.width = pct2631 + '%';
      document.getElementById('gaugeGold').style.width = pct1540 + '%';
      document.getElementById('lblPctNasdaq').innerText = pct2631.toFixed(1) + '%';
      document.getElementById('lblPctGold').innerText = pct1540.toFixed(1) + '%';

      // 画面反映: 小計
      document.getElementById('subtotal2631').innerText = '¥' + Math.floor(val2631).toLocaleString('ja-JP');
      document.getElementById('subtotalPct2631').innerText = pct2631.toFixed(1) + '%';
      document.getElementById('subtotal1540').innerText = '¥' + Math.floor(val1540).toLocaleString('ja-JP');
      document.getElementById('subtotalPct1540').innerText = pct1540.toFixed(1) + '%';

      // 画面反映: シーソー天秤のアニメーション傾き
      // 50%を基準に最大±14度傾ける
      const beam = document.getElementById('seesawBeam');
      const panNasdaq = document.getElementById('panPctNasdaq');
      const panGold = document.getElementById('panPctGold');
      const statusEl = document.getElementById('seesawStatus');

      panNasdaq.innerText = Math.round(pct2631) + '%';
      panGold.innerText = Math.round(pct1540) + '%';

      // 比率差: (pct1540 - pct2631) -> プラスならGoldが重い（右に傾く）
      const diffPct = pct1540 - pct2631; 
      const angle = Math.max(-14, Math.min(14, (diffPct * 0.45)));
      beam.style.transform = `rotate(${angle}deg)`;

      if (Math.abs(diffPct) < 3) {
        statusEl.innerText = '⚖️ 理想的な均衡状態です（50:50キープ）';
        statusEl.style.color = 'var(--emerald-profit)';
      } else if (diffPct > 0) {
        statusEl.innerText = '🪙 ゴールド(1540) が優勢に傾いています';
        statusEl.style.color = 'var(--gold-amber-light)';
      } else {
        statusEl.innerText = '📈 ナスダック(2631) が優勢に傾いています';
        statusEl.style.color = 'var(--nasdaq-cyan)';
      }

      // 画面反映: リバランス指示
      const targetVal = total / 2; // 目標は50%
      const diff2631 = val2631 - targetVal; // 2631の超過額

      const signalBox = document.getElementById('signalContainer');
      const signalTag = document.getElementById('signalTag');
      const badgeState = document.getElementById('signalBadgeState');
      const signalText = document.getElementById('signalText');
      const signalDetail = document.getElementById('signalDetail');

      if (p2631 > 0 && p1540 > 0) {
        if (diff2631 > p2631) {
          // 2631が過剰 -> 2631を売却、1540を購入
          const sellQty = Math.floor(diff2631 / p2631);
          const sellAmount = sellQty * p2631;
          const buyQty = Math.floor(sellAmount / p1540);
          const buyAmount = buyQty * p1540;

          signalBox.className = 'card signal-card';
          signalTag.style.color = 'var(--nasdaq-cyan)';
          badgeState.style.background = 'rgba(0, 229, 255, 0.15)';
          badgeState.style.color = 'var(--nasdaq-cyan)';
          badgeState.innerText = '要リバランス';

          signalText.innerHTML = `【2631】を <strong style="color:var(--nasdaq-cyan); font-size:1.25rem;">${sellQty}</strong> 口 売却<br>➔ 【1540】を <strong style="color:var(--gold-amber-light); font-size:1.25rem;">${buyQty}</strong> 口 買付`;
          signalDetail.innerHTML = `2631の利益確定見込額: 約 <strong>¥${sellAmount.toLocaleString('ja-JP')}</strong><br>1540への再投資予定額: 約 <strong>¥${buyAmount.toLocaleString('ja-JP')}</strong>（残余キャッシュ: ¥${(sellAmount - buyAmount).toLocaleString('ja-JP')}）`;
        } else if (-diff2631 > p1540) {
          // 1540が過剰 -> 1540を売却、2631を購入
          const sellQty = Math.floor(-diff2631 / p1540);
          const sellAmount = sellQty * p1540;
          const buyQty = Math.floor(sellAmount / p2631);
          const buyAmount = buyQty * p2631;

          signalBox.className = 'card signal-card';
          signalTag.style.color = 'var(--gold-amber-light)';
          badgeState.style.background = 'rgba(245, 158, 11, 0.15)';
          badgeState.style.color = 'var(--gold-amber-light)';
          badgeState.innerText = '要リバランス';

          signalText.innerHTML = `【1540】を <strong style="color:var(--gold-amber-light); font-size:1.25rem;">${sellQty}</strong> 口 売却<br>➔ 【2631】を <strong style="color:var(--nasdaq-cyan); font-size:1.25rem;">${buyQty}</strong> 口 買付`;
          signalDetail.innerHTML = `1540の利益確定見込額: 約 <strong>¥${sellAmount.toLocaleString('ja-JP')}</strong><br>2631への再投資予定額: 約 <strong>¥${buyAmount.toLocaleString('ja-JP')}</strong>（残余キャッシュ: ¥${(sellAmount - buyAmount).toLocaleString('ja-JP')}）`;
        } else {
          // 乖離が売買単価未満（調整不要）
          signalBox.className = 'card signal-card balanced';
          signalTag.style.color = 'var(--emerald-profit)';
          badgeState.style.background = 'rgba(16, 185, 129, 0.15)';
          badgeState.style.color = 'var(--emerald-profit)';
          badgeState.innerText = '比率良好';

          signalText.innerHTML = `✨ 比率バランス良好（調整不要）`;
          signalDetail.innerHTML = `現在の乖離額（約 ¥${Math.abs(Math.floor(diff2631)).toLocaleString('ja-JP')}）は1口の売買単位に満たないため、リバランスの必要はありません。このまま運用を継続してください。`;
        }
      }
    }
  </script>
</body>
</html>
.Replace('\', '\\').Replace('', '\').Replace('$', '\$'));
