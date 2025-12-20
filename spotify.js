function requireAuth() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.replace("index.html");
  }
}
const clientId = "03db9a5291cf4a0d9e7a9110e2d02799";
const redirectUri = "https://babarsultan009.github.io/ICT-Website-Project/callback.html";
const scopes = "user-read-private playlist-read-private";

function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => chars[x % chars.length])
    .join("");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// LOGIN
async function login() {
  const codeVerifier = generateRandomString(64);
  localStorage.setItem("verifier", codeVerifier);

  const hashed = await sha256(codeVerifier);
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

  window.location = authUrl;
}

// CALLBACK
async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  const verifier = localStorage.getItem("verifier");

  const result = await fetch("https://accounts.spotify.com/api/token", {
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

  const data = await result.json();
  localStorage.setItem("access_token", data.access_token);
  window.location = "dashboard.html";
}

// DASHBOARD
async function loadDashboard() {
  const token = localStorage.getItem("access_token");

  // PROFILE
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const profile = await profileRes.json();

  document.getElementById("profile").innerHTML = `
    <img src="${profile.images[0]?.url}">
    <h2>${profile.display_name}</h2>
  `;

  // PLAYLISTS
  const playlistRes = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const playlists = await playlistRes.json();

  document.getElementById("playlists").innerHTML =
    playlists.items.map(p => `
      <div class="playlist">
        <h3>${p.name}</h3>
        <iframe
          src="https://open.spotify.com/embed/playlist/${p.id}"
          width="100%" height="80"
          frameborder="0"
          allow="encrypted-media">
        </iframe>
      </div>
    `).join("");
}
