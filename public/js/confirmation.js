document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref");

  if (!ref) {
    window.location.href = "/";
    return;
  }

  fetchBookingDetails(ref);

  document.getElementById("copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(ref).then(() => {
      showToast("Reference code copied to clipboard!", "success");
    }).catch(() => {
      showToast("Could not copy reference code.", "error");
    });
  });
});

async function fetchBookingDetails(ref) {
  const loadingElem = document.getElementById("loading-state");
  const contentElem = document.getElementById("confirmation-content");

  try {
    const res = await fetch(`/api/bookings/${ref}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Booking reference not found.");
    }

    const data = await res.json();
    loadingElem.style.display = "none";

    document.getElementById("ref-code").textContent = data.reference;
    document.getElementById("detail-service").textContent = data.service_name;
    document.getElementById("detail-price").textContent = formatPeso(data.service_price);
    document.getElementById("detail-date").textContent = formatDate(data.booking_date);
    document.getElementById("detail-time").textContent = data.booking_time;
    document.getElementById("detail-name").textContent = data.name;
    document.getElementById("detail-contact").textContent = data.contact;

    const statusBadge = `<span class="badge badge-${data.status}">${data.status}</span>`;
    document.getElementById("detail-status").innerHTML = statusBadge;

    contentElem.style.display = "block";
  } catch (err) {
    loadingElem.style.display = "none";
    showToast(err.message, "error");
  }
}