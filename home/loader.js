<script>

function initLoader() {
  const loader = document.getElementById("loader");

  if (!loader) {
    document.body.classList.remove("loading");
    return;
  }

  function scrollToRequestedSection() {
    const sectionId = window.location.hash;

    if (!sectionId) return;

    setTimeout(function () {
      const section = document.querySelector(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 150);
  }

  /* اللودر اشتغل سابقًا خلال نفس الجلسة */
  if (sessionStorage.getItem("rexLoader")) {
    loader.classList.add("hide");
    loader.style.display = "none";
    document.body.classList.remove("loading");

    scrollToRequestedSection();
    return;
  }

  sessionStorage.setItem("rexLoader", "1");
  document.body.classList.add("loading");

  setTimeout(function () {
    loader.classList.add("hide");

    setTimeout(function () {
      loader.style.display = "none";
      document.body.classList.remove("loading");

      scrollToRequestedSection();
    }, 1000);
  }, 1800);
}