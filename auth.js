/* =========================================================
   DIGITAL STUDIO — AUTH
   রেজিস্ট্রেশন, লগইন, ভ্যালিডেশন এবং ব্যাকএন্ড এপিআই কল
   ========================================================= */

let CURRENT_USER = JSON.parse(localStorage.getItem("ds_user") || "null");
let IS_ADMIN = localStorage.getItem("ds_is_admin") === "true";

function backendReady() {
  return CONFIG.APPS_SCRIPT_URL && !CONFIG.APPS_SCRIPT_URL.startsWith("PASTE_YOUR");
}

// SHA-256 হ্যাশ (ব্রাউজারের নিজস্ব crypto ব্যবহার করে)
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Google Apps Script এ POST করার সাধারণ ফাংশন
async function api(action, payload) {
  if (!backendReady()) {
    throw new Error(t("errBackendNotSet"));
  }
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script doPost এর জন্য text/plain সবচেয়ে নিরাপদ (avoids CORS preflight)
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) { el.textContent = msg; el.style.display = msg ? "block" : "none"; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- REGISTER ----------
async function handleRegister(e) {
  e.preventDefault();
  showError("registerError", "");
  const f = e.target;
  const data = {
    name: f.name.value.trim(),
    fatherName: f.fatherName.value.trim(),
    phone: f.phone.value.trim(),
    email: f.email.value.trim().toLowerCase(),
    password: f.password.value,
    rePassword: f.rePassword.value,
    village: f.village.value.trim(),
    postOffice: f.postOffice.value.trim(),
    pinCode: f.pinCode.value.trim(),
    district: f.district.value.trim(),
    addressLine: f.addressLine.value.trim()
  };

  for (const k of ["name", "fatherName", "phone", "email", "password", "rePassword", "village", "postOffice", "pinCode", "district", "addressLine"]) {
    if (!data[k]) return showError("registerError", t("errRequired"));
  }
  if (!/^\d{11}$/.test(data.phone)) return showError("registerError", t("errPhoneDigits"));
  if (!isValidEmail(data.email)) return showError("registerError", t("errEmailFormat"));
  if (data.password !== data.rePassword) return showError("registerError", t("errPasswordMatch"));

  const submitBtn = f.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    if (backendReady()) {
      const check = await api("checkAvailability", { phone: data.phone, email: data.email });
      if (check.phoneTaken) { showError("registerError", t("errPhoneTaken")); submitBtn.disabled = false; return; }
      if (check.emailTaken) { showError("registerError", t("errEmailTaken")); submitBtn.disabled = false; return; }

      const passwordHash = await sha256(data.password);
      await api("register", { ...data, password: passwordHash, rePassword: undefined });
    } else {
      // ব্যাকএন্ড এখনও কনফিগার হয়নি — শুধু ইউআই টেস্ট করার জন্য localStorage এ রাখা হচ্ছে
      const users = JSON.parse(localStorage.getItem("ds_local_users") || "[]");
      if (users.some(u => u.phone === data.phone)) { showError("registerError", t("errPhoneTaken")); submitBtn.disabled = false; return; }
      if (users.some(u => u.email === data.email)) { showError("registerError", t("errEmailTaken")); submitBtn.disabled = false; return; }
      users.push(data);
      localStorage.setItem("ds_local_users", JSON.stringify(users));
    }
    alert(t("registerSuccess"));
    showRoute("login");
  } catch (err) {
    showError("registerError", err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- LOGIN ----------
async function handleLogin(e) {
  e.preventDefault();
  showError("loginError", "");
  const f = e.target;
  const identifier = f.identifier.value.trim().toLowerCase();
  const password = f.password.value;
  if (!identifier || !password) return showError("loginError", t("errRequired"));

  const submitBtn = f.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    let user;
    if (backendReady()) {
      const passwordHash = await sha256(password);
      const result = await api("login", { identifier, password: passwordHash });
      if (result.blocked) { showError("loginError", t("errAccountBlocked")); submitBtn.disabled = false; return; }
      if (!result.success) { showError("loginError", t("errLoginFailed")); submitBtn.disabled = false; return; }
      user = result.user;
    } else {
      const users = JSON.parse(localStorage.getItem("ds_local_users") || "[]");
      user = users.find(u => (u.phone === identifier || u.email === identifier) && u.password === password);
      if (!user) { showError("loginError", t("errLoginFailed")); submitBtn.disabled = false; return; }
    }
    CURRENT_USER = user;
    localStorage.setItem("ds_user", JSON.stringify(user));
    showRoute("home");
  } catch (err) {
    showError("loginError", err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- ADMIN LOGIN ----------
function handleAdminLogin(e) {
  e.preventDefault();
  showError("adminLoginError", "");
  const f = e.target;
  if (f.adminId.value.trim() === CONFIG.ADMIN_ID && f.adminPassword.value === CONFIG.ADMIN_PASSWORD) {
    IS_ADMIN = true;
    localStorage.setItem("ds_is_admin", "true");
    showRoute("home");
  } else {
    showError("adminLoginError", t("errLoginFailed"));
  }
}

function logout() {
  CURRENT_USER = null;
  IS_ADMIN = false;
  localStorage.removeItem("ds_user");
  localStorage.removeItem("ds_is_admin");
  showRoute("login");
}
