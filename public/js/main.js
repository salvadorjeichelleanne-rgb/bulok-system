// Utility: Format currency in PHP Pesos
function formatPeso(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(num);
}

// Utility: Format ISO date string into readable text
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "long", day: "numeric" };
  const dateObj = new Date(dateString + "T00:00:00");
  return dateObj.toLocaleDateString("en-US", options);
}

// Utility: Display banner notifications
function showToast(message, type = "success", containerId = "toast-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.className = `toast-banner toast-${type} active`;
  container.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.classList.remove('active')" style="background:none; border:none; color:inherit; cursor:pointer; font-weight:bold; padding:0 0.5rem;">&times;</button>
  `;
}

// Helper: Clear validation error messages
function clearErrors(form) {
  const errors = form.querySelectorAll(".field-error");
  errors.forEach((err) => {
    err.classList.remove("active");
    err.textContent = "";
  });
}

// Helper: Show single field error
function showFieldError(fieldId, message) {
  const errElem = document.getElementById(`${fieldId}-error`);
  if (errElem) {
    errElem.textContent = message;
    errElem.classList.add("active");
  }
}