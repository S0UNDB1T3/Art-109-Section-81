// Select both portfolio images and the status text by their IDs.
const img1 = document.querySelector("#img1");
const img2 = document.querySelector("#img2");
const imageToggle = document.querySelector("#image-toggle");
const domStatus = document.querySelector("#dom-status");

// Swap which image is visible by adding and removing the hidden class.
const showSecondImage = () => {
  img1.classList.add("hidden");
  img2.classList.remove("hidden");
  domStatus.textContent = "Showing: Felicia - Darkstalkers. Click the image to see Shadow!";
  imageToggle.setAttribute("aria-label", "Show the Shadow artwork");
};

const showFirstImage = () => {
  img2.classList.add("hidden");
  img1.classList.remove("hidden");
  domStatus.textContent = "Showing: I Am All of Me. Click the image to see Felicia!";
  imageToggle.setAttribute("aria-label", "Show the Felicia artwork");
};

// The click event changes HTML and CSS by toggling the hidden class.
// A native button also makes this work with Enter and Space automatically.
imageToggle.addEventListener("click", () => {
  if (img1.classList.contains("hidden")) {
    showFirstImage();
  } else {
    showSecondImage();
  }
});
