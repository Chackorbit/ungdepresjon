document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector(".list");
  let nodes = Array.from(list.children);
  const roles = ["hide", "prev", "act", "next", "new-next"];
  let currentIndex = 0;
  let maxSeenIndex = 0;
  let isScrolling = false;
  let allowPageScroll = false;
  const scrollDelay = 700;
  let accumulatedDelta = 0;
  let pageScrollTimeout = null;

  const intro = document.getElementById("intro");
  const introVideo = document.getElementById("introVideo");
  const playBtn = document.querySelector(".playBtn");

  if (!intro || !introVideo) return;

  const introGif = document.getElementById("introGif");

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 480;

  if (isIOS && isMobile) {
    introGif.src = "./img/GDCRedirectMobile.gif?rand=" + Date.now();
    introGif.style.display = "block";
  }
  if (isIOS && isMobile) {
    introGif.style.display = "block";
    introVideo.style.display = "none";
  } else {
    introVideo.style.display = "block";
    introVideo.muted = true;
    introVideo.playsInline = true;
    introVideo.autoplay = true;
    introVideo.loop = true;

    const mobileSrc = "./img/GDCRedirectMobile.mp4";
    const desktopSrc = "./img/GDCRedirectDesktopresolution.mp4";
    const sourceEl = introVideo.querySelector("source");

    sourceEl.src = window.innerWidth <= 480 ? mobileSrc : desktopSrc;
    introVideo.load();

    introVideo.play().catch(() => {
      intro.addEventListener(
        "click",
        () => {
          introVideo.play().catch(() => {});
        },
        { once: true }
      );
    });
  }

  setTimeout(() => {
    intro.style.opacity = 0;
    introGif.style.opacity = 0;
  }, 8000);
  setTimeout(() => {
    intro.style.display = "none";
  }, 9000);

  const mobileSrc = "./img/GDCRedirectMobile.mp4";
  const desktopSrc = "./img/GDCRedirectDesktopresolution.mp4";

  function updateVideoSource() {
    const isMobile = window.innerWidth <= 700;
    const sourceEl = introVideo.querySelector("source");
    const currentSrc = sourceEl.src;

    if (isMobile && !currentSrc.includes("Mobile")) {
      introVideo.pause();
      sourceEl.src = mobileSrc;
      introVideo.load();
    } else if (!isMobile && !currentSrc.includes("Desktop")) {
      introVideo.pause();
      sourceEl.src = desktopSrc;
      introVideo.load();
    }
  }

  updateVideoSource();
  window.addEventListener("resize", updateVideoSource);

  function applyRoles() {
    nodes.forEach((node, i) => {
      node.className = "";
      if (i < currentIndex) node.classList.add("prev");
      else if (i === currentIndex) node.classList.add("act");
      else if (i === currentIndex + 1) node.classList.add("next");
      else node.classList.add("hide");

      const video = node.querySelector("video");
      if (video) {
        if (i === currentIndex) {
          video.play().catch(() => {});
          video.muted = false;
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }

  function animateText(el) {
    if (!el) return;

    const html = el.innerHTML;

    el.textContent = "";

    el.style.opacity = 0;
    el.style.transition = "opacity 0.8s ease";

    requestAnimationFrame(() => {
      el.style.opacity = 1;
    });

    const lines = html.split(/<br\s*\/?>/i);
    lines.forEach((line, lineIndex) => {
      line = line.replace(/\s+/g, " ").trim();
      const words = line.split(" ");

      words.forEach((word, wordIndex) => {
        const span = document.createElement("span");
        span.textContent = word;
        span.style.display = "inline-block";
        span.style.opacity = 0;
        span.style.animation = `slideInLeft 2s forwards`;
        span.style.animationDelay = `${wordIndex * 0.15 + lineIndex * 0.3}s`;
        el.appendChild(span);
        if (wordIndex < words.length - 1)
          el.appendChild(document.createTextNode(" "));
      });

      if (lineIndex < lines.length - 1)
        el.appendChild(document.createElement("br"));
    });
  }

  // const target = document.querySelector(".act .text-container");
  // if (target) {
  //   setTimeout(() => {
  //     target.classList.remove("hidden");
  //   }, 10000);
  // }

  function applyRolesWithText() {
    applyRoles(nodes);

    // один глобальний .text-container поза li
    const container = document.querySelector(".text-container");
    const p = container?.querySelector("p");
    if (!container || !p) return;

    const text = slideTexts[currentIndex] || "";
    setSlideText(text);
  }

  function smoothScrollToTop(duration = 500) {
    const start =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;
    const startTime = performance.now();

    function scrollStep(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start * (1 - ease));

      if (progress < 1) {
        requestAnimationFrame(scrollStep);
      }
    }

    requestAnimationFrame(scrollStep);
  }

  function smoothScrollToElement(el, duration = 500) {
    if (!el) return;

    const targetTop = el.getBoundingClientRect().top + window.scrollY;

    const start = window.scrollY;
    const distance = targetTop - start;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function updateArrows() {
    const arrowLeft = document.querySelector(".arrow-left");
    const arrowRight = document.querySelector(".arrow-right");

    // ліва кнопка неактивна якщо ми на першому слайді
    arrowLeft.disabled = currentIndex === 0;

    // права кнопка неактивна якщо ми на останньому слайді
    arrowRight.disabled = currentIndex === nodes.length - 1;
  }

  function next() {
    const btnWrapper = document.getElementById("btn-wrapper");
    const arrowLeft = document.querySelector(".arrow-left");

    if (currentIndex < nodes.length - 1) {
      currentIndex++;
      maxSeenIndex = Math.max(maxSeenIndex, currentIndex);
      applyRolesWithText();

      if (currentIndex === nodes.length - 1) {
        updateArrows();

        return setTimeout(() => {
          allowPageScroll = true;
        }, 1000);
      }
      allowPageScroll = false;
      updateArrows();
    }

    if (allowPageScroll) {
      btnWrapper.style.display = "flex";
      if (btnWrapper) {
        console.log("work");

        if (window.innerWidth <= 480) {
          btnWrapper.scrollIntoView({ behavior: "smooth" });
        }

        allowPageScroll = false;
      }
    }
  }

  function prev() {
    const scrollY =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;

    if (scrollY > 0) {
      const topEl = document.getElementById("top");
      if (topEl) {
        topEl.scrollIntoView({ behavior: "smooth" });
      }
    } else if (currentIndex > 0 && currentIndex <= maxSeenIndex) {
      currentIndex--;
      applyRolesWithText();
    }

    updateArrows();
  }
  updateArrows();

  list.addEventListener(
    "wheel",
    (e) => {
      const delta = e.deltaY;
      const hasNextSlides = list.querySelector(".next") !== null;
      const btnWrapper = document.querySelector(".btn-wrapper");

      if (isScrolling) {
        e.preventDefault();
        return;
      }

      if (hasNextSlides) {
        e.preventDefault();
        accumulatedDelta += delta;

        if (accumulatedDelta > 50) {
          isScrolling = true;
          next();
          accumulatedDelta = 0;

          if (!list.querySelector(".next") && btnWrapper) {
            allowPageScroll = false;
            btnWrapper.scrollIntoView({ behavior: "smooth" });
            pageScrollTimeout = setTimeout(() => {
              allowPageScroll = true;
            }, 1000);
          }

          setTimeout(() => (isScrolling = false), scrollDelay);
        } else if (accumulatedDelta < -50) {
          if ((window.scrollY || document.documentElement.scrollTop) === 0) {
            isScrolling = true;
            prev();
            accumulatedDelta = 0;
            setTimeout(() => (isScrolling = false), scrollDelay);
          }
        }
        return;
      }

      if (!hasNextSlides && btnWrapper) {
        btnWrapper.style.display = "flex";

        if (delta > 0) {
          if (!allowPageScroll) {
            e.preventDefault();
            return;
          }

          smoothScrollToElement(btnWrapper, 1500);
        } else if (
          delta < 0 &&
          (window.scrollY || document.documentElement.scrollTop) === 0
        ) {
          e.preventDefault();
          isScrolling = true;
          prev();
          setTimeout(() => (isScrolling = false), scrollDelay);
        }
      }
    },
    { passive: false }
  );

  list.addEventListener("click", (e) => {
    const video = e.target.closest("video");
    if (!video) return;
    const li = video.closest("li");
    if (!li.classList.contains("act")) return;
    if (video.paused) {
      video.play();
      playBtn.remove();
    } else {
      video.pause();
    }
  });

  if (window.Hammer) {
    const h = new Hammer(list);
    h.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
    h.on("swipeleft", next);
    h.on("swiperight", prev);
    h.on("swipedown", prev);
    h.on("swipeup", next);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  applyRolesWithText();

  document.querySelector(".arrow-left").addEventListener("click", prev);
  document.querySelector(".arrow-right").addEventListener("click", next);
});

const slideTexts = [
  "Communication to kids needs to be VISUAL...",
  "In a motivating <br /> package...",
  "And with the right <br /> incentives.",
  "Testing ensures new knowledge is learned.",
];

let isAnimating = false;

function setSlideText(htmlText) {
  if (isAnimating) return;
  isAnimating = true;

  const container = document.querySelector(".text-container");
  const p = container?.querySelector("p");
  if (!container || !p) {
    isAnimating = false;
    return;
  }

  p.innerHTML = "";

  // Розбиваємо на рядки по <br>
  const lines = htmlText.split(/<br\s*\/?>/i);

  let index = 0;

  lines.forEach((line, lineIndex) => {
    // Розбиваємо на слова по пробілах
    const words = line.split(/\s+/).filter(Boolean);

    words.forEach((word, wordIndex) => {
      const span = document.createElement("span");
      span.textContent = word; // слово цілком
      span.style.display = "inline-block";
      span.style.animationDelay = `${index * 40}ms`;
      p.appendChild(span);
      index++;

      // ЯВНО додаємо пробіл між словами
      if (wordIndex < words.length - 1) {
        p.appendChild(document.createTextNode(" "));
      }
    });

    // Перенос між рядками
    if (lineIndex < lines.length - 1) {
      p.appendChild(document.createElement("br"));
    }
  });

  const totalDuration = index * 40 + 600;
  setTimeout(() => {
    isAnimating = false;
  }, totalDuration);
}
