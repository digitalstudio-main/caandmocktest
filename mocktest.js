/* =========================================================
   DIGITAL STUDIO — MOCK TESTS
   Admin: কুইজ তৈরি (নাম + সময়) -> প্রশ্ন যোগ (৪টা অপশন, সঠিক উত্তর,
          মার্কস, নেগেটিভ মার্কস, ব্যাখ্যা) -> রেজাল্ট দেখা
   Student: টেস্ট শুরু -> টাইমার -> সাবমিট (বা সময় শেষে অটো-সাবমিট)
            -> স্কোর দেখা
   ========================================================= */

let ACTIVE_QUIZ = null;      // এখন যেটা চলছে (student attempt)
let ACTIVE_ANSWERS = {};     // { questionIndex: optionIndex }
let ACTIVE_TIMER = null;
let ACTIVE_START_TIME = null;
let ADMIN_BUILDING_QUIZ_ID = null; // অ্যাডমিন এখন কোন কুইজে প্রশ্ন যোগ করছে

/* ---------------- STUDENT SIDE ---------------- */

async function loadStudentQuizList() {
  const listEl = document.getElementById("mtList");
  listEl.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    let quizzes;
    if (backendReady()) {
      const res = await api("listQuizzes", { publishedOnly: true });
      quizzes = res.quizzes || [];
    } else {
      quizzes = (JSON.parse(localStorage.getItem("ds_local_quizzes") || "[]"));
    }
    if (!quizzes.length) {
      listEl.innerHTML = `<p class="muted">${t("noData")}</p>`;
      return;
    }
    listEl.innerHTML = quizzes.map(q => `
      <div class="mt-card">
        <div class="mt-card-name">${escapeHtml(q.name)}</div>
        <div class="mt-card-duration">${t("duration")}: ${q.durationMinutes} ${currentLang === "bn" ? "মিনিট" : currentLang === "hi" ? "मिनट" : "min"}</div>
        <div class="mt-card-count">${(q.questions || []).length || q.questionCount || 0} ${currentLang === "bn" ? "টি প্রশ্ন" : currentLang === "hi" ? "प्रश्न" : "questions"}</div>
        <button class="btn btn-primary" onclick="startQuiz('${q.id}')">${t("startTest")}</button>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

async function startQuiz(quizId) {
  try {
    let quiz;
    if (backendReady()) {
      const res = await api("getQuiz", { quizId });
      quiz = res.quiz;
    } else {
      const quizzes = JSON.parse(localStorage.getItem("ds_local_quizzes") || "[]");
      quiz = quizzes.find(q => q.id === quizId);
    }
    if (!quiz) return alert(t("noData"));
    ACTIVE_QUIZ = quiz;
    ACTIVE_ANSWERS = {};
    ACTIVE_START_TIME = Date.now();
    renderQuizAttempt();
    showRoute("quizAttempt");
    startQuizTimer(quiz.durationMinutes * 60);
  } catch (err) {
    alert(err.message);
  }
}

function renderQuizAttempt() {
  const q = ACTIVE_QUIZ;
  document.getElementById("quizAttemptTitle").textContent = q.name;
  const body = document.getElementById("quizAttemptBody");
  body.innerHTML = q.questions.map((ques, qi) => `
    <div class="quiz-question-card">
      <div class="quiz-question-text">${qi + 1}. ${escapeHtml(ques.text)}</div>
      ${ques.image ? `<img class="quiz-question-img" src="${ques.image}" alt="">` : ""}
      <div class="quiz-options">
        ${ques.options.map((opt, oi) => `
          <label class="quiz-option">
            <input type="radio" name="q${qi}" value="${oi}" onchange="ACTIVE_ANSWERS[${qi}]=${oi}">
            <span>${escapeHtml(opt.text)}</span>
            ${opt.image ? `<img class="quiz-option-img" src="${opt.image}" alt="">` : ""}
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function startQuizTimer(totalSeconds) {
  let remaining = totalSeconds;
  updateTimerDisplay(remaining);
  clearInterval(ACTIVE_TIMER);
  ACTIVE_TIMER = setInterval(() => {
    remaining--;
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(ACTIVE_TIMER);
      submitQuiz(true);
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  const el = document.getElementById("quizTimer");
  if (el) el.textContent = `${t("timeLeft")}: ${m}:${s}`;
}

async function submitQuiz(auto) {
  clearInterval(ACTIVE_TIMER);
  const q = ACTIVE_QUIZ;
  const timeTakenSeconds = Math.round((Date.now() - ACTIVE_START_TIME) / 1000);
  let score = 0, correctCount = 0, wrongCount = 0, unansweredCount = 0;
  const answersDetail = q.questions.map((ques, qi) => {
    const given = ACTIVE_ANSWERS[qi];
    let status;
    if (given === undefined) {
      status = "unanswered"; unansweredCount++;
    } else if (given === ques.correctIndex) {
      status = "correct"; correctCount++; score += Number(ques.correctMarks || 0);
    } else {
      status = "wrong"; wrongCount++; score -= Number(ques.negativeMarks || 0);
    }
    return { question: ques.text, given: given !== undefined ? ques.options[given].text : null, correct: ques.options[ques.correctIndex].text, status, explanation: ques.explanation || "" };
  });

  const result = {
    quizId: q.id,
    quizName: q.name,
    studentName: CURRENT_USER ? CURRENT_USER.name : "Guest",
    studentPhone: CURRENT_USER ? CURRENT_USER.phone : "",
    score, correctCount, wrongCount, unansweredCount,
    timeTakenSeconds,
    answers: answersDetail,
    submittedAt: new Date().toISOString()
  };

  try {
    if (backendReady()) {
      await api("submitResult", result);
    } else {
      const results = JSON.parse(localStorage.getItem("ds_local_results") || "[]");
      results.push(result);
      localStorage.setItem("ds_local_results", JSON.stringify(results));
    }
  } catch (err) {
    console.error(err);
  }

  renderQuizResultScreen(result);
  showRoute("quizResult");
}

function renderQuizResultScreen(result) {
  document.getElementById("quizResultScore").textContent = result.score;
  document.getElementById("quizResultCorrect").textContent = result.correctCount;
  document.getElementById("quizResultWrong").textContent = result.wrongCount;
  document.getElementById("quizResultUnanswered").textContent = result.unansweredCount;
  document.getElementById("quizResultAnswers").innerHTML = result.answers.map((a, i) => `
    <div class="answer-review ${a.status}">
      <div class="answer-q">${i + 1}. ${escapeHtml(a.question)}</div>
      <div class="answer-line">${t("student")}: ${a.given ? escapeHtml(a.given) : "—"}</div>
      ${a.status !== "correct" ? `<div class="answer-line">${t("correct")}: ${escapeHtml(a.correct)}</div>` : ""}
      ${a.explanation ? `<div class="answer-explanation">${escapeHtml(a.explanation)}</div>` : ""}
    </div>
  `).join("");
}

/* ---------------- ADMIN SIDE ---------------- */

async function loadAdminQuizList() {
  const listEl = document.getElementById("adminMtList");
  listEl.innerHTML = `<p class="muted">${t("loading")}</p>`;
  try {
    let quizzes;
    if (backendReady()) {
      const res = await api("listQuizzes", { publishedOnly: false });
      quizzes = res.quizzes || [];
    } else {
      quizzes = JSON.parse(localStorage.getItem("ds_local_quizzes") || "[]");
    }
    window._adminQuizzes = quizzes;
    if (!quizzes.length) {
      listEl.innerHTML = `<p class="muted">${t("noData")}</p>`;
      return;
    }
    listEl.innerHTML = quizzes.map(q => `
      <div class="mt-card">
        <div class="mt-card-name">${escapeHtml(q.name)}</div>
        <div class="mt-card-duration">${t("duration")}: ${q.durationMinutes}</div>
        <div class="mt-card-count">${(q.questions || []).length} ${currentLang === "bn" ? "টি প্রশ্ন" : "questions"}</div>
        <div class="mt-card-actions">
          <button class="btn btn-small" onclick="openAddQuestion('${q.id}')">${t("addQuestion")}</button>
          <button class="btn btn-small" onclick="viewQuizResults('${q.id}')">${t("viewResults")}</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

async function handleAddQuiz(e) {
  e.preventDefault();
  const f = e.target;
  const name = f.quizName.value.trim();
  const durationMinutes = Number(f.duration.value);
  if (!name || !durationMinutes) return alert(t("errRequired"));

  const submitBtn = f.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    if (backendReady()) {
      await api("addQuiz", { name, durationMinutes });
    } else {
      const quizzes = JSON.parse(localStorage.getItem("ds_local_quizzes") || "[]");
      quizzes.push({ id: "q_" + Date.now(), name, durationMinutes, questions: [] });
      localStorage.setItem("ds_local_quizzes", JSON.stringify(quizzes));
    }
    f.reset();
    hideModal("addQuizModal");
    loadAdminQuizList();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

function openAddQuestion(quizId) {
  ADMIN_BUILDING_QUIZ_ID = quizId;
  document.getElementById("addQuestionForm").reset();
  showModal("addQuestionModal");
}

async function handleAddQuestion(e) {
  e.preventDefault();
  const f = e.target;
  const text = f.questionText.value.trim();
  const image = f.questionImage.value.trim();
  const options = [0, 1, 2, 3].map(i => ({
    text: f[`optionText${i}`].value.trim(),
    image: f[`optionImage${i}`].value.trim()
  }));
  const correctIndexRadio = f.querySelector('input[name="correctOption"]:checked');
  if (!text || options.some(o => !o.text) || !correctIndexRadio) return alert(t("errRequired"));
  const correctIndex = Number(correctIndexRadio.value);
  const correctMarks = Number(f.correctMarks.value || 1);
  const negativeMarks = Number(f.negativeMarks.value || 0);
  const explanation = f.explanation.value.trim();
  const explanationImage = f.explanationImage.value.trim();

  const question = { id: "ques_" + Date.now(), text, image, options, correctIndex, correctMarks, negativeMarks, explanation, explanationImage };

  const submitBtn = f.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    if (backendReady()) {
      await api("addQuestion", { quizId: ADMIN_BUILDING_QUIZ_ID, question });
    } else {
      const quizzes = JSON.parse(localStorage.getItem("ds_local_quizzes") || "[]");
      const quiz = quizzes.find(q => q.id === ADMIN_BUILDING_QUIZ_ID);
      quiz.questions = quiz.questions || [];
      quiz.questions.push(question);
      localStorage.setItem("ds_local_quizzes", JSON.stringify(quizzes));
    }
    f.reset();
    alert(t("save") + " ✓");
    loadAdminQuizList();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

async function viewQuizResults(quizId) {
  const modalBody = document.getElementById("quizResultsListBody");
  modalBody.innerHTML = `<p class="muted">${t("loading")}</p>`;
  showModal("quizResultsListModal");
  try {
    let results;
    if (backendReady()) {
      const res = await api("listResults", { quizId });
      results = res.results || [];
    } else {
      results = JSON.parse(localStorage.getItem("ds_local_results") || "[]").filter(r => r.quizId === quizId);
    }
    if (!results.length) {
      modalBody.innerHTML = `<p class="muted">${t("noData")}</p>`;
      return;
    }
    modalBody.innerHTML = results.map((r, i) => `
      <div class="result-row">
        <div><b>${escapeHtml(r.studentName)}</b> (${escapeHtml(r.studentPhone || "")})</div>
        <div>${t("score")}: ${r.score} | ${t("correct")}: ${r.correctCount} | ${t("wrong")}: ${r.wrongCount} | ${t("unanswered")}: ${r.unansweredCount}</div>
        <div>${t("timeTaken")}: ${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s</div>
        <button class="btn btn-small" onclick='showResultAnswers(${i}, ${JSON.stringify(quizId)})'>${t("viewAnswers")}</button>
      </div>
    `).join("");
    window._currentResultsList = results;
  } catch (err) {
    modalBody.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function showResultAnswers(index) {
  const r = window._currentResultsList[index];
  renderQuizResultScreen(r);
  hideModal("quizResultsListModal");
  showRoute("quizResult");
  document.getElementById("quizResultBackBtn").onclick = () => { showRoute("home"); openAdminMockTests(); };
}
