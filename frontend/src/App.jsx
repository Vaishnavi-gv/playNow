import { useState } from "react";
import { apiFormRequest, apiRequest } from "./api";

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [videos, setVideos] = useState(null);
  const [upload, setUpload] = useState({
    title: "",
    description: "",
    duration: "",
    videoFile: null,
    thumbnail: null,
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setUpload((prev) => ({ ...prev, [name]: files[0] || null }));
      return;
    }
    setUpload((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("username", form.username);
      fd.append("password", form.password);

      await apiFormRequest("/users/register", fd);
      setMessage("Registered successfully!");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const data = await apiRequest("/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
      const user = data?.data?.user || null;
      setAuthUser(user);
      setMessage(`Logged in as ${user?.username || "user"}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleLogout = async () => {
    setMessage("");
    try {
      await apiRequest("/users/logout", { method: "POST" });
      setAuthUser(null);
      setVideos(null);
      setUpload({
        title: "",
        description: "",
        duration: "",
        videoFile: null,
        thumbnail: null,
      });
      setMessage("Logged out");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fetchVideos = async () => {
    setMessage("");
    try {
      const data = await apiRequest(`/videos?page=${page}&limit=${limit}`);
      setVideos(data?.data || null);
      setMessage("Videos loaded");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("title", upload.title);
      fd.append("description", upload.description);
      fd.append("duration", upload.duration);
      if (upload.videoFile) fd.append("videoFile", upload.videoFile);
      if (upload.thumbnail) fd.append("thumbnail", upload.thumbnail);

      await apiFormRequest("/videos", fd);
      setMessage("Video uploaded");
      await fetchVideos();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const onSubmit = mode === "register" ? handleRegister : handleLogin;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#e5e7eb",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: authUser ? 760 : 420,
          padding: "2rem",
          background: "#020617",
          borderRadius: "1rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem", flex: 1 }}>
            PlayNow
          </h1>
          {authUser && (
            <button
              onClick={handleLogout}
              style={{
                marginBottom: "1rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid #1f2937",
                background: "transparent",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          )}
        </div>

        {!authUser ? (
          <>
            <div
              style={{
                display: "flex",
                marginBottom: "1.5rem",
                borderRadius: "999px",
                background: "#020617",
                padding: 4,
                border: "1px solid #1f2937",
              }}
            >
              <button
                onClick={() => setMode("login")}
                style={{
                  flex: 1,
                  padding: "0.5rem 0",
                  borderRadius: "999px",
                  border: "none",
                  background: mode === "login" ? "#2563eb" : "transparent",
                  color: mode === "login" ? "#f9fafb" : "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Login
              </button>
              <button
                onClick={() => setMode("register")}
                style={{
                  flex: 1,
                  padding: "0.5rem 0",
                  borderRadius: "999px",
                  border: "none",
                  background: mode === "register" ? "#2563eb" : "transparent",
                  color: mode === "register" ? "#f9fafb" : "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              style={{ display: "grid", gap: "0.75rem" }}
            >
              {mode === "register" && (
                <>
                  <div style={{ display: "grid", gap: 4 }}>
                    <label htmlFor="fullName" style={{ fontSize: 13 }}>
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <label htmlFor="username" style={{ fontSize: 13 }}>
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      style={inputStyle}
                      required
                    />
                  </div>
                </>
              )}

              <div style={{ display: "grid", gap: 4 }}>
                <label htmlFor="email" style={{ fontSize: 13 }}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <label htmlFor="password" style={{ fontSize: 13 }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "#2563eb",
                  color: "#f9fafb",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {mode === "login" ? "Login" : "Register"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 12,
                border: "1px solid #1f2937",
                borderRadius: 12,
                background: "#020617",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pillStyle}>
                  user: <b>{authUser?.username}</b>
                </span>
                <span style={pillStyle}>
                  role: <b>{authUser?.role || "user"}</b>
                </span>
              </div>
              <p style={{ marginTop: 10, marginBottom: 0, color: "#9ca3af" }}>
                To upload videos, set your role in MongoDB to{" "}
                <code>creator</code> or <code>admin</code>.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  padding: 16,
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
                  Upload video
                </h2>
                <form
                  onSubmit={handleVideoUpload}
                  style={{ display: "grid", gap: 10 }}
                >
                  <input
                    name="title"
                    placeholder="Title"
                    value={upload.title}
                    onChange={handleUploadChange}
                    style={inputStyle}
                  />
                  <input
                    name="description"
                    placeholder="Description"
                    value={upload.description}
                    onChange={handleUploadChange}
                    style={inputStyle}
                  />
                  <input
                    name="duration"
                    placeholder="Duration (seconds)"
                    value={upload.duration}
                    onChange={handleUploadChange}
                    style={inputStyle}
                  />
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 13, color: "#cbd5e1" }}>
                      videoFile
                    </label>
                    <input
                      name="videoFile"
                      type="file"
                      accept="video/*"
                      onChange={handleUploadChange}
                      style={fileStyle}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 13, color: "#cbd5e1" }}>
                      thumbnail
                    </label>
                    <input
                      name="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleUploadChange}
                      style={fileStyle}
                    />
                  </div>
                  <button type="submit" style={primaryButtonStyle}>
                    Upload
                  </button>
                </form>
              </div>

              <div
                style={{
                  padding: 16,
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
                  Videos
                </h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    value={page}
                    onChange={(e) => setPage(Number(e.target.value) || 1)}
                    style={{ ...inputStyle, width: 90 }}
                    placeholder="page"
                  />
                  <input
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 10)}
                    style={{ ...inputStyle, width: 90 }}
                    placeholder="limit"
                  />
                  <button onClick={fetchVideos} style={secondaryButtonStyle}>
                    Load
                  </button>
                </div>

                {videos?.docs?.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {videos.docs.map((v) => (
                      <div
                        key={v._id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "96px 1fr",
                          gap: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #1f2937",
                        }}
                      >
                        <a href={v.videoFile} target="_blank" rel="noreferrer">
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            style={{
                              width: 96,
                              height: 54,
                              objectFit: "cover",
                              borderRadius: 10,
                              display: "block",
                            }}
                          />
                        </a>
                        <div>
                          <div style={{ fontWeight: 700 }}>{v.title}</div>
                          <div style={{ fontSize: 13, color: "#9ca3af" }}>
                            id: <code>{v._id}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#9ca3af" }}>
                    Click “Load” to fetch videos.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {message && (
          <p style={{ marginTop: "1rem", fontSize: 14, color: "#e5e7eb" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #1f2937",
  background: "#020617",
  color: "#e5e7eb",
  outline: "none",
};

const fileStyle = {
  color: "#e5e7eb",
};

const primaryButtonStyle = {
  marginTop: 4,
  padding: "0.6rem 1rem",
  borderRadius: "999px",
  border: "none",
  background: "#2563eb",
  color: "#f9fafb",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "0.5rem 0.8rem",
  borderRadius: "999px",
  border: "1px solid #1f2937",
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
};

const pillStyle = {
  border: "1px solid #1f2937",
  padding: "0.25rem 0.6rem",
  borderRadius: "999px",
  color: "#e5e7eb",
};

export default App;