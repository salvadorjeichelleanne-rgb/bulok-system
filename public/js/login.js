
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  let hasError = false;

  if (!username) {
    showFieldError("username", "Username is required.");
    hasError = true;
  }
  if (!password) {
    showFieldError("password", "Password is required.");
    hasError = true;
  }

  if (hasError) return;

  const submitBtn = document.getElementById("login-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Authenticating...";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ username: username, password: password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Authentication failed.");
    }

    // Redirect to dashboard on successful login
    window.location.href = "/admin/dashboard.html";

  } catch (err) {
    showToast(err.message, "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Login to Dashboard";
  }
}