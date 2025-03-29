document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector(".grid");
  const allScreens = Array.from(document.querySelectorAll(".screen"));
  const selectableScreens = allScreens.filter(
    (screen) => !screen.classList.contains("no-signal")
  );
  const overlay = document.getElementById("overlay");
  const overlayContentContainer = document.querySelector(".overlay-content");
  const overlayInnerContent = document.getElementById("overlay-inner-content");
  const closeButton = document.getElementById("close-overlay");

  let selectedScreenIndex = -1;

  /**
   * Estimates the number of columns currently displayed in the grid.
   * Used for Up/Down arrow key navigation.
   */
  function getApproximateColumns() {
    if (selectableScreens.length === 0) return 1;
    try {
      const gridWidth = grid.offsetWidth;
      const firstItemStyle = window.getComputedStyle(selectableScreens[0]);
      let itemMinWidth =
        parseFloat(firstItemStyle.minWidth) ||
        selectableScreens[0].clientWidth ||
        300;
      if (itemMinWidth === 0) itemMinWidth = 300;
      const gap = parseFloat(window.getComputedStyle(grid).gap) || 15;
      const columns = Math.max(
        1,
        Math.floor((gridWidth + gap) / (itemMinWidth + gap))
      );
      return columns;
    } catch (error) {
      console.error("Error calculating columns:", error);
      return 3;
    }
  }

  /**
   * Updates the visual selection to the screen at the new index.
   * @param {number} newIndex - Index in the selectableScreens array.
   * @param {boolean} [smoothScroll=true] - Whether to use smooth scrolling.
   */
  function updateSelection(newIndex, smoothScroll = true) {
    if (
      selectedScreenIndex !== -1 &&
      selectedScreenIndex < selectableScreens.length
    ) {
      selectableScreens[selectedScreenIndex].classList.remove("selected");
    }
    selectedScreenIndex = Math.max(
      0,
      Math.min(newIndex, selectableScreens.length - 1)
    );
    const newSelectedScreen = selectableScreens[selectedScreenIndex];
    if (newSelectedScreen) {
      newSelectedScreen.classList.add("selected");
      newSelectedScreen.scrollIntoView({
        behavior: smoothScroll ? "smooth" : "auto",
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  /**
   * Opens the fullscreen overlay with the content from the provided screen element.
   * Supports text, images, YouTube videos, and local (HTML5) videos.
   * @param {HTMLElement} screenElement - The screen element to display.
   */
  function openOverlay(screenElement) {
    const contentType = screenElement.getAttribute("data-content-type");
    const contentSourceSelector = screenElement.getAttribute(
      "data-content-source"
    );
    // Check for local video source and YouTube video id
    const videoSource = screenElement.getAttribute("data-video-source");
    const videoId = screenElement.getAttribute("data-video-id");

    overlayInnerContent.innerHTML = "";
    overlayContentContainer.classList.remove(
      "text-overlay",
      "image-overlay",
      "video-overlay"
    );

    let contentToAdd = "";

    try {
      if (contentType === "text") {
        const textElement = screenElement.querySelector(contentSourceSelector);
        if (textElement) {
          if (textElement.classList.contains("scrollable-text")) {
            contentToAdd = `<div class="scrollable-text-overlay">${textElement.innerHTML}</div>`;
          } else {
            contentToAdd = `<div class="simple-text-overlay">${textElement.innerHTML}</div>`;
          }
          overlayContentContainer.classList.add("text-overlay");
        }
      } else if (contentType === "image") {
        const img = screenElement.querySelector("img");
        if (img) {
          contentToAdd = `<img src="${img.src}" alt="${img.alt}" class="overlay-image">`;
          overlayContentContainer.classList.add("image-overlay");
        }
      } else if (contentType === "video") {
        // Prioritize local video if a video source is provided.
        if (videoSource) {
          contentToAdd = `
              <video controls autoplay class="overlay-video" style="width:100%; height:100%;">
                <source src="${videoSource}" type="video/mp4">
                Your browser does not support the video tag.
              </video>
            `;
          overlayContentContainer.classList.add("video-overlay");
        } else if (videoId) {
          // Fallback to YouTube embedding if no local source is provided.
          contentToAdd = `
              <iframe
                id="overlay-active-video"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
                class="overlay-video">
              </iframe>
            `;
          overlayContentContainer.classList.add("video-overlay");
        }
      }

      if (contentToAdd) {
        overlayInnerContent.innerHTML = contentToAdd;
        overlay.classList.add("active");
        closeButton.focus();
      } else {
        console.warn("No content found for screen:", screenElement);
      }
    } catch (error) {
      console.error("Error opening overlay:", error, "Screen:", screenElement);
      overlayInnerContent.innerHTML =
        '<p style="color: red; text-align: center;">Error loading content.</p>';
      overlay.classList.add("active");
      closeButton.focus();
    }
  }

  /**
   * Closes the fullscreen overlay.
   */
  function closeOverlay() {
    overlay.classList.remove("active");

    // Stop YouTube video playback if necessary
    const activeVideo = overlayInnerContent.querySelector(
      "#overlay-active-video"
    );
    if (activeVideo && activeVideo.tagName === "IFRAME") {
      const originalSrc = activeVideo.src.split("?")[0];
      activeVideo.src = originalSrc;
    }

    setTimeout(() => {
      overlayContentContainer.classList.remove(
        "text-overlay",
        "image-overlay",
        "video-overlay"
      );
      overlayInnerContent.innerHTML = "";
    }, 300);
  }

  if (selectableScreens.length > 0) {
    updateSelection(0, false);
  }

  grid.addEventListener("click", (e) => {
    const clickedScreen = e.target.closest(".screen:not(.no-signal)");
    if (!clickedScreen) return;
    const indexInSelectable = selectableScreens.indexOf(clickedScreen);
    if (indexInSelectable !== -1) {
      updateSelection(indexInSelectable);
    }
  });

  grid.addEventListener("dblclick", (e) => {
    const clickedScreen = e.target.closest(".screen.selected");
    if (
      clickedScreen &&
      selectableScreens[selectedScreenIndex] === clickedScreen
    ) {
      openOverlay(clickedScreen);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.classList.contains("active")) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOverlay();
      }
      return;
    }

    if (selectableScreens.length === 0) return;

    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        " ",
      ].includes(e.key)
    ) {
      const activeTag = document.activeElement?.tagName.toUpperCase();
      if (
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA" &&
        activeTag !== "SELECT"
      ) {
        if (
          document.activeElement === document.body ||
          grid.contains(document.activeElement) ||
          selectableScreens.includes(document.activeElement)
        ) {
          e.preventDefault();
        }
      }
    }

    if (
      selectedScreenIndex === -1 &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
    ) {
      updateSelection(0);
      return;
    }

    let newIndex = selectedScreenIndex;
    const numSelectable = selectableScreens.length;

    switch (e.key) {
      case "ArrowRight":
        newIndex = selectedScreenIndex + 1;
        if (newIndex >= numSelectable) newIndex = 0;
        break;
      case "ArrowLeft":
        newIndex = selectedScreenIndex - 1;
        if (newIndex < 0) newIndex = numSelectable - 1;
        break;
      case "ArrowDown": {
        const numColumns = getApproximateColumns();
        newIndex = selectedScreenIndex + numColumns;
        if (newIndex >= numSelectable) {
          newIndex = numSelectable - 1;
        }
        break;
      }
      case "ArrowUp": {
        const numColumns = getApproximateColumns();
        newIndex = selectedScreenIndex - numColumns;
        if (newIndex < 0) {
          newIndex = 0;
        }
        break;
      }
      case "Enter":
      case " ":
        if (selectedScreenIndex !== -1) {
          openOverlay(selectableScreens[selectedScreenIndex]);
        }
        return;
      case "Escape":
        return;
      default:
        return;
    }

    if (
      newIndex >= 0 &&
      newIndex < numSelectable &&
      newIndex !== selectedScreenIndex
    ) {
      updateSelection(newIndex);
    }
  });

  closeButton.addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeOverlay();
    }
  });
});
