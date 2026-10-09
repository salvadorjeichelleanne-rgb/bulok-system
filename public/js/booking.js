document.addEventListener("DOMContentLoaded", () => {
  renderTimeSlots();
  setMinDate();
  loadServicesAndPreselect();

  const form = document.getElementById("booking-form");
  form.addEventListener("submit", handleBookingSubmit);
});

// Set date input minimum value to today
function setMinDate() {
  const dateInput = document.getElementById("booking_date");
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);
}

// Generate time slots 07:00 to 17:00 in 30-min increments
function renderTimeSlots() {
  const grid = document.getElementById("time-slots-grid");
  const timeInput = document.getElementById("booking_time");
  grid.innerHTML = "";

  const times = [];
  for (let h = 7; h <= 17; h++) {
    const hourStr = h.toString().padStart(2, "0");
    times.push(`${hourStr}:00`);
    if (h < 17) {
      times.push(`${hourStr}:30`);
    }
  }

  times.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "time-slot-btn";
    
    // Format display time
    const [hrs, mins] = t.split(":");
    const hNum = parseInt(hrs, 10);
    const ampm = hNum >= 12 ? "PM" : "AM";
    const displayHour = hNum % 12 === 0 ? 12 : hNum % 12;
    btn.textContent = `${displayHour}:${mins} ${ampm}`;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".time-slot-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      timeInput.value = t;
      
      const err = document.getElementById("booking_time-error");
      if (err) err.classList.remove("active");
    });

    grid.appendChild(btn);
  });
}

// Fetch services list for dropdown
async function loadServicesAndPreselect() {
  const serviceSelect = document.getElementById("service_id");
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get("serviceId");

  try {
    const res = await fetch("/api/services");
    if (!res.ok) throw new Error("Could not load services.");
    
    const services = await res.json();
    serviceSelect.innerHTML = '<option value="">-- Choose a Service --</option>';

    services.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${formatPeso(s.price)})`;
      if (preselectedId && preselectedId === String(s.id)) {
        opt.selected = true;
      }
      serviceSelect.appendChild(opt);
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Form validation and API Submission
async function handleBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const serviceId = document.getElementById("service_id").value;
  const bookingDate = document.getElementById("booking_date").value;
  const bookingTime = document.getElementById("booking_time").value;
  const guests = document.getElementById("guests").value;
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const email = document.getElementById("email").value.trim();
  const notes = document.getElementById("notes").value.trim();

  let hasError = false;

  if (!serviceId) {
    showFieldError("service_id", "Please select a service.");
    hasError = true;
  }
  if (!bookingDate) {
    showFieldError("booking_date", "Please select a date.");
    hasError = true;
  }
  if (!bookingTime) {
    showFieldError("booking_time", "Please pick a time slot.");
    hasError = true;
  }
  if (!guests || parseInt(guests, 10) < 1) {
    showFieldError("guests", "Guests/devices must be at least 1.");
    hasError = true;
  }
  if (!name) {
    showFieldError("name", "Name is required.");
    hasError = true;
  }
  if (!contact) {
    showFieldError("contact", "Contact number is required.");
    hasError = true;
  }
  if (!email || !email.includes("@")) {
    showFieldError("email", "A valid email address is required.");
    hasError = true;
  }

  if (hasError) return;

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting Booking...";

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        guests: parseInt(guests, 10),
        name: name,
        contact: contact,
        email: email,
        notes: notes
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to submit booking.");
    }

    // Redirect to confirmation page
    window.location.href = `/confirmation.html?ref=${data.reference}`;

  } catch (err) {
    showToast(err.message, "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Booking";
  }
}