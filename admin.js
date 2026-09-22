/* =========================================================
   DIGITAL STUDIO — ADMIN: USER PROFILES
   ========================================================= */

let PENDING_CONFIRM_ACTION = null;

async function loadUserProfiles() {
  const listEl = document.getElementById("userProfilesList");
  listEl.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    let users;
    if (backendReady()) {
      const res = await api("listUsers", {});
      users = res.users || [];
    } else {
      users = JSON.parse(localStorage.getItem("ds_local_users") || "[]");
    }
    window._allUsers = users;
    if (!users.length) {
      listEl.innerHTML = `<p class="muted">${t("noData")}</p>`;
      return;
    }
    listEl.innerHTML = users.map((u, i) => `
      <div class="user-profile-row">
        <div class="user-profile-name">${i + 1}. ${escapeHtml(u.name)} ${u.status === "blocked" ? "🚫" : ""}</div>
        <div class="user-profile-meta">${escapeHtml(u.phone)} · ${escapeHtml(u.email)}</div>
        <div class="user-profile-actions">
          <button class="btn btn-small" onclick="accessUserProfile(${i})">${t("accessBtn")}</button>
          <button class="btn btn-small btn-warn" onclick="confirmUserAction(${i}, 'block')">${u.status === "blocked" ? t("unblockBtn") : t("blockBtn")}</button>
          <button class="btn btn-small btn-danger" onclick="confirmUserAction(${i}, 'delete')">${t("deleteBtn")}</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function accessUserProfile(i) {
  const u = window._allUsers[i];
  alert(
    `${t("name")}: ${u.name}\n${t("fatherName")}: ${u.fatherName}\n${t("phone")}: ${u.phone}\n${t("email")}: ${u.email}\n` +
    `${t("village")}: ${u.village}, ${t("postOffice")}: ${u.postOffice}, ${t("pinCode")}: ${u.pinCode}\n${t("district")}: ${u.district}\n${t("addressLine")}: ${u.addressLine}`
  );
}

function confirmUserAction(i, action) {
  PENDING_CONFIRM_ACTION = { i, action };
  document.getElementById("confirmModalMsg").textContent = t("confirmMsg");
  showModal("confirmModal");
}

async function executeConfirmedAction() {
  hideModal("confirmModal");
  if (!PENDING_CONFIRM_ACTION) return;
  const { i, action } = PENDING_CONFIRM_ACTION;
  const u = window._allUsers[i];
  try {
    if (action === "block") {
      const newStatus = u.status === "blocked" ? "active" : "blocked";
      if (backendReady()) {
        await api("setUserStatus", { phone: u.phone, status: newStatus });
      } else {
        const users = JSON.parse(localStorage.getItem("ds_local_users") || "[]");
        const target = users.find(x => x.phone === u.phone);
        if (target) target.status = newStatus;
        localStorage.setItem("ds_local_users", JSON.stringify(users));
      }
    } else if (action === "delete") {
      if (backendReady()) {
        await api("deleteUser", { phone: u.phone });
      } else {
        let users = JSON.parse(localStorage.getItem("ds_local_users") || "[]");
        users = users.filter(x => x.phone !== u.phone);
        localStorage.setItem("ds_local_users", JSON.stringify(users));
      }
    }
    loadUserProfiles();
  } catch (err) {
    alert(err.message);
  }
  PENDING_CONFIRM_ACTION = null;
}

/* ---------------- THREE-DOT MENU ---------------- */

function toggleMenu() {
  document.getElementById("dotMenu").classList.toggle("open");
}

function closeMenu() {
  document.getElementById("dotMenu").classList.remove("open");
}

function openMenuItem(item) {
  closeMenu();
  switch (item) {
    case "currentAffairs":
      showRoute("currentAffairs");
      document.getElementById("adminAddCaBtnWrap").style.display = IS_ADMIN ? "block" : "none";
      loadCurrentAffairsList();
      break;
    case "mockTests":
      if (IS_ADMIN) {
        showRoute("adminMockTests");
        loadAdminQuizList();
      } else if (CONFIG.MOCK_TEST_FREE) {
        showRoute("mockTests");
        loadStudentQuizList();
      } else {
        document.getElementById("comingSoonText").textContent = t("availableFrom");
        showModal("comingSoonModal");
      }
      break;
    case "userProfiles":
      showRoute("userProfiles");
      loadUserProfiles();
      break;
    default:
      document.getElementById("comingSoonText").textContent = t("comingSoon");
      showModal("comingSoonModal");
  }
}

function openAdminMockTests() {
  showRoute("adminMockTests");
  loadAdminQuizList();
}
