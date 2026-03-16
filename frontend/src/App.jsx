import { useState, useEffect } from "react";
import { apiFormRequest, apiRequest } from "./api";

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [view, setView] = useState("home"); // "home" | "subscriptions"
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false); // optimistic UI; backend returns truth
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [channelSubscribed, setChannelSubscribed] = useState(false);
  const [channelSubscribersCount, setChannelSubscribersCount] = useState(0);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [upload, setUpload] = useState({
    title: "",
    description: "",
    duration: "",
    videoFile: null,
    thumbnail: null,
  });

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setUpload((prev) => ({ ...prev, [name]: files[0] || null }));
    } else {
      setUpload((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("fullName", authForm.fullName);
      fd.append("email", authForm.email);
      fd.append("username", authForm.username);
      fd.append("password", authForm.password);

      await apiFormRequest("/users/register", fd);
      setMessage("Registered successfully, you can now log in.");
      setAuthMode("login");
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
          email: authForm.email,
          password: authForm.password,
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
      setVideos([]);
      setSelectedVideoId(null);
      setSelectedVideo(null);
      setLikesCount(0);
      setLiked(false);
      setComments([]);
      setCommentDraft("");
      setChannelSubscribed(false);
      setChannelSubscribersCount(0);
      setMySubscriptions([]);
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
      setUpload({
        title: "",
        description: "",
        duration: "",
        videoFile: null,
        thumbnail: null,
      });
      fetchVideos(1);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fetchVideos = async (targetPage = page) => {
    setMessage("");
    try {
      const data = await apiRequest(
        `/videos?page=${targetPage}&limit=${limit}&sortBy=createdAt&sortOrder=desc`
      );
      const result = data?.data;
      setVideos(result?.docs || result?.results || []);
      setPage(targetPage);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fetchSearch = async (q, targetPage = 1) => {
    setMessage("");
    try {
      const data = await apiRequest(
        `/videos/search?q=${encodeURIComponent(
          q
        )}&page=${targetPage}&limit=${limit}&sortBy=score&sortOrder=desc`
      );
      const result = data?.data;
      setVideos(result?.docs || result?.results || []);
      setPage(targetPage);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setIsSearchMode(false);
      setPage(1);
      await fetchVideos(1);
      return;
    }
    setIsSearchMode(true);
    await fetchSearch(q, 1);
  };

  // Debounced search while typing
  useEffect(() => {
    const q = searchQuery.trim();
    const t = setTimeout(() => {
      if (!q) {
        if (isSearchMode) {
          setIsSearchMode(false);
          fetchVideos(1);
        }
        return;
      }
      setIsSearchMode(true);
      fetchSearch(q, 1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const openVideo = async (id) => {
    setSelectedVideoId(id);
    setSelectedVideo(null);
    setComments([]);
    setLikesCount(0);
    setChannelSubscribed(false);
    setChannelSubscribersCount(0);

    try {
      const v = await apiRequest(`/videos/${id}`);
      const video = v?.data;
      setSelectedVideo(video);

      const lc = await apiRequest(`/videos/${id}/likes/count`);
      setLikesCount(lc?.data?.likesCount ?? 0);

      const cs = await apiRequest(`/videos/${id}/comments?page=1&limit=10`);
      setComments(cs?.data?.docs || []);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const toggleLike = async () => {
    if (!authUser || !selectedVideoId) {
      setMessage("Login to like videos");
      return;
    }
    try {
      const data = await apiRequest(`/videos/${selectedVideoId}/like`, {
        method: "POST",
      });
      setLiked(Boolean(data?.data?.liked));
      setLikesCount(Number(data?.data?.likesCount ?? likesCount));
    } catch (err) {
      setMessage(err.message);
    }
  };

  const addComment = async () => {
    if (!authUser || !selectedVideoId) {
      setMessage("Login to comment");
      return;
    }
    if (!commentDraft.trim()) return;
    try {
      const data = await apiRequest(`/videos/${selectedVideoId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentDraft }),
      });
      setComments((prev) => [data?.data, ...prev].filter(Boolean));
      setCommentDraft("");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const deleteComment = async (commentId) => {
    if (!authUser) return;
    try {
      await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c?._id !== commentId));
    } catch (err) {
      setMessage(err.message);
    }
  };

  const subscribeToChannel = async (channelId) => {
    if (!authUser) {
      setMessage("Login to subscribe");
      return;
    }
    try {
      const data = await apiRequest(`/channels/${channelId}/subscribe`, {
        method: "POST",
      });
      setChannelSubscribed(true);
      setChannelSubscribersCount(Number(data?.data?.subscribersCount ?? 0));
    } catch (err) {
      setMessage(err.message);
    }
  };

  const unsubscribeFromChannel = async (channelId) => {
    if (!authUser) return;
    try {
      const data = await apiRequest(`/channels/${channelId}/unsubscribe`, {
        method: "POST",
      });
      setChannelSubscribed(false);
      setChannelSubscribersCount(Number(data?.data?.subscribersCount ?? 0));
    } catch (err) {
      setMessage(err.message);
    }
  };

  const loadMySubscriptions = async () => {
    if (!authUser) {
      setMySubscriptions([]);
      return;
    }
    try {
      const data = await apiRequest("/users/me/subscriptions?page=1&limit=50");
      setMySubscriptions(data?.data?.docs || []);
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    fetchVideos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showUploadPanel =
    authUser && (authUser.role === "creator" || authUser.role === "admin");

  return (
    <div style={appShell}>
      {/* Top bar (YouTube-like) */}
      <header style={topBar}>
        <div style={topLeft}>
          <div style={logoCircle}>▶</div>
          <span style={logoText}>PlayNow</span>
        </div>

        <div style={searchBox}>
          <input
            style={searchInput}
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
          <button style={searchButton} onClick={runSearch} type="button">
            🔍
          </button>
        </div>

        <div style={topRight}>
          {authUser ? (
            <>
              <div style={userBadge}>
                <span style={{ fontWeight: 600 }}>{authUser.username}</span>
                <span style={userRole}>{authUser.role || "user"}</span>
              </div>
              <button onClick={handleLogout} style={secondaryButton}>
                Logout
              </button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              Sign in to upload and manage videos
            </span>
          )}
        </div>
      </header>

      <div style={layout}>
        {/* Sidebar */}
        <aside style={sidebar}>
          <div style={sidebarSection}>
            <SidebarItem
              label="Home"
              active={view === "home"}
              onClick={() => setView("home")}
            />
            <SidebarItem
              label="Subscriptions"
              active={view === "subscriptions"}
              onClick={() => {
                setView("subscriptions");
                loadMySubscriptions();
              }}
            />
            <SidebarItem label="Library" />
          </div>
          <div style={sidebarSection}>
            <div style={sidebarHeading}>Account</div>
            {authUser ? (
              <>
                <SidebarItem label={`Signed in as ${authUser.username}`} />
                <SidebarItem
                  label={`Role: ${authUser.role || "user"}`}
                  subtle
                />
              </>
            ) : (
              <SidebarItem label="Guest" subtle />
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={main}>
          {/* Auth or upload bar */}
          {!authUser ? (
            <section style={card}>
              <div style={cardHeader}>
                <h2 style={cardTitle}>Welcome to PlayNow</h2>
                <div style={pillSwitch}>
                  <button
                    onClick={() => setAuthMode("login")}
                    style={{
                      ...pillButton,
                      ...(authMode === "login" ? pillButtonActive : {}),
                    }}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setAuthMode("register")}
                    style={{
                      ...pillButton,
                      ...(authMode === "register" ? pillButtonActive : {}),
                    }}
                  >
                    Register
                  </button>
                </div>
              </div>

              <form
                onSubmit={authMode === "register" ? handleRegister : handleLogin}
                style={formGrid}
              >
                {authMode === "register" && (
                  <>
                    <FormField label="Full name" name="fullName">
                      <input
                        name="fullName"
                        value={authForm.fullName}
                        onChange={handleAuthChange}
                        style={input}
                        required
                      />
                    </FormField>
                    <FormField label="Username" name="username">
                      <input
                        name="username"
                        value={authForm.username}
                        onChange={handleAuthChange}
                        style={input}
                        required
                      />
                    </FormField>
                  </>
                )}

                <FormField label="Email" name="email">
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    style={input}
                    required
                  />
                </FormField>
                <FormField label="Password" name="password">
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    style={input}
                    required
                  />
                </FormField>

                <button type="submit" style={primaryButton}>
                  {authMode === "login" ? "Login" : "Create account"}
                </button>
              </form>
            </section>
          ) : (
            showUploadPanel && (
              <section style={card}>
                <div style={cardHeader}>
                  <h2 style={cardTitle}>Upload video</h2>
                  <span style={mutedText}>
                    Creator / admin only. New uploads appear in the feed for
                    everyone.
                  </span>
                </div>
                <form onSubmit={handleVideoUpload} style={uploadGrid}>
                  <FormField label="Title" name="title">
                    <input
                      name="title"
                      value={upload.title}
                      onChange={handleUploadChange}
                      style={input}
                      required
                    />
                  </FormField>
                  <FormField label="Description" name="description">
                    <input
                      name="description"
                      value={upload.description}
                      onChange={handleUploadChange}
                      style={input}
                      required
                    />
                  </FormField>
                  <FormField label="Duration (seconds)" name="duration">
                    <input
                      name="duration"
                      value={upload.duration}
                      onChange={handleUploadChange}
                      style={input}
                      required
                    />
                  </FormField>
                  <FormField label="Video file" name="videoFile">
                    <input
                      type="file"
                      name="videoFile"
                      accept="video/*"
                      onChange={handleUploadChange}
                      style={fileInput}
                      required
                    />
                  </FormField>
                  <FormField label="Thumbnail" name="thumbnail">
                    <input
                      type="file"
                      name="thumbnail"
                      accept="image/*"
                      onChange={handleUploadChange}
                      style={fileInput}
                      required
                    />
                  </FormField>
                  <button type="submit" style={primaryButton}>
                    Upload
                  </button>
                </form>
              </section>
            )
          )}

          {view === "home" ? (
            <>
              {selectedVideoId && (
                <section style={card}>
                  <div style={cardHeader}>
                    <h2 style={cardTitle}>Video</h2>
                    <button
                      onClick={() => {
                        setSelectedVideoId(null);
                        setSelectedVideo(null);
                        setComments([]);
                      }}
                      style={secondaryButton}
                    >
                      Close
                    </button>
                  </div>

                  {selectedVideo ? (
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <a
                          href={selectedVideo.videoFile}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#93c5fd" }}
                        >
                          Open video
                        </a>
                        <span style={mutedText}>
                          Likes: <b>{likesCount}</b>
                        </span>
                        <button onClick={toggleLike} style={secondaryButton}>
                          {liked ? "Unlike" : "Like"}
                        </button>

                        {selectedVideo?.owner?._id &&
                          authUser?._id !== selectedVideo.owner._id && (
                            <>
                              <button
                                onClick={() =>
                                  channelSubscribed
                                    ? unsubscribeFromChannel(selectedVideo.owner._id)
                                    : subscribeToChannel(selectedVideo.owner._id)
                                }
                                style={secondaryButton}
                              >
                                {channelSubscribed ? "Subscribed" : "Subscribe"}
                              </button>
                              <span style={mutedText}>
                                Subscribers: <b>{channelSubscribersCount}</b>
                              </span>
                            </>
                          )}
                      </div>

                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {selectedVideo.title}
                        </div>
                        <div style={mutedText}>{selectedVideo.description}</div>
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>Comments</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            style={{ ...input, flex: 1 }}
                            placeholder="Add a comment..."
                          />
                          <button onClick={addComment} style={secondaryButton}>
                            Post
                          </button>
                        </div>
                        {comments?.length ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {comments.map((c) => {
                              const canDelete =
                                authUser &&
                                (authUser.role === "admin" ||
                                  authUser._id === c?.user?._id);
                              return (
                                <div
                                  key={c._id}
                                  style={{
                                    border: "1px solid #111827",
                                    borderRadius: 12,
                                    padding: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 8,
                                    }}
                                  >
                                    <div style={{ fontSize: 13 }}>
                                      <b>{c?.user?.username || "user"}</b>{" "}
                                      <span style={{ color: "#6b7280" }}>
                                        {new Date(c.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    {canDelete && (
                                      <button
                                        onClick={() => deleteComment(c._id)}
                                        style={secondaryButton}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 13 }}>
                                    {c.content}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={mutedText}>No comments yet.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={mutedText}>Loading...</div>
                  )}
                </section>
              )}

              {/* Video grid */}
              <section style={card}>
                <div style={cardHeader}>
                  <h2 style={cardTitle}>Videos</h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() =>
                        isSearchMode
                          ? fetchSearch(searchQuery.trim(), Math.max(1, page - 1))
                          : fetchVideos(Math.max(1, page - 1))
                      }
                      style={secondaryButton}
                    >
                      ◀
                    </button>
                    <span style={mutedText}>
                      {isSearchMode ? "Results" : "Page"} {page}
                    </span>
                    <button
                      onClick={() =>
                        isSearchMode
                          ? fetchSearch(searchQuery.trim(), page + 1)
                          : fetchVideos(page + 1)
                      }
                      style={secondaryButton}
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => (isSearchMode ? runSearch() : fetchVideos(1))}
                      style={secondaryButton}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {videos && videos.length > 0 ? (
                  <div style={videoGrid}>
                    {videos.map((v) => (
                      <article key={v._id} style={videoCard}>
                        <button
                          onClick={() => openVideo(v._id)}
                          style={{ padding: 0, border: "none", background: "transparent" }}
                          title="Open"
                        >
                          <div style={thumbWrapper}>
                            <img src={v.thumbnail} alt={v.title} style={thumbImage} />
                          </div>
                        </button>
                        <div style={videoMeta}>
                          <div style={videoTitle}>{v.title}</div>
                          <div style={videoDescription}>{v.description}</div>
                          <div style={videoMetaBottom}>
                            <span>{Math.round(v.duration)}s</span>
                            <span>Views: {v.views ?? 0}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p style={mutedText}>
                    No videos yet. Once creators upload, they will appear here for
                    everyone.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section style={card}>
              <div style={cardHeader}>
                <h2 style={cardTitle}>My subscriptions</h2>
                <button onClick={loadMySubscriptions} style={secondaryButton}>
                  Refresh
                </button>
              </div>

              {!authUser ? (
                <p style={mutedText}>Login to see your subscriptions.</p>
              ) : mySubscriptions?.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {mySubscriptions.map((s) => (
                    <div
                      key={s._id}
                      style={{
                        border: "1px solid #111827",
                        borderRadius: 12,
                        padding: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {s?.channel?.username || "channel"}
                        </div>
                        <div style={mutedText}>{s?.channel?.fullName || ""}</div>
                      </div>
                      <button
                        onClick={() => unsubscribeFromChannel(s?.channel?._id)}
                        style={secondaryButton}
                      >
                        Unsubscribe
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={mutedText}>You haven’t subscribed to any channels yet.</p>
              )}
            </section>
          )}

          {message && (
            <p style={{ ...mutedText, marginTop: 8 }}>Status: {message}</p>
          )}
        </main>
      </div>
    </div>
  );
}

function FormField({ label, name, children }) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function SidebarItem({ label, active, subtle, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "0.35rem 0.75rem",
        borderRadius: 999,
        fontSize: 13,
        cursor: "pointer",
        color: subtle ? "#9ca3af" : "#e5e7eb",
        background: active ? "#1f2937" : "transparent",
      }}
    >
      {label}
    </div>
  );
}

// Layout styles
const appShell = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#020617",
  color: "#e5e7eb",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const topBar = {
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 1.5rem",
  borderBottom: "1px solid #111827",
  background: "#020617e6",
  backdropFilter: "blur(10px)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const topLeft = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const logoCircle = {
  width: 28,
  height: 28,
  borderRadius: "999px",
  background: "#dc2626",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
};

const logoText = {
  fontWeight: 700,
  fontSize: 18,
};

const searchBox = {
  flex: 1,
  maxWidth: 480,
  display: "flex",
  alignItems: "center",
};

const searchInput = {
  flex: 1,
  padding: "0.4rem 0.75rem",
  borderRadius: "999px 0 0 999px",
  border: "1px solid #1f2937",
  background: "#020617",
  color: "#e5e7eb",
  outline: "none",
  fontSize: 13,
};

const searchButton = {
  padding: "0.4rem 0.75rem",
  borderRadius: "0 999px 999px 0",
  border: "1px solid #1f2937",
  borderLeft: "none",
  background: "#111827",
  color: "#e5e7eb",
  cursor: "pointer",
};

const topRight = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginLeft: 16,
};

const layout = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: 0,
  padding: "1rem 1.5rem 2rem",
};

const sidebar = {
  paddingRight: 16,
  borderRight: "1px solid #111827",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const sidebarSection = {
  display: "grid",
  gap: 4,
};

const sidebarHeading = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.08,
  color: "#6b7280",
  marginBottom: 4,
};

const main = {
  paddingLeft: 24,
  display: "grid",
  gap: 16,
};

// Card / form styles
const card = {
  borderRadius: 16,
  border: "1px solid #111827",
  background: "#020617",
  padding: 16,
  boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const cardTitle = {
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const uploadGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const field = {
  display: "grid",
  gap: 4,
  fontSize: 13,
};

const fieldLabel = {
  color: "#94a3b8",
};

const input = {
  padding: "0.5rem 0.75rem",
  borderRadius: 10,
  border: "1px solid #1f2937",
  background: "#020617",
  color: "#e5e7eb",
  outline: "none",
  fontSize: 13,
};

const fileInput = {
  color: "#e5e7eb",
  fontSize: 13,
};

const primaryButton = {
  gridColumn: "1 / -1",
  marginTop: 4,
  padding: "0.6rem 1.2rem",
  borderRadius: 999,
  border: "none",
  background: "#2563eb",
  color: "#f9fafb",
  fontWeight: 600,
  cursor: "pointer",
  justifySelf: "flex-start",
};

const secondaryButton = {
  padding: "0.35rem 0.9rem",
  borderRadius: 999,
  border: "1px solid #1f2937",
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 12,
};

const pillSwitch = {
  display: "flex",
  borderRadius: 999,
  border: "1px solid #1f2937",
  padding: 3,
  background: "#020617",
};

const pillButton = {
  flex: 1,
  padding: "0.25rem 0.75rem",
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  fontSize: 13,
  cursor: "pointer",
};

const pillButtonActive = {
  background: "#2563eb",
  color: "#f9fafb",
};

const mutedText = {
  fontSize: 13,
  color: "#9ca3af",
};

// Video grid
const videoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 8,
};

const videoCard = {
  borderRadius: 16,
  border: "1px solid #111827",
  overflow: "hidden",
  background: "#020617",
  display: "flex",
  flexDirection: "column",
};

const thumbWrapper = {
  position: "relative",
  paddingTop: "56.25%", // 16:9
  background: "#020617",
};

const thumbImage = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const videoMeta = {
  padding: "0.6rem 0.7rem 0.7rem",
  display: "grid",
  gap: 4,
};

const videoTitle = {
  fontSize: 14,
  fontWeight: 600,
};

const videoDescription = {
  fontSize: 12,
  color: "#9ca3af",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const videoMetaBottom = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "#6b7280",
};

const userBadge = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  fontSize: 12,
  lineHeight: 1.3,
};

const userRole = {
  padding: "0.1rem 0.4rem",
  borderRadius: 999,
  border: "1px solid #1f2937",
  color: "#9ca3af",
  marginTop: 2,
};

export default App;