// Constants
const POSTHOG_KEY = "phc_V7JMHB0fVJGRu8UHyrsj6pSL1BS76P5zD8qCi7lrTTV";

const STYLES = {
  colors: {
    text: "#5D5D5D",
    white: "#FFFFFF",
    border: "rgba(0, 10, 36, 0.08)",
  },
  font: {
    family: '"Geist"',
    weight: "600",
    size: { normal: "14px", button: "14px" },
    lineHeight: "20px",
  },
  button: {
    gradient: "linear-gradient(180deg, #A797FF 0%, #7057FF 100%)",
  },
  shadow: "0px 8px 12px 0px rgba(9, 10, 20, 0.06)",
  zIndex: `${Number.MAX_SAFE_INTEGER}`,
} as const;

// Inline SVG data URIs to avoid path issues
const SVG_ICONS = {
  close: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D303D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>')}`,
  generate: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" fill="none" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.87 4.94c.227-.71 1.21-.723 1.456-.02l1.177 3.378 3.101 1.013c.708.231.714 1.216.01 1.455l-3.183 1.082-1.105 3.17c-.245.704-1.23.69-1.455-.02l-.989-3.107-3.367-1.203c-.702-.25-.68-1.234.04-1.455l3.282-1.016 1.043-3.277Z" fill="#FFF"/><path fill-rule="evenodd" d="M12.238 1.3c.167-.667 1.1-.667 1.266 0l.388 1.551 1.55.388c.666.166.667 1.1 0 1.266l-1.55.388-.388 1.55c-.167.666-1.1.667-1.266 0l-.388-1.55-1.55-.388c-.667-.166-.667-1.1 0-1.266l1.55-.388.388-1.551Z" fill="#FFF"/></svg>')}`,
} as const;


const URLS = {
  readdyLogo: "https://public.readdy.ai/gen_page/readdy-logo.png",
  watermarkLogo: "https://public.readdy.ai/gen_page/watermark.png",
  readdyLink: "https://readdy.ai?ref=b",
  fontStylesheet: "https://fonts.googleapis.com/css2?family=Geist:wght@600&display=swap",
  posthogCDN: "https://cdn.jsdelivr.net/npm/posthog-js@1.96.1/dist/array.full.min.js",
} as const;

const TEXTS = {
  en: {
    prefix: "This Website is Made with",
    suffix: ". You can also get one like this in minutes",
    button: "Get one for FREE",
  },
  zh: {
    prefix: "本网站来自",
    suffix: "你也可以在几分钟内拥有同样的页面",
    button: "立即免费拥有",
  },
} as const;

// Utility functions
const isChinese = () => navigator.language?.toLowerCase().startsWith("zh") ?? false;
const getTexts = () => (isChinese() ? TEXTS.zh : TEXTS.en);
const getBasePath = () => process.env.NEXT_PUBLIC__BASE_PATH__ || "";
const isPC = () => window.innerWidth > 768 && !("ontouchstart" in window);

// Check if current domain should not show watermark
const isWhitelistedDomain = () => {
  const hostname = window.location.hostname;
  const whitelistedDomains = ["readdy.ai", "dev.readdy.ai", "localhost"];
  return whitelistedDomains.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
};


// PostHog
function initPostHog() {
  if ((window as any).posthog) return;
  
  const script = document.createElement("script");
  script.src = URLS.posthogCDN;
  script.async = true;
  script.onload = () => {
    (window as any).posthog?.init(POSTHOG_KEY, {
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_scroll_properties: true,
      capture_performance: {
        web_vitals: false
      },
      rageclick: false,
      loaded: function(posthog: any) {
        if (posthog.sessionRecording) {
          posthog.sessionRecording.stopRecording();
        }
      }
    });
  };
  document.head.appendChild(script);
}

function trackEvent(eventName: string, properties?: Record<string, any>) {
  (window as any).posthog?.capture(eventName, {...properties, version: 2});
}

// Style helpers
function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  Object.assign(element.style, styles);
}

function applyTextStyle(element: HTMLElement, marginRight = "0") {
  applyStyles(element, {
    color: STYLES.colors.text,
    fontFamily: STYLES.font.family,
    fontSize: STYLES.font.size.normal,
    lineHeight: STYLES.font.lineHeight,
    fontWeight: STYLES.font.weight,
    whiteSpace: "nowrap",
    marginRight,
  });
}

function applyFlexCenter(element: HTMLElement, direction: "row" | "column" = "row") {
  applyStyles(element, {
    display: "flex",
    flexDirection: direction,
    alignItems: "center",
    justifyContent: "center",
  });
}

// Main function
function initWatermark() {
  // Don't show watermark on whitelisted domains
  if (isWhitelistedDomain()) {
    return;
  }

  const apiUrl = `https://${__READDY_AI_DOMAIN__}/api/public/user/is_free`;
  const projectId = __READDY_PROJECT_ID__;

  async function checkIfPaidUser(projectId: string): Promise<boolean> {
    try {
      const response = await fetch(`${apiUrl}?projectId=${projectId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      return !res.data.is_free;
    } catch {
      return true; // 接口出错时也不显示水印
    }
  }

  function setFavicon() {
    document.querySelector('link[rel="icon"]')?.remove();
    
    const link = document.createElement("link");
    link.type = "image/png";
    link.rel = "icon";
    link.href = URLS.readdyLogo;
    document.head.appendChild(link);
    
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = URLS.fontStylesheet;
    document.head.appendChild(fontLink);
  }

  function handleClick(eventName: string) {
    trackEvent(eventName);
    window.open(URLS.readdyLink, "_blank");
  }

  function createCloseButton(): HTMLDivElement {
    const btn = document.createElement("div");
    btn.id = "close-button";
    
    applyStyles(btn, {
      position: "absolute",
      top: "-12px",
      right: "-12px",
      width: "32px",
      height: "32px",
      backgroundColor: STYLES.colors.white,
      borderRadius: "50%",
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: STYLES.colors.border,
      cursor: "pointer",
      boxShadow: STYLES.shadow,
    });
    applyFlexCenter(btn);

    const img = document.createElement("img");
    img.src = SVG_ICONS.close;
    applyStyles(img, { width: "24px", height: "24px" });
    btn.appendChild(img);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      trackEvent("watermark_close_button_click");
      document.getElementById("watermark")?.remove();
    });

    return btn;
  }

  function createGenerateButton(isPCLayout: boolean): HTMLDivElement {
    const btn = document.createElement("div");
    btn.id = "generate-button";
    
    applyStyles(btn, {
      padding: isPCLayout ? "8px 16px" : "10px 20px",
      background: STYLES.button.gradient,
      borderRadius: "999px",
      border: "none",
      gap: "6px",
      cursor: "pointer",
      marginLeft: isPCLayout ? "12px" : "0",
      whiteSpace: "nowrap",
      width: isPCLayout ? "auto" : "100%",
    });
    applyFlexCenter(btn);

    const sparkleImg = document.createElement("img");
    sparkleImg.src = SVG_ICONS.generate;
    applyStyles(sparkleImg, { width: "16px", height: "16px", flexShrink: "0" });

    const text = document.createElement("span");
    text.textContent = getTexts().button;
    applyStyles(text, {
      color: STYLES.colors.white,
      fontFamily: STYLES.font.family,
      fontSize: STYLES.font.size.button,
      fontWeight: STYLES.font.weight,
      lineHeight: STYLES.font.lineHeight,
    });

    btn.append(sparkleImg, text);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleClick("watermark_create_button_click");
    });

    return btn;
  }

  function createLogoImage(): HTMLImageElement {
    const img = document.createElement("img");
    img.src = URLS.watermarkLogo;
    applyStyles(img, {
      width: "92px",
      height: "auto",
      margin: "0 8px",
      flexShrink: "0",
      display: "block",
    });
    return img;
  }

  function createPCContent(container: HTMLDivElement) {
    const texts = getTexts();
    
    const textPre = document.createElement("div");
    textPre.textContent = texts.prefix;
    applyTextStyle(textPre);

    const img = createLogoImage();
    // img.style.marginRight = "8px";

    const textSuffix = document.createElement("div");
    textSuffix.textContent = texts.suffix;
    applyTextStyle(textSuffix, "12px");

    container.append(textPre, img, textSuffix, createGenerateButton(true));
  }

  function createTextEl(text: string, styles?: Partial<CSSStyleDeclaration>): HTMLDivElement {
    const el = document.createElement("div");
    el.textContent = text;
    applyTextStyle(el);
    if (styles) applyStyles(el, styles);
    return el;
  }

  function createMobileContent(container: HTMLDivElement) {
    const { prefix, suffix } = getTexts();
    const [dot, rest] = suffix.startsWith(".")
      ? [".", suffix.slice(1).trim()]
      : ["", suffix];

    const row1 = document.createElement("div");
    applyFlexCenter(row1);
    row1.style.marginBottom = "4px";
    row1.append(
      createTextEl(prefix),
      createLogoImage(),
      ...(dot ? [createTextEl(dot)] : []),
    );

    container.append(
      row1,
      createTextEl(rest, { textAlign: "center", marginBottom: "12px" }),
      createGenerateButton(false),
    );
  }

  function createWatermark(): HTMLDivElement {
    const isPCLayout = isPC();
    const group = document.createElement("div");
    group.id = "watermark";

    applyStyles(group, {
      zIndex: STYLES.zIndex,
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      width: isPCLayout ? "fit-content" : "calc(100% - 32px)",
      maxWidth: isPCLayout ? "none" : "100%",
      backgroundColor: STYLES.colors.white,
      borderStyle: "solid",
      borderWidth: "1px",
      borderRadius: isPCLayout ? "999px" : "36px",
      borderColor: STYLES.colors.border,
      padding: isPCLayout ? "12px 20px" : "16px",
      boxShadow: STYLES.shadow,
      cursor: "pointer",
    });
    applyFlexCenter(group, isPCLayout ? "row" : "column");

    group.appendChild(createCloseButton());
    isPCLayout ? createPCContent(group) : createMobileContent(group);

    group.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#generate-button, #close-button")) {
        handleClick("watermark_create_button_click");
      }
    });

    return group;
  }

  function handleWaterMark(isPaid: boolean) {
    const existing = document.getElementById("watermark");
    if (!existing && !isPaid) {
      document.body.appendChild(createWatermark());
      setFavicon();
      initPostHog();
    } else if (isPaid && existing) {
      existing.remove();
    }
  }
  
  if (projectId) {
    checkIfPaidUser(projectId).then(handleWaterMark);
  } else {
    handleWaterMark(false);
  }
}



initWatermark();
