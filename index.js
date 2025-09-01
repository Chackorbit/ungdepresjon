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
    // Примусово скидаємо GIF при кожному завантаженні
    introGif.src = "./img/GDCRedirectMobile.gif?rand=" + Date.now();
    introGif.style.display = "block";
  }
  if (isIOS && isMobile) {
    // Показуємо GIF
    introGif.style.display = "block";
    introVideo.style.display = "none";
  } else {
    // Показуємо відео
    introVideo.style.display = "block";
    introVideo.muted = true;
    introVideo.playsInline = true;
    introVideo.autoplay = true;
    introVideo.loop = true;

    const mobileSrc = "./img/GDCRedirectMobile.mp4";
    const desktopSrc = "./img/GDCRedirectDesktopresolution.mp4";
    const sourceEl = introVideo.querySelector("source");

    // Встановлюємо джерело залежно від ширини
    sourceEl.src = window.innerWidth <= 480 ? mobileSrc : desktopSrc;
    introVideo.load();

    introVideo.play().catch(() => {
      // fallback для iOS
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

  // Встановлюємо джерело залежно від мобільного / десктоп
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

  const target = document.querySelector(".act .text-container");
  if (target) {
    setTimeout(() => {
      target.classList.remove("hidden"); // додаємо клас, який робить opacity:1
    }, 10000);
  }

  function applyRolesWithText() {
    applyRoles();
    nodes.forEach((node) => {
      const textEl = node.querySelector(".text-container p");
      if (!textEl) return;
      if (node.classList.contains("act")) animateText(textEl);
      else textEl.textContent = textEl.textContent; // ❌ тут ти все ламаєш
    });
  }

  function smoothScrollToTop(duration = 500) {
    const start =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;
    const startTime = performance.now();

    function scrollStep(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1); // від 0 до 1
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      window.scrollTo(0, start * (1 - ease));

      if (progress < 1) {
        requestAnimationFrame(scrollStep);
      }
    }

    requestAnimationFrame(scrollStep);
  }

  function smoothScrollToElement(el, duration = 500) {
    if (!el) return;

    // Отримуємо координату елемента відносно документа
    const targetTop = el.getBoundingClientRect().top + window.scrollY;

    const start = window.scrollY;
    const distance = targetTop - start;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function next() {
    const btnWrapper = document.getElementById("btn-wrapper");

    if (currentIndex < nodes.length - 1) {
      currentIndex++;
      maxSeenIndex = Math.max(maxSeenIndex, currentIndex);
      applyRolesWithText();

      // Якщо ми дійшли до останнього слайда
      if (currentIndex === nodes.length - 1) {
        setTimeout(() => {
          allowPageScroll = true;
        }, 2000);
      }
    }

    if (allowPageScroll) {
      btnWrapper.style.display = "flex";
      if (btnWrapper) {
        console.log("work");

        if (window.innerWidth <= 480) {
          btnWrapper.scrollIntoView({ behavior: "smooth" });
        }
        // btnWrapper.scrollIntoView({ behavior: "smooth" });
        // smoothScrollToElement(btnWrapper, 2500);
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
      // скролимо до елемента #top
      const topEl = document.getElementById("top");
      if (topEl) {
        // smoothScrollToTop(1500);
        topEl.scrollIntoView({ behavior: "smooth" });
      }
    } else if (currentIndex > 0 && currentIndex <= maxSeenIndex) {
      currentIndex--;
      applyRolesWithText();
    }
  }

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

          // Якщо після next ми на останньому слайді — скролимо до кнопки
          if (!list.querySelector(".next") && btnWrapper) {
            allowPageScroll = false;
            btnWrapper.scrollIntoView({ behavior: "smooth" });
            pageScrollTimeout = setTimeout(() => {
              allowPageScroll = true;
            }, 1000);
          }

          setTimeout(() => (isScrolling = false), scrollDelay);
        } else if (accumulatedDelta < -50) {
          // тільки якщо сторінка в самому верху
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
          // btnWrapper.scrollIntoView({ behavior: "smooth" });
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
    // video.paused ? video.play() : video.pause();
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
});
