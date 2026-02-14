const engines = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",
    searchUrl: "https://chat.openai.com/?q=%s",
  },
  {
    key: "gemini",
    label: "Gemini",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com",
    searchUrl: "https://gemini.google.com/app",
  },
  {
    key: "claude",
    label: "Claude",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=claude.ai",
    searchUrl: "https://claude.ai/new",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
    searchUrl: "https://www.youtube.com/results?search_query=%s",
  },
  {
    key: "arenaai",
    label: "Arena.ai",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=arena.ai",
    searchUrl: "https://arena.ai",
  },
  {
    key: "colab",
    label: "Google Colab",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=colab.research.google.com",
    searchUrl: "https://colab.research.google.com/",
  },
  {
    key: "windsurf",
    label: "Windsurf",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=codeium.com",
    searchUrl: "https://windsurf.com/",
  },
  {
    key: "github",
    label: "GitHub",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=github.com",
    searchUrl: "https://github.com/search?q=%s",
  },
  {
    key: "stackoverflow",
    label: "Stack Overflow",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=stackoverflow.com",
    searchUrl: "https://stackoverflow.com/search?q=%s",
  },
  {
    key: "mdn",
    label: "MDN",
    icon: "https://www.google.com/s2/favicons?sz=64&domain=developer.mozilla.org",
    searchUrl: "https://developer.mozilla.org/en-US/search?q=%s",
  },
];

const slider = document.getElementById("engine_slider");
const searchInput = document.getElementById("search_keyword");
const selectedLogo = document.getElementById("selected_engine_logo");
const dock = document.getElementById("app_dock");
const themeToggle = document.getElementById("theme_toggle");
const timeEl = document.querySelector(".time");
const dateEl = document.querySelector(".date");

const hasPublicSearchEndpoint = (engine) => engine.searchUrl.includes("%s");
const sliderEngines = engines.filter((engine) => hasPublicSearchEndpoint(engine));
const dockEngines = engines.filter((engine) => !hasPublicSearchEndpoint(engine));

const repeats = 11;
const middleRepeat = Math.floor(repeats / 2);

let selectedEngineIndex = 0;
let cycleHeight = 0;
let scrollEndTimer = null;
let isProgrammaticScroll = false;
let isDragging = false;
let isPointerDown = false;
let activePointerId = null;
let dragStartY = 0;
let dragStartScrollTop = 0;
let dragLastY = 0;
let dragLastTime = 0;
let dragVelocity = 0;
let didDrag = false;
let suppressClickUntil = 0;
let selectedRenderedIndex = -1;
let smoothScrollFrame = null;
let inertiaFrame = null;
const THEME_KEY = "newtab-theme";
const SNAP_DELAY_MS = 120;

function buildSlider() {
  if (!sliderEngines.length) return;
  let renderedIndex = 0;
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    sliderEngines.forEach((engine, engineIndex) => {
      const currentRenderedIndex = renderedIndex;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "engine_icon";
      button.setAttribute("aria-label", engine.label);
      button.dataset.index = String(currentRenderedIndex);
      button.dataset.engineIndex = String(engineIndex);
      button.title = engine.label;

      const image = document.createElement("img");
      image.src = engine.icon;
      image.alt = engine.label;

      button.appendChild(image);
      button.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        scrollToRenderedIndex(currentRenderedIndex);
        applySelectionByRenderedIndex(currentRenderedIndex);
      });

      slider.appendChild(button);
      renderedIndex += 1;
    });
  }
}

function applySelectionByRenderedIndex(renderedIndex) {
  if (!sliderEngines.length) return;
  if (renderedIndex === selectedRenderedIndex) return;
  selectedRenderedIndex = renderedIndex;
  const normalizedIndex =
    ((renderedIndex % sliderEngines.length) + sliderEngines.length) % sliderEngines.length;
  selectedEngineIndex = normalizedIndex;

  const allButtons = slider.querySelectorAll(".engine_icon");
  allButtons.forEach((button, buttonIndex) => {
    button.classList.toggle("is_selected", buttonIndex === renderedIndex);
  });

  selectedLogo.src = sliderEngines[normalizedIndex].icon;
  selectedLogo.alt = `${sliderEngines[normalizedIndex].label} logo`;
}

function getNearestRenderedIndex() {
  if (!sliderEngines.length) return 0;
  const center = slider.scrollTop + slider.clientHeight / 2;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const buttons = slider.querySelectorAll(".engine_icon");

  buttons.forEach((button, index) => {
    const itemCenter = button.offsetTop + button.clientHeight / 2;
    const distance = Math.abs(center - itemCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function scrollToRenderedIndex(renderedIndex) {
  const target = slider.querySelector(`.engine_icon[data-index="${renderedIndex}"]`);
  if (!target) return;
  const targetTop = target.offsetTop - (slider.clientHeight - target.clientHeight) / 2;
  animateScrollTo(targetTop, 220);
}

function measureCycleHeight() {
  const buttons = slider.querySelectorAll(".engine_icon");
  if (buttons.length <= sliderEngines.length) return;
  cycleHeight = buttons[sliderEngines.length].offsetTop - buttons[0].offsetTop;
}

function centerAtMiddleRepeat(engineIndex) {
  if (!sliderEngines.length) return;
  const start = middleRepeat * sliderEngines.length;
  const renderedIndex = start + engineIndex;
  const target = slider.querySelector(`.engine_icon[data-index="${renderedIndex}"]`);
  if (!target) return;
  const targetTop = target.offsetTop - (slider.clientHeight - target.clientHeight) / 2;
  isProgrammaticScroll = true;
  slider.scrollTop = targetTop;
  requestAnimationFrame(() => {
    isProgrammaticScroll = false;
  });
  applySelectionByRenderedIndex(renderedIndex);
}

function normalizeInfiniteScrollPosition() {
  if (!cycleHeight) return;
  const minThreshold = cycleHeight;
  const maxThreshold = slider.scrollHeight - slider.clientHeight - cycleHeight;

  if (slider.scrollTop < minThreshold) {
    slider.scrollTop += cycleHeight * middleRepeat;
  } else if (slider.scrollTop > maxThreshold) {
    slider.scrollTop -= cycleHeight * middleRepeat;
  }
}

function handleSnapSelection() {
  normalizeInfiniteScrollPosition();
  const nearestRenderedIndex = getNearestRenderedIndex();
  applySelectionByRenderedIndex(nearestRenderedIndex);
  scrollToRenderedIndex(nearestRenderedIndex);
}

function stopSmoothScroll() {
  if (smoothScrollFrame) {
    cancelAnimationFrame(smoothScrollFrame);
    smoothScrollFrame = null;
  }
}

function stopInertiaScroll() {
  if (inertiaFrame) {
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = null;
  }
}

function animateScrollTo(targetTop, duration = 220) {
  stopSmoothScroll();
  stopInertiaScroll();
  const startTop = slider.scrollTop;
  const delta = targetTop - startTop;
  if (Math.abs(delta) < 0.5) {
    slider.scrollTop = targetTop;
    return;
  }

  const startTime = performance.now();
  isProgrammaticScroll = true;

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const ease = 1 - Math.pow(1 - t, 3);
    slider.scrollTop = startTop + delta * ease;
    normalizeInfiniteScrollPosition();
    if (t < 1) {
      smoothScrollFrame = requestAnimationFrame(step);
      return;
    }
    smoothScrollFrame = null;
    isProgrammaticScroll = false;
  };

  smoothScrollFrame = requestAnimationFrame(step);
}

function startInertiaScroll() {
  stopInertiaScroll();
  if (Math.abs(dragVelocity) < 0.05) {
    handleSnapSelection();
    return;
  }

  const decay = 0.94;
  const minVelocity = 0.03;
  isProgrammaticScroll = true;
  const step = () => {
    slider.scrollTop -= dragVelocity * 16;
    normalizeInfiniteScrollPosition();
    const nearestRenderedIndex = getNearestRenderedIndex();
    applySelectionByRenderedIndex(nearestRenderedIndex);

    dragVelocity *= decay;
    if (Math.abs(dragVelocity) < minVelocity) {
      inertiaFrame = null;
      isProgrammaticScroll = false;
      handleSnapSelection();
      return;
    }
    inertiaFrame = requestAnimationFrame(step);
  };

  inertiaFrame = requestAnimationFrame(step);
}

function openSelectedSearch() {
  if (!sliderEngines.length) return;
  const query = encodeURIComponent(searchInput.value.trim());
  let url = sliderEngines[selectedEngineIndex].searchUrl;
  if (url.includes("%s")) {
    url = url.replace("%s", query);
  }
  window.open(url, "_self");
}

function openEngine(engine) {
  const query = encodeURIComponent(searchInput.value.trim());
  let url = engine.searchUrl;
  if (url.includes("%s")) {
    url = url.replace("%s", query);
  }
  window.open(url, "_self");
}

function buildDock() {
  dockEngines.forEach((engine) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dock_icon";
    button.setAttribute("aria-label", engine.label);
    button.title = engine.label;

    const image = document.createElement("img");
    image.src = engine.icon;
    image.alt = engine.label;

    button.appendChild(image);
    button.addEventListener("click", () => {
      button.classList.add("is_pressed");
      setTimeout(() => {
        button.classList.remove("is_pressed");
      }, 140);
      openEngine(engine);
    });

    dock.appendChild(button);
  });
}

function applyDockMagnify(clientX) {
  const icons = dock.querySelectorAll(".dock_icon");
  icons.forEach((icon) => {
    const rect = icon.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const distance = Math.abs(clientX - center);
    const influence = Math.max(0, 1 - distance / 140);
    const scale = 1 + influence * 0.35;
    const lift = -Math.round(influence * 10);
    icon.style.setProperty("--dock-scale", scale.toFixed(3));
    icon.style.setProperty("--dock-lift", `${lift}px`);
  });
}

function resetDockMagnify() {
  const icons = dock.querySelectorAll(".dock_icon");
  icons.forEach((icon) => {
    icon.style.removeProperty("--dock-scale");
    icon.style.removeProperty("--dock-lift");
  });
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    setTheme(savedTheme);
    return;
  }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");
}

function updateDateTime() {
  if (!timeEl || !dateEl) return;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

buildSlider();
buildDock();
initTheme();
updateDateTime();
setInterval(updateDateTime, 1000);
requestAnimationFrame(() => {
  measureCycleHeight();
  centerAtMiddleRepeat(0);
});

slider.addEventListener("scroll", () => {
  normalizeInfiniteScrollPosition();
  const nearestRenderedIndex = getNearestRenderedIndex();
  applySelectionByRenderedIndex(nearestRenderedIndex);

  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = null;
  }

  if (isProgrammaticScroll) {
    return;
  }
  scrollEndTimer = setTimeout(() => {
    handleSnapSelection();
  }, SNAP_DELAY_MS);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    openSelectedSearch();
  }
});

function isTypingKey(event) {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function focusSearchInputToEnd() {
  searchInput.focus();
  const length = searchInput.value.length;
  searchInput.setSelectionRange(length, length);
}

document.addEventListener("keydown", (event) => {
  if (event.isComposing) return;

  if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    openSelectedSearch();
    return;
  }

  if (event.key === "Backspace" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.value = searchInput.value.slice(0, -1);
    focusSearchInputToEnd();
    return;
  }

  if (!isTypingKey(event)) return;

  if (document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.value += event.key;
    focusSearchInputToEnd();
  }
});

slider.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  stopSmoothScroll();
  stopInertiaScroll();
  isProgrammaticScroll = false;
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = null;
  }
  isPointerDown = true;
  activePointerId = event.pointerId;
  isDragging = false;
  didDrag = false;
  dragStartY = event.clientY;
  dragStartScrollTop = slider.scrollTop;
  dragLastY = event.clientY;
  dragLastTime = performance.now();
  dragVelocity = 0;
});

slider.addEventListener("pointermove", (event) => {
  if (!isPointerDown || event.pointerId !== activePointerId) return;
  const deltaY = event.clientY - dragStartY;
  if (!isDragging && Math.abs(deltaY) > 4) {
    isDragging = true;
    didDrag = true;
    slider.classList.add("is_dragging");
    slider.setPointerCapture(event.pointerId);
  }
  if (!isDragging) {
    return;
  }
  event.preventDefault();
  slider.scrollTop = dragStartScrollTop - deltaY;
  const now = performance.now();
  const dt = Math.max(1, now - dragLastTime);
  dragVelocity = (event.clientY - dragLastY) / dt;
  dragLastY = event.clientY;
  dragLastTime = now;
});

function stopDrag(pointerId) {
  if (pointerId !== undefined && activePointerId !== pointerId) return;
  const wasDragging = isDragging;
  isPointerDown = false;
  activePointerId = null;
  isDragging = false;
  slider.classList.remove("is_dragging");
  if (wasDragging && didDrag) {
    suppressClickUntil = Date.now() + 220;
    startInertiaScroll();
  }
  if (pointerId !== undefined && slider.hasPointerCapture(pointerId)) {
    slider.releasePointerCapture(pointerId);
  }
}

slider.addEventListener("pointerup", (event) => {
  stopDrag(event.pointerId);
});

slider.addEventListener("pointercancel", (event) => {
  stopDrag(event.pointerId);
});

slider.addEventListener("lostpointercapture", () => {
  stopDrag();
});

dock.addEventListener("mousemove", (event) => {
  applyDockMagnify(event.clientX);
});

dock.addEventListener("mouseleave", () => {
  resetDockMagnify();
});

themeToggle.addEventListener("click", () => {
  const current = document.body.dataset.theme === "dark" ? "dark" : "light";
  setTheme(current === "dark" ? "light" : "dark");
});
