const BASE_URL = "http://localhost:5000"; // Backend URL

// ==========================
// Desktop Dropdown Click Toggle
// ==========================
document.querySelectorAll('.dropdown-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const menu = btn.nextElementSibling;

    // Close other open dropdowns
    document.querySelectorAll('.dropdown-btn').forEach(otherBtn => {
      if (otherBtn !== btn) {
        const otherMenu = otherBtn.nextElementSibling;
        otherMenu.classList.add('hidden');
      }
    });

    menu.classList.toggle('hidden');
  });
});

// Close dropdown if clicked outside
window.addEventListener('click', (e) => {
  if (!e.target.matches('.dropdown-btn')) {
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
      btn.nextElementSibling.classList.add('hidden');
    });
  }
});

// ==========================
// Mobile Menu Toggle
// ==========================
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}

// ==========================
// Dark Mode Toggle
// ==========================
const themeToggle = document.getElementById("theme-toggle");
const htmlElement = document.documentElement;

if (themeToggle) {
  // Load saved mode from localStorage
  if (localStorage.getItem("theme") === "dark") {
    htmlElement.classList.add("dark");
    themeToggle.textContent = "☀️";
  } else {
    themeToggle.textContent = "🌙";
  }

  themeToggle.addEventListener("click", () => {
    if (htmlElement.classList.contains("dark")) {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      themeToggle.textContent = "🌙";
    } else {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      themeToggle.textContent = "☀️";
    }
  });
}

// ================== AUTH FUNCTIONS =============

// ===== LOGIN FUNCTION =====
async function login(event) {
  event.preventDefault();

  const role = document.querySelector("#roleSelect").value;
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value.trim();

  if (!email || !password) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Invalid credentials!");
      return;
    }

    // Save token and role locally
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", role);

    alert("Login successful!");

    // Redirect based on role
    if (role === "admin") {
      window.location.href = "admin.html"; // Corrected to admin.html
    } else if (role === "student") {
      window.location.href = "student.html"; // Corrected to student.html
    } else { // alumni
      window.location.href = "alumni.html"; // Corrected to alumni.html
    }
  } catch (err) {
    console.error("Login Error:", err);
    alert("Error logging in. Please try again.");
  }
}

// ===== REGISTER FUNCTION =====
async function registerUser(event) {
  event.preventDefault();

  const role = document.querySelector("#roleSelect").value;
  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Registration failed!");
      return;
    }

    alert("Registration successful! Please login now.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Registration Error:", err);
    alert("Error registering. Please try again.");
  }
}

// ================== FETCH NEWS & RESOURCES FOR HOMEPAGE ==================
async function loadHomepageNews() {
  const res = await fetch(`${BASE_URL}/admin/news`); // Use BASE_URL
  const news = await res.json();
  const container = document.getElementById("newsContainer");
  if (container) {
    container.innerHTML = news.length
      ? news
          .map(
            (n) =>
              `<div class="bg-white dark:bg-gray-800 p-6 rounded shadow hover:shadow-lg transition">
                <h3 class="text-xl font-semibold mb-2">${n.title}</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-2">${n.content}</p>
                <span class="text-sm text-gray-500 dark:text-gray-400">${new Date(
                  n.created_at
                ).toLocaleDateString()}</span>
              </div>`
          )
          .join("")
      : `<p class="text-gray-600">No news available.</p>`;
  }
}

async function loadHomepageResources() {
  const res = await fetch(`${BASE_URL}/admin/resources`); // Use BASE_URL
  const resources = await res.json();
  const container = document.getElementById("resourcesContainer");
  if (container) {
    container.innerHTML = resources.length
      ? resources
          .map(
            (r) =>
              `<div class="bg-white dark:bg-gray-800 p-6 rounded shadow hover:shadow-lg transition">
                <h3 class="text-xl font-semibold mb-3">${r.title}</h3>
                <p><a href="${r.link}" target="_blank" class="text-blue-600 hover:underline">${r.link}</a></p>
              </div>`
          )
          .join("")
      : `<p class="text-gray-600">No resources available.</p>`;
  }
}

// Auto-load news & resources on homepage
document.addEventListener("DOMContentLoaded", () => {
  // Only load if on the index.html page
  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    loadHomepageNews();
    loadHomepageResources();
  }
});

// ================== ADMIN DASHBOARD LOGIC (from admin.js, integrated here for simplicity) ==================
// This part is specifically for the admin.html dashboard, not the main index.html
// It's included here for completeness if you decide to use a single script.js for everything.

// Check if on admin.html and load users
if (window.location.pathname.endsWith("admin.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    loadAdminUsers(); // Renamed from loadUsers to avoid conflict if another loadUsers exists
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  });
}

async function loadAdminUsers() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized. Please login again.");
      window.location.href = "login.html";
      return;
    }

    const res = await fetch(`${BASE_URL}/admin/users`, { // Use BASE_URL
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const tableBody = document.getElementById("userTableBody");

    if (!res.ok) {
      alert("Failed to load users.");
      return;
    }

    if (tableBody) { // Ensure tableBody exists before manipulating
      tableBody.innerHTML = data
        .map(
          (user) => `
          <tr class="border-b">
            <td class="py-2 px-4">${user.id}</td>
            <td class="py-2 px-4">${user.name}</td>
            <td class="py-2 px-4">${user.email}</td>
            <td class="py-2 px-4">${user.role}</td>
          </tr>`
        )
        .join("");
    }
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

// The original admin.js also had news/resource management.
// If you want that in admin.html, you'll need to add those functions here
// and ensure admin.html has the correct forms/lists for them.
// For now, I'm assuming admin.html is just for user listing.

// Example of how to integrate news/resource management for admin.html if needed:

// ====== NEWS MANAGEMENT FOR ADMIN DASHBOARD ======
const newsForm = document.getElementById("newsForm");
const newsList = document.getElementById("newsList");

async function loadAdminNews() {
  const res = await fetch(`${BASE_URL}/admin/news`);
  const data = await res.json();
  if (newsList) {
    newsList.innerHTML = "";
    data.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span><strong>${item.title}</strong>: ${item.content}</span>
        <div>
          <button class="edit-btn" onclick="editNews(${item.id}, '${item.title}', '${item.content}')">Edit</button>
          <button class="delete-btn" onclick="deleteNews(${item.id})">Delete</button>
        </div>
      `;
      newsList.appendChild(li);
    });
  }
}

if (newsForm) {
  newsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("newsTitle").value;
    const content = document.getElementById("newsContent").value;

    await fetch(`${BASE_URL}/admin/news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ title, content }),
    });

    newsForm.reset();
    loadAdminNews();
  });
}

async function deleteNews(id) {
  await fetch(`${BASE_URL}/admin/news/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  loadAdminNews();
}

function editNews(id, oldTitle, oldContent) {
  const newTitle = prompt("Edit Title:", oldTitle);
  const newContent = prompt("Edit Content:", oldContent);
  if (!newTitle || !newContent) return;
  fetch(`${BASE_URL}/admin/news/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ title: newTitle, content: newContent }),
  }).then(() => loadAdminNews());
}

// ====== RESOURCES MANAGEMENT FOR ADMIN DASHBOARD ======
const resourceForm = document.getElementById("resourceForm");
const resourceList = document.getElementById("resourceList");

async function loadAdminResources() {
  const res = await fetch(`${BASE_URL}/admin/resources`);
  const data = await res.json();
  if (resourceList) {
    resourceList.innerHTML = "";
    data.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span><strong>${item.title}</strong>: <a href="${item.link}" target="_blank">${item.link}</a></span>
        <div>
          <button class="edit-btn" onclick="editResource(${item.id}, '${item.title}', '${item.link}')">Edit</button>
          <button class="delete-btn" onclick="deleteResource(${item.id})">Delete</button>
        </div>
      `;
      resourceList.appendChild(li);
    });
  }
}

if (resourceForm) {
  resourceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("resourceTitle").value;
    const link = document.getElementById("resourceLink").value;

    await fetch(`${BASE_URL}/admin/resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ title, link }),
    });

    resourceForm.reset();
    loadAdminResources();
  });
}

async function deleteResource(id) {
  await fetch(`${BASE_URL}/admin/resources/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  loadAdminResources();
}

function editResource(id, oldTitle, oldLink) {
  const newTitle = prompt("Edit Title:", oldTitle);
  const newLink = prompt("Edit Link:", oldLink);
  if (!newTitle || !newLink) return;
  fetch(`${BASE_URL}/admin/resources/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ title: newTitle, link: newLink }),
  }).then(() => loadAdminResources());
}

// Initial load for admin news/resources if on admin.html
if (window.location.pathname.endsWith("admin.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    loadAdminNews();
    loadAdminResources();
  });
}
