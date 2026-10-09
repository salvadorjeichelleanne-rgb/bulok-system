document.addEventListener("DOMContentLoaded", () => {
  fetchServices();
});

async function fetchServices() {
  const loadingElem = document.getElementById("services-loading");
  const emptyElem = document.getElementById("services-empty");
  const gridElem = document.getElementById("services-grid");

  try {
    const response = await fetch("/api/services");
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to load services.");
    }

    const services = await response.json();
    loadingElem.style.display = "none";

    if (!services || services.length === 0) {
      emptyElem.style.display = "block";
      return;
    }

    gridElem.innerHTML = services.map((s) => `
      <div class="card">
        <div>
          <h2 class="card-title">${escapeHtml(s.name)}</h2>
          <p class="card-desc">${escapeHtml(s.description)}</p>
        </div>
        <div class="card-footer">
          <span class="card-price">${formatPeso(s.price)}</span>
          <a href="/book.html?serviceId=${s.id}" class="btn btn-primary">Book Now</a>
        </div>
      </div>
    `).join("");

    gridElem.style.display = "grid";
  } catch (err) {
    loadingElem.style.display = "none";
    showToast(err.message, "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}