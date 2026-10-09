let allBookings = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchAdminBookings();

  document.getElementById("search-input").addEventListener("input", filterAndRenderBookings);
  document.getElementById("status-filter").addEventListener("change", filterAndRenderBookings);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
});

// Helper for API fetches requiring credentials & 401 handling
async function adminFetch(url, options = {}) {
  const defaultOptions = {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const response = await fetch(url, mergedOptions);

  if (response.status === 401) {
    window.location.href = "/admin/login.html";
    throw new Error("Session expired. Redirecting to login...");
  }

  return response;
}

// Fetch all bookings
async function fetchAdminBookings() {
  const loadingElem = document.getElementById("table-loading");
  const emptyElem = document.getElementById("table-empty");
  const containerElem = document.getElementById("table-container");

  try {
    const res = await adminFetch("/api/admin/bookings");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch bookings.");
    }

    allBookings = data;
    loadingElem.style.display = "none";
    
    updateSummaryStats(allBookings);
    filterAndRenderBookings();

  } catch (err) {
    loadingElem.style.display = "none";
    showToast(err.message, "error");
  }
}

// Calculate total, pending, and confirmed stats
function updateSummaryStats(bookings) {
  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-confirmed").textContent = confirmed;
}

// Client-side filtering by search query & status selector
function filterAndRenderBookings() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const statusFilter = document.getElementById("status-filter").value;

  const filtered = allBookings.filter((b) => {
    const matchesSearch = 
      b.reference.toLowerCase().includes(query) ||
      b.name.toLowerCase().includes(query) ||
      b.contact.toLowerCase().includes(query) ||
      b.email.toLowerCase().includes(query) ||
      b.service_name.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  renderTableRows(filtered);
}

// Render dynamic rows
function renderTableRows(bookings) {
  const emptyElem = document.getElementById("table-empty");
  const containerElem = document.getElementById("table-container");
  const tbody = document.getElementById("bookings-tbody");

  if (!bookings || bookings.length === 0) {
    containerElem.style.display = "none";
    emptyElem.style.display = "block";
    return;
  }

  emptyElem.style.display = "none";
  containerElem.style.display = "block";

  tbody.innerHTML = bookings.map((b) => `
    <tr>
      <td style="font-family: monospace; font-weight: 700; color: var(--color-primary);">${escapeHtml(b.reference)}</td>
      <td>
        <strong>${escapeHtml(b.service_name)}</strong>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${formatPeso(b.service_price)}</div>
      </td>
      <td>
        <div><strong>${escapeHtml(b.name)}</strong></div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(b.contact)} | ${escapeHtml(b.email)}</div>
      </td>
      <td>
        <div>${formatDate(b.booking_date)}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(b.booking_time)}</div>
      </td>
      <td style="text-align: center;">${b.guests}</td>
      <td>
        <span class="badge badge-${b.status}">${b.status}</span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          ${b.status !== "confirmed" ? `<button onclick="confirmBooking(${b.id})" class="btn btn-accent btn-xs">Confirm</button>` : ""}
          ${b.status !== "cancelled" ? `<button onclick="cancelBooking(${b.id})" class="btn btn-secondary btn-xs">Cancel</button>` : ""}
          <button onclick="deleteBooking(${b.id}, '${escapeHtml(b.reference)}')" class="btn btn-danger btn-xs">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Actions
async function confirmBooking(id) {
  try {
    const res = await adminFetch(`/api/admin/bookings/${id}/confirm`, {
      method: "PATCH"
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to confirm booking.");

    showToast("Booking confirmed successfully.", "success");
    fetchAdminBookings();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function cancelBooking(id) {
  try {
    const res = await adminFetch(`/api/admin/bookings/${id}/cancel`, {
      method: "PATCH"
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to cancel booking.");

    showToast("Booking cancelled successfully.", "success");
    fetchAdminBookings();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteBooking(id, ref) {
  if (!confirm(`Are you sure you want to permanently delete booking "${ref}"?`)) {
    return;
  }

  try {
    const res = await adminFetch(`/api/admin/bookings/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to delete booking.");

    showToast("Booking deleted successfully.", "success");
    fetchAdminBookings();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleLogout() {
  try {
    await adminFetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login.html";
  } catch (err) {
    showToast(err.message, "error");
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}