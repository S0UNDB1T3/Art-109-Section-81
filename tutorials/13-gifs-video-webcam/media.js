// ART 109 Tutorial 13
// Controls hover video playback and the optional webcam stream.

const hoverVideos = document.querySelectorAll(".hover-video");

hoverVideos.forEach((video) => {
  const videoCard = video.closest(".video-card");
  const toggleButton = videoCard.querySelector("[data-video-toggle]");

  async function playVideo() {
    try {
      await video.play();
    } catch (error) {
      toggleButton.textContent = "Playback Blocked";
    }
  }

  function pauseVideo() {
    video.pause();
  }

  video.addEventListener("mouseenter", playVideo);
  video.addEventListener("mouseleave", pauseVideo);
  video.addEventListener("focus", playVideo);
  video.addEventListener("blur", pauseVideo);

  video.addEventListener("play", () => {
    toggleButton.textContent = "Pause Video";
  });

  video.addEventListener("pause", () => {
    toggleButton.textContent = "Play Video";
  });

  toggleButton.addEventListener("click", () => {
    if (video.paused) {
      playVideo();
    } else {
      pauseVideo();
    }
  });
});

const webcamVideo = document.querySelector("#webcam");
const startWebcamButton = document.querySelector("#start-webcam");
const stopWebcamButton = document.querySelector("#stop-webcam");
const webcamStatus = document.querySelector("#webcam-status");
const webcamPlaceholder = document.querySelector("[data-webcam-placeholder]");

let webcamStream = null;

async function startWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    webcamStatus.textContent =
      "This browser does not support webcam access, or the page is not using HTTPS.";
    return;
  }

  startWebcamButton.disabled = true;
  webcamStatus.textContent = "Waiting for camera permission...";

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    webcamVideo.srcObject = webcamStream;
    await webcamVideo.play();

    webcamPlaceholder.classList.add("is-hidden");
    stopWebcamButton.disabled = false;
    webcamStatus.textContent =
      "Camera is active. Press Stop Camera when you are finished.";
  } catch (error) {
    startWebcamButton.disabled = false;
    stopWebcamButton.disabled = true;

    if (error.name === "NotAllowedError") {
      webcamStatus.textContent =
        "Camera permission was not granted. You can try again when you are ready.";
    } else if (error.name === "NotFoundError") {
      webcamStatus.textContent = "No camera was found on this device.";
    } else {
      webcamStatus.textContent =
        "The camera could not start. Check the browser permission settings and try again.";
    }
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
  }

  webcamStream = null;
  webcamVideo.srcObject = null;
  webcamPlaceholder.classList.remove("is-hidden");
  startWebcamButton.disabled = false;
  stopWebcamButton.disabled = true;
  webcamStatus.textContent =
    "Camera is off. Press Start Camera when you are ready.";
}

startWebcamButton.addEventListener("click", startWebcam);
stopWebcamButton.addEventListener("click", stopWebcam);

window.addEventListener("beforeunload", () => {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
  }
});
