/* =========================================================
   DIGITAL STUDIO — CONFIG
   এই ফাইলেই শুধু আপনার Google Apps Script URL আর (ভবিষ্যতে) Firebase
   config বসাতে হবে। বাকি কোনো ফাইল ছোঁয়ার দরকার নেই।
   ========================================================= */

const CONFIG = {
  // ধাপ ১: apps-script-backend.gs ফাইলটা Google Apps Script এ পেস্ট করে
  // Deploy > New deployment > Web app করে যে URL পাবেন সেটা এখানে বসান।
  // উদাহরণ: "https://script.google.com/macros/s/AKfycb.../exec"
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxp8WgScg79MUBCFpa4Ctwwu_W0KTNkoRBEraHee0-bpwSyDcqUQsl1rk6tdDg48iIk/exec",

  // ধাপ ২ (ঐচ্ছিক, পরে করলেও চলবে): Firebase ব্যবহার করতে চাইলে
  // (যেমন রিয়েল-টাইম আপডেট বা ছবি স্টোরেজ) এখানে আপনার Firebase
  // প্রজেক্টের কনফিগ বসান। খালি রাখলে সাইট Google Sheet ব্যাকএন্ড
  // দিয়েই পুরোপুরি চলবে।
  FIREBASE_CONFIG: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // অ্যাডমিন লগইন (চাইলে বদলাতে পারেন)
  ADMIN_ID: "Digital Studio",
  ADMIN_PASSWORD: "Joy@732122",

  // মক টেস্ট আজ থেকেই সবার জন্য ফ্রি (কোনো পেমেন্ট/সাবস্ক্রিপশন নেই)
  MOCK_TEST_FREE: true
};
