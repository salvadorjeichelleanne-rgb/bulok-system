require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const supabase = require("./supabase");
const authenticateAdmin = require("./middleware/auth");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Serve static frontend assets (CSS, JS, Images) from the public folder FIRST
app.use(express.static(path.join(__dirname, "../public")));

// Helper function to generate unique booking reference
function generateReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "BK";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Input validation for bookings
function validateBookingInput(body) {
  const { service_id, name, contact, email, booking_date, booking_time, guests } = body;

  if (!service_id || !name || !contact || !email || !booking_date || !booking_time) {
    return "All required fields must be provided.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = new Date(booking_date);
  if (isNaN(selectedDate.getTime())) {
    return "Invalid date format.";
  }

  const timeZoneOffset = selectedDate.getTimezoneOffset() * 60000;
  const adjustedSelectedDate = new Date(selectedDate.getTime() + timeZoneOffset);

  if (adjustedSelectedDate < today) {
    return "Booking date cannot be in the past.";
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  if (!timeRegex.test(booking_time)) {
    return "Invalid time format. Use HH:MM format.";
  }

  const [hours, minutes] = booking_time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;

  if (timeInMinutes < 420 || timeInMinutes > 1020) {
    return "Booking time must be between 07:00 and 17:00.";
  }

  const parsedGuests = parseInt(guests, 10);
  if (isNaN(parsedGuests) || parsedGuests < 1) {
    return "Guests must be a number of at least 1.";
  }

  return null;
}

// -----------------------------------------------------------------------------
// PUBLIC API ROUTES
// -----------------------------------------------------------------------------

// GET /api/services
app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, description, price, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Database Error (GET /api/services):", error.message);
      return res.status(500).json({ error: "Failed to retrieve services." });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Unexpected Error (GET /api/services):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// POST /api/bookings
app.post("/api/bookings", async (req, res) => {
  try {
    const validationError = validateBookingInput(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { service_id, name, contact, email, booking_date, booking_time, guests, notes } = req.body;

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", service_id)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: "Selected service was not found or is inactive." });
    }

    let reference = generateReference();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("reference", reference)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        reference = generateReference();
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: "Could not generate a unique reference. Please try again." });
    }

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert([
        {
          reference: reference,
          service_id: service_id,
          name: name,
          contact: contact,
          email: email,
          booking_date: booking_date,
          booking_time: booking_time,
          guests: parseInt(guests, 10) || 1,
          notes: notes || null,
          status: "pending"
        }
      ])
      .select("reference")
      .single();

    if (insertError) {
      console.error("Database Error (POST /api/bookings):", insertError.message);
      return res.status(500).json({ error: "Failed to create booking." });
    }

    return res.status(201).json({ reference: booking.reference });
  } catch (err) {
    console.error("Unexpected Error (POST /api/bookings):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// GET /api/bookings/:reference
app.get("/api/bookings/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        reference,
        name,
        contact,
        email,
        booking_date,
        booking_time,
        guests,
        notes,
        status,
        created_at,
        services (
          name,
          price
        )
      `)
      .eq("reference", reference)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Booking reference not found." });
    }

    const responseData = {
      id: data.id,
      reference: data.reference,
      name: data.name,
      contact: data.contact,
      email: data.email,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      guests: data.guests,
      notes: data.notes,
      status: data.status,
      created_at: data.created_at,
      service_name: data.services ? data.services.name : "Unknown Service",
      service_price: data.services ? data.services.price : 0
    };

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Unexpected Error (GET /api/bookings/:reference):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// -----------------------------------------------------------------------------
// ADMIN API ROUTES
// -----------------------------------------------------------------------------

// POST /api/admin/login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({ message: "Login successful." });
  } catch (err) {
    console.error("Unexpected Error (POST /api/admin/login):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// POST /api/admin/logout
app.post("/api/admin/logout", authenticateAdmin, (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction
  });

  return res.status(200).json({ message: "Logout successful." });
});

// GET /api/admin/bookings
app.get("/api/admin/bookings", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        reference,
        name,
        contact,
        email,
        booking_date,
        booking_time,
        guests,
        notes,
        status,
        created_at,
        services (
          name,
          price
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database Error (GET /api/admin/bookings):", error.message);
      return res.status(500).json({ error: "Failed to retrieve bookings." });
    }

    const formattedData = data.map((b) => ({
      id: b.id,
      reference: b.reference,
      name: b.name,
      contact: b.contact,
      email: b.email,
      booking_date: b.booking_date,
      booking_time: b.booking_time,
      guests: b.guests,
      notes: b.notes,
      status: b.status,
      created_at: b.created_at,
      service_name: b.services ? b.services.name : "Unknown Service",
      service_price: b.services ? b.services.price : 0
    }));

    return res.status(200).json(formattedData);
  } catch (err) {
    console.error("Unexpected Error (GET /api/admin/bookings):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// PATCH /api/admin/bookings/:id/confirm
app.patch("/api/admin/bookings/:id/confirm", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", id)
      .select("id, reference, status")
      .single();

    if (error || !data) {
      console.error("Database Error (PATCH confirm):", error ? error.message : "Not found");
      return res.status(404).json({ error: "Booking not found or update failed." });
    }

    return res.status(200).json({ message: "Booking confirmed successfully.", booking: data });
  } catch (err) {
    console.error("Unexpected Error (PATCH confirm):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// PATCH /api/admin/bookings/:id/cancel
app.patch("/api/admin/bookings/:id/cancel", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("id, reference, status")
      .single();

    if (error || !data) {
      console.error("Database Error (PATCH cancel):", error ? error.message : "Not found");
      return res.status(404).json({ error: "Booking not found or update failed." });
    }

    return res.status(200).json({ message: "Booking cancelled successfully.", booking: data });
  } catch (err) {
    console.error("Unexpected Error (PATCH cancel):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// DELETE /api/admin/bookings/:id
app.delete("/api/admin/bookings/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Database Error (DELETE booking):", error.message);
      return res.status(500).json({ error: "Failed to delete booking." });
    }

    return res.status(200).json({ message: "Booking deleted successfully." });
  } catch (err) {
    console.error("Unexpected Error (DELETE booking):", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// -----------------------------------------------------------------------------
// FALLBACK ROUTE FOR HTML PAGES (Placed AT THE VERY END)
// -----------------------------------------------------------------------------
app.get("*", (req, res, next) => {
  // Let Express handle API routes if not matched
  if (req.path.startsWith("/api/")) {
    return next();
  }
  
  // Serve clean HTML pages
  if (req.path.endsWith(".html") || req.path === "/") {
    const page = req.path === "/" ? "index.html" : req.path;
    return res.sendFile(path.join(__dirname, "../public", page));
  }

  next();
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}