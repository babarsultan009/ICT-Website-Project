<script>
/* ===================== CONFIG ===================== */
const clientId = "03db9a5291cf4a0d9e7a9110e2d02799";
const redirectUri = "https://babarsultan009.github.io/ICT-Website-Project/callback.html";
const scopes = "user-read-private playlist-read-private";

/* ===================== AUTH HELPERS ===================== */
function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => chars[x % chars.length])
    .join("");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/* ===================== LOGIN ===================== */
async function login() {
  const verifier = generateRandomString(64);
  localStorage.setItem("verifier", verifier);

  const hashed = await sha256(verifier);
  const challenge = base64encode(hashed);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge
  });

  window.location.href = authUrl;
}

/* ===================== CALLBACK ===================== */
async function handleRedirect() {
  const code = new URLSearchParams(window.location.search).get("code");
  const verifier = localStorage.getItem("verifier");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    })
  });

  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);

  window.location.replace("dashboard.html");
}

/* ===================== REFRESH TOKEN ===================== */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return false;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
    return true;
  }
  return false;
}

/* ===================== AUTH GUARD ===================== */
async function requireAuth() {
  let token = localStorage.getItem("access_token");
  if (!token) {
    const ok = await refreshAccessToken();
    if (!ok) window.location.replace("index.html");
  }
}

/* ===================== LOGOUT ===================== */
function logout() {
  localStorage.clear();
  window.location.replace("index.html");
}

/* ===================== LOADING UI ===================== */
function showLoader(show) {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = show ? "flex" : "none";
}

/* ===================== DASHBOARD ===================== */
async function loadDashboard() {
  await requireAuth();
  showLoader(true);

  const token = localStorage.getItem("access_token");

  /* PROFILE */
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const profile = await profileRes.json();

  document.getElementById("profile").innerHTML = `
    <img src="${profile.images?.[0]?.url || "https://via.placeholder.com/80"}">
    <h2>${profile.display_name}</h2>
    <button onclick="logout()">Logout</button>
  `;

  /* PLAYLISTS */
  const plRes = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const playlists = await plRes.json();

  document.getElementById("playlists").innerHTML =
    playlists.items.map(p => `
      <div class="playlist">
        <h3>${p.name}</h3>
        <iframe src="https://open.spotify.com/embed/playlist/${p.id}"
          width="100%" height="80" allow="encrypted-media"></iframe>
      </div>
    `).join("");

  showLoader(false);
}

/* ===================== SEARCH ===================== */
let currentFilter = "all";
let timeout = null;

function setFilter(type) {
  currentFilter = type;
  searchSpotify();
}

function searchSpotify() {
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    const q = document.getElementById("searchInput").value.trim();
    if (!q) return (searchResults.innerHTML = "");

    const token = localStorage.getItem("access_token");
    let type = currentFilter === "track" ? "track" :
               currentFilter === "playlist" ? "playlist" : "track,playlist";

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=6`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    let html = "";

    data.tracks?.items?.forEach(t => {
      html += `
        <div class="search-card">
          <b>${t.name}</b> – ${t.artists[0].name}
          <iframe src="https://open.spotify.com/embed/track/${t.id}"
            width="100%" height="80"></iframe>
        </div>`;
    });

    data.playlists?.items?.forEach(p => {
      html += `
        <div class="search-card">
          <b>${p.name}</b>
          <iframe src="https://open.spotify.com/embed/playlist/${p.id}"
            width="100%" height="80"></iframe>
        </div>`;
    });

    searchResults.innerHTML = html;
  }, 400);
}
</script>
