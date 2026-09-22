/* =========================================================
   DIGITAL STUDIO — GOOGLE APPS SCRIPT BACKEND
   এই পুরো ফাইলটা script.google.com এ একটা নতুন প্রজেক্টে পেস্ট করুন,
   তারপর Deploy > New deployment > Web app হিসেবে ডিপ্লয় করুন।
   Execute as: Me | Who has access: Anyone
   যে URL পাবেন সেটা config.js এর APPS_SCRIPT_URL এ বসান।

   সেটআপ নির্দেশিকা SETUP-README.md ফাইলে বিস্তারিত আছে।
   ========================================================= */

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;
    let result;

    switch (action) {
      case "checkAvailability": result = checkAvailability(req); break;
      case "register": result = registerUser(req); break;
      case "login": result = loginUser(req); break;
      case "listUsers": result = listUsers(); break;
      case "setUserStatus": result = setUserStatus(req); break;
      case "deleteUser": result = deleteUser(req); break;
      case "addCurrentAffairs": result = addCurrentAffairs(req); break;
      case "listCurrentAffairs": result = listCurrentAffairs(); break;
      case "addQuiz": result = addQuiz(req); break;
      case "addQuestion": result = addQuestion(req); break;
      case "listQuizzes": result = listQuizzes(req); break;
      case "getQuiz": result = getQuiz(req); break;
      case "submitResult": result = submitResult(req); break;
      case "listResults": result = listResults(req); break;
      default: result = { error: "Unknown action: " + action };
    }
    return jsonOut(result);
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSS() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name, headers) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function sheetToObjects(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(o => o[headers[0]] !== ""); // ফাঁকা রো বাদ
}

function findRowIndex(sh, colName, value) {
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const col = headers.indexOf(colName);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col]) === String(value)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

/* ---------------- USERS ---------------- */
const USER_HEADERS = ["timestamp", "name", "fatherName", "phone", "email", "passwordHash", "village", "postOffice", "pinCode", "district", "addressLine", "status"];

function checkAvailability(req) {
  const sh = getSheet("Users", USER_HEADERS);
  const users = sheetToObjects(sh);
  return {
    phoneTaken: users.some(u => String(u.phone) === String(req.phone)),
    emailTaken: users.some(u => String(u.email).toLowerCase() === String(req.email).toLowerCase())
  };
}

function registerUser(req) {
  const sh = getSheet("Users", USER_HEADERS);
  sh.appendRow([
    new Date(), req.name, req.fatherName, req.phone, req.email, req.password,
    req.village, req.postOffice, req.pinCode, req.district, req.addressLine, "active"
  ]);
  return { success: true };
}

function loginUser(req) {
  const sh = getSheet("Users", USER_HEADERS);
  const users = sheetToObjects(sh);
  const user = users.find(u =>
    (String(u.phone) === String(req.identifier) || String(u.email).toLowerCase() === String(req.identifier).toLowerCase())
    && String(u.passwordHash) === String(req.password)
  );
  if (!user) return { success: false };
  if (user.status === "blocked") return { success: false, blocked: true };
  delete user.passwordHash;
  return { success: true, user: user };
}

function listUsers() {
  const sh = getSheet("Users", USER_HEADERS);
  const users = sheetToObjects(sh).map(u => { delete u.passwordHash; return u; });
  return { users: users };
}

function setUserStatus(req) {
  const sh = getSheet("Users", USER_HEADERS);
  const row = findRowIndex(sh, "phone", req.phone);
  if (row === -1) return { error: "User not found" };
  const col = sh.getDataRange().getValues()[0].indexOf("status") + 1;
  sh.getRange(row, col).setValue(req.status);
  return { success: true };
}

function deleteUser(req) {
  const sh = getSheet("Users", USER_HEADERS);
  const row = findRowIndex(sh, "phone", req.phone);
  if (row === -1) return { error: "User not found" };
  sh.deleteRow(row);
  return { success: true };
}

/* ---------------- DAILY CURRENT AFFAIRS ---------------- */
const CA_HEADERS = ["id", "fileName", "text", "createdAt"];

function addCurrentAffairs(req) {
  const sh = getSheet("CurrentAffairs", CA_HEADERS);
  const id = "ca_" + new Date().getTime();
  sh.appendRow([id, req.fileName, req.text, new Date()]);
  return { success: true, id: id };
}

function listCurrentAffairs() {
  const sh = getSheet("CurrentAffairs", CA_HEADERS);
  const files = sheetToObjects(sh).reverse(); // নতুনগুলো আগে
  return { files: files };
}

/* ---------------- MOCK TESTS ---------------- */
const QUIZ_HEADERS = ["id", "name", "durationMinutes", "published", "questionsJson", "createdAt"];

function addQuiz(req) {
  const sh = getSheet("Quizzes", QUIZ_HEADERS);
  const id = "quiz_" + new Date().getTime();
  sh.appendRow([id, req.name, req.durationMinutes, true, JSON.stringify([]), new Date()]);
  return { success: true, id: id };
}

function addQuestion(req) {
  const sh = getSheet("Quizzes", QUIZ_HEADERS);
  const row = findRowIndex(sh, "id", req.quizId);
  if (row === -1) return { error: "Quiz not found" };
  const headers = sh.getDataRange().getValues()[0];
  const qCol = headers.indexOf("questionsJson") + 1;
  const current = JSON.parse(sh.getRange(row, qCol).getValue() || "[]");
  current.push(req.question);
  sh.getRange(row, qCol).setValue(JSON.stringify(current));
  return { success: true };
}

function listQuizzes(req) {
  const sh = getSheet("Quizzes", QUIZ_HEADERS);
  let quizzes = sheetToObjects(sh).map(q => {
    const questions = JSON.parse(q.questionsJson || "[]");
    return { id: q.id, name: q.name, durationMinutes: q.durationMinutes, published: q.published, questionCount: questions.length, questions: questions };
  });
  if (req && req.publishedOnly) quizzes = quizzes.filter(q => q.published);
  return { quizzes: quizzes };
}

function getQuiz(req) {
  const sh = getSheet("Quizzes", QUIZ_HEADERS);
  const row = findRowIndex(sh, "id", req.quizId);
  if (row === -1) return { error: "Quiz not found" };
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const rowData = values[row - 1];
  const obj = {};
  headers.forEach((h, i) => obj[h] = rowData[i]);
  return { quiz: { id: obj.id, name: obj.name, durationMinutes: obj.durationMinutes, questions: JSON.parse(obj.questionsJson || "[]") } };
}

/* ---------------- RESULTS ---------------- */
const RESULT_HEADERS = ["id", "quizId", "quizName", "studentName", "studentPhone", "score", "correctCount", "wrongCount", "unansweredCount", "timeTakenSeconds", "answersJson", "submittedAt"];

function submitResult(req) {
  const sh = getSheet("Results", RESULT_HEADERS);
  const id = "res_" + new Date().getTime();
  sh.appendRow([
    id, req.quizId, req.quizName, req.studentName, req.studentPhone,
    req.score, req.correctCount, req.wrongCount, req.unansweredCount,
    req.timeTakenSeconds, JSON.stringify(req.answers), new Date()
  ]);
  return { success: true };
}

function listResults(req) {
  const sh = getSheet("Results", RESULT_HEADERS);
  let results = sheetToObjects(sh).map(r => ({ ...r, answers: JSON.parse(r.answersJson || "[]") }));
  if (req && req.quizId) results = results.filter(r => r.quizId === req.quizId);
  return { results: results };
}
