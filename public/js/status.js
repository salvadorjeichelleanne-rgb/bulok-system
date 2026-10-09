document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("search-form");
  form.addEventListener("submit", handleSearch);

  // Auto search if reference is passed in URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref");
  if (ref) {
    document.getElementById("ref-input").value = ref;
    executeSearch(ref);
  }
});

function handleSearch(e) {
  e.preventDefault();
  clearErrors(e.target);

  const refInput = document.getElementById("ref-input").value.trim().toUpperCase();
  if (!refInput) {
    showFieldError("ref-input", "Please enter a reference code.");
    return;
  }

  executeSearch(refInput);
}

async function executeSearch(ref) {
  const loading = document.getElementById("status-loading");
  const resultCard = document.getElementById("status-result");
  const searchBtn = document.getElementById("search-btn");

  loading.style.display = "block";
  resultCard.style.display = "none";
  searchBtn.disabled = true;

  try {
    const res = await fetch(`/api/bookings/${ref}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Reference code not found.");
    }

    loading.style.display = "none";
    searchBtn.disabled = false;

    document.getElementById("res-ref").textContent = data.reference;
    document.getElementById("res-status").innerHTML = `<span class="badge badge-${data.status}">${data.status}</span>`;
    document.getElementById("res-service").textContent = data.service_name;
    document.getElementById("res-price").textContent = formatPeso(data.service_price);
    document.getElementById("res-date").textContent = formatDate(data.booking_date);
    document.getElementById("res-time").textContent = data.booking_time;
    document.getElementById("res-name").textContent = data.name;
    document.getElementById("res-notes").textContent = data.notes || "None";

    resultCard.style.display = "block";

  } catch (err) {
    loading.style.display = "none";
    searchBtn.disabled = false;
    showToast(err.message, "error");
  }
}