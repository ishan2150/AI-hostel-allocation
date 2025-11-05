// script.js
// Local storage keys
const STORAGE_KEY = "ai_roommate_students_v1";
const ALLOC_KEY = "ai_roommate_allocations_v1";

function showView(id) {
  document.querySelectorAll(".view").forEach(el => el.style.display = "none");
  const v = document.getElementById(id);
  if (v) v.style.display = "";
  window.scrollTo(0,0);
}

// Utilities
function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) { return []; }
}
function saveStudents(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
}
function loadAllocations() {
  try {
    return JSON.parse(localStorage.getItem(ALLOC_KEY) || "{}");
  } catch (e) { return {}; }
}
function saveAllocations(obj) {
  localStorage.setItem(ALLOC_KEY, JSON.stringify(obj || {}));
}

// Header nav buttons to toggle views
document.getElementById("navStudent").addEventListener("click", () => showView("view-student"));
document.getElementById("navAdmin").addEventListener("click", () => showView("view-admin-login"));

// Student submission
document.getElementById("studentSubmitBtn").addEventListener("click", () => {
  const name = document.getElementById("s_name").value.trim();
  if (!name) { alert("Please enter name."); return; }
  const s = {
    id: Date.now().toString(),
    name,
    gender: document.getElementById("s_gender").value,
    sleep: document.getElementById("s_sleep").value,
    cleanliness: document.getElementById("s_clean").value,
    study: document.getElementById("s_study").value,
    habits: document.getElementById("s_habits").value,
    submittedAt: new Date().toISOString()
  };
  const arr = loadStudents();
  arr.push(s);
  saveStudents(arr);

  // Clear form then go to admin login
  document.getElementById("s_name").value = "";
  alert("Profile submitted. Now go to Admin Login to view submissions.");
  showView("view-admin-login");
});

// Reset student form
document.getElementById("studentResetBtn").addEventListener("click", () => {
  if (confirm("Clear form?")) {
    document.getElementById("s_name").value = "";
  }
});

// Admin login
document.getElementById("adminLoginBtn").addEventListener("click", () => {
  const u = document.getElementById("adminUser").value.trim();
  const p = document.getElementById("adminPass").value;
  const err = document.getElementById("loginError");
  if (u === "admin" && p === "1234") {
    err.style.display = "none";
    openAdminDashboard();
    showView("view-admin");
  } else {
    err.textContent = "Invalid credentials (demo: admin / 1234)";
    err.style.display = "";
  }
});
document.getElementById("backToStudent").addEventListener("click", () => showView("view-student"));

// Admin logout
document.getElementById("adminLogout").addEventListener("click", () => {
  if (confirm("Logout admin?")) {
    document.getElementById("adminUser").value = "";
    document.getElementById("adminPass").value = "";
    showView("view-admin-login");
  }
});

// Build students table in admin dashboard
function openAdminDashboard() {
  const container = document.getElementById("studentsContainer");
  const students = loadStudents();
  const allocations = loadAllocations();

  if (!students.length) {
    container.innerHTML = `<p class="muted">No student submissions yet.</p>`;
    return;
  }

  let html = `<table>
    <thead><tr>
      <th style="width:22%">Name</th>
      <th>Gender</th>
      <th>Sleep</th>
      <th>Cleanliness</th>
      <th>Study</th>
      <th>Smoking</th>
      <th style="width:12%">Room No</th>
    </tr></thead><tbody>`;

  students.forEach(s => {
    const roomVal = allocations[s.id] || "";
    html += `<tr data-id="${s.id}">
      <td><strong>${escapeHtml(s.name)}</strong><div class="small">submitted: ${new Date(s.submittedAt).toLocaleString()}</div></td>
      <td>${escapeHtml(s.gender)}</td>
      <td>${escapeHtml(s.sleep)}</td>
      <td>${escapeHtml(s.cleanliness)}</td>
      <td>${escapeHtml(s.study)}</td>
      <td>${escapeHtml(s.habits)}</td>
      <td><input class="roomInput" data-id="${s.id}" value="${escapeHtml(roomVal)}" placeholder="e.g., 101"></td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// Save allocations
document.getElementById("saveAllocBtn").addEventListener("click", () => {
  const inputs = Array.from(document.querySelectorAll(".roomInput"));
  const obj = loadAllocations();
  inputs.forEach(inp => {
    const id = inp.getAttribute("data-id");
    const val = inp.value.trim();
    if (val) obj[id] = val;
    else delete obj[id];
  });
  saveAllocations(obj);
  alert("Allocations saved to browser storage.");
});

// Open ChatGPT with pre-filled prompt containing all students
document.getElementById("openChatBtn").addEventListener("click", () => {
  const students = loadStudents();
  if (!students.length) {
    if (!confirm("No students found. Open ChatGPT with example data?")) return;
  }
  const prompt = buildPromptForAllStudents(students);
  openChatWithPrompt(prompt);
});

// Export JSON
document.getElementById("exportBtn").addEventListener("click", () => {
  const students = loadStudents();
  const allocations = loadAllocations();
  const payload = { students, allocations, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roommate_data_export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Clear all data
document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (confirm("Clear ALL student submissions and allocations from this browser?")) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ALLOC_KEY);
    openAdminDashboard();
  }
});

// Helper: build prompt
function buildPromptForAllStudents(students) {
  const lines = students.map(s => {
    return `${s.name} | ${s.gender} | ${s.sleep} | ${s.cleanliness} | ${s.study} | ${s.habits}`;
  }).join("\n");

  const prompt = `
You are a pragmatic hostel allocation officer and roommate matcher.
I will provide a list of students (one per line) with the format:
Name | gender | sleep | cleanliness | study | smoking

Task 1: Suggest roommate groupings (rooms of 2 or 3) that maximize compatibility.
Task 2: For each room, give a short reason why the occupants match (mention sleep schedule, cleanliness, study).
Task 3: Assign a room number starting from 101, incrementing by 1 for each new room.
Here is the list of students:
${lines}
Provide the output in the following format:
Provide the final output as a markdown table with columns: Room No, Occupants, Reason.
  `.trim();

  return prompt.replace(/\n{2,}/g,"\n");
}

// Open ChatGPT in a new tab with prompt
function openChatWithPrompt(promptText) {
  const base = "https://chat.openai.com/?q=";
  const url = base + encodeURIComponent(promptText);
  const newWindow = window.open(url, "_blank");
  if (!newWindow) {
    navigator.clipboard?.writeText(url).then(() => {
      alert("Popup blocked. Pre-filled ChatGPT link copied to clipboard — paste it in your browser.");
    }, () => {
      alert("Popup blocked. Copy this link and paste into your browser:\n\n" + url);
    });
  }
}

// Escape HTML to avoid injection in the table
function escapeHtml(s){
  if (!s && s !== 0) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initial view
showView("view-student");


