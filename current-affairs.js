/* =========================================================
   DIGITAL STUDIO — DAILY CURRENT AFFAIRS
   ========================================================= */

async function loadCurrentAffairsList() {
  const listEl = document.getElementById("caList");
  listEl.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    let files;
    if (backendReady()) {
      const res = await api("listCurrentAffairs", {});
      files = res.files || [];
    } else {
      files = JSON.parse(localStorage.getItem("ds_local_ca") || "[]");
    }
    if (!files.length) {
      listEl.innerHTML = `<p class="muted">${t("noData")}</p>`;
      return;
    }
    listEl.innerHTML = files.map((f, i) => `
      <div class="ca-file-card" onclick="openCurrentAffairsFile(${i})">
        <span class="ca-icon">📰</span>
        <span class="ca-file-name">${escapeHtml(f.fileName)}</span>
      </div>
    `).join("");
    window._caFiles = files;
  } catch (err) {
    listEl.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function openCurrentAffairsFile(index) {
  const f = window._caFiles[index];
  document.getElementById("caFileTitle").textContent = f.fileName;
  document.getElementById("caFileBody").innerHTML = escapeHtml(f.text).replace(/\n/g, "<br>");
  showModal("caFileModal");
}

async function handleAddCurrentAffairs(e) {
  e.preventDefault();
  const f = e.target;
  const fileName = f.fileName.value.trim();
  const text = f.text.value.trim();
  if (!fileName || !text) return alert(t("errRequired"));

  const submitBtn = f.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    if (backendReady()) {
      await api("addCurrentAffairs", { fileName, text });
    } else {
      const files = JSON.parse(localStorage.getItem("ds_local_ca") || "[]");
      files.unshift({ fileName, text, createdAt: new Date().toISOString() });
      localStorage.setItem("ds_local_ca", JSON.stringify(files));
    }
    f.reset();
    hideModal("addCaModal");
    loadCurrentAffairsList();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
