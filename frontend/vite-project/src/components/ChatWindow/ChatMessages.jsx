function ChatMessages({ user }) {
  const messages = [
    // ===== MORNING =====
    { from: "them", type: "text", text: "Hello 👋", time: "10:30 AM" },
    { from: "me", type: "text", text: "Hi!", time: "10:31 AM" },

    // IMAGE (RECEIVE)
    {
      from: "them",
      type: "image",
      url: "https://via.placeholder.com/300x200",
      time: "10:32 AM",
    },
    { from: "me", type: "text", text: "Nice photo 😍", time: "10:33 AM" },

    // IMAGE (SEND)
    {
      from: "me",
      type: "image",
      url: "https://via.placeholder.com/280x180",
      time: "10:34 AM",
    },
    { from: "them", type: "text", text: "Looks great 🔥", time: "10:35 AM" },

    // VIDEO (SEND)
    {
      from: "me",
      type: "video",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      time: "10:36 AM",
    },
    { from: "them", type: "text", text: "Video looks good 👍", time: "10:37 AM" },

    // VIDEO (RECEIVE)
    {
      from: "them",
      type: "video",
      url: "https://www.w3schools.com/html/movie.mp4",
      time: "10:38 AM",
    },
    { from: "me", type: "text", text: "Nice clip 😎", time: "10:39 AM" },

    // FILE (RECEIVE)
    {
      from: "them",
      type: "file",
      fileName: "Project_Report.pdf",
      fileSize: "2.4 MB",
      time: "10:40 AM",
    },
    { from: "me", type: "text", text: "Got it 📎", time: "10:41 AM" },

    // FILE (SEND)
    {
      from: "me",
      type: "file",
      fileName: "Design_Mockup.zip",
      fileSize: "5.1 MB",
      time: "10:42 AM",
    },
    { from: "them", type: "text", text: "Downloading now 👍", time: "10:43 AM" },

    // ===== LONG TEXT =====
    {
      from: "them",
      type: "text",
      text:
        "This is a longer message to test wrapping and alignment. It should stay clean on the left side.",
      time: "11:00 AM",
    },
    {
      from: "me",
      type: "text",
      text:
        "Yes 👍 long messages wrap properly on the right side as well.",
      time: "11:01 AM",
    },

    // ===== EMOJI ONLY =====
    { from: "them", type: "text", text: "😂😂🔥", time: "11:02 AM" },
    { from: "me", type: "text", text: "😎🙌💚", time: "11:03 AM" },

    // ===== EVENING MEDIA =====
    {
      from: "them",
      type: "image",
      url: "https://via.placeholder.com/140x320",
      time: "06:30 PM",
    },
    {
      from: "me",
      type: "image",
      url: "https://via.placeholder.com/320x200",
      time: "06:31 PM",
    },

    {
      from: "them",
      type: "file",
      fileName: "UI_Feedback.docx",
      fileSize: "480 KB",
      time: "06:32 PM",
    },
    {
      from: "me",
      type: "file",
      fileName: "Fixes_Updated.pdf",
      fileSize: "1.2 MB",
      time: "06:33 PM",
    },

    // ===== NIGHT =====
    {
      from: "them",
      type: "text",
      text: "Everything aligns perfectly like WhatsApp 😄",
      time: "09:15 PM",
    },
    { from: "me", type: "text", text: "Mission accomplished 💚", time: "09:16 PM" },
  ];

  return (
    <div
      className="flex-grow-1 overflow-auto"
      style={{ padding: "16px", backgroundColor: "#e5ddd5" }}
    >
      {messages.map((m, i) => {
        const isMe = m.from === "me";

        return (
          <div
            key={i}
            className={`mb-2 d-flex ${
              isMe ? "justify-content-end" : "justify-content-start"
            }`}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "8px",
                borderRadius: isMe
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
                backgroundColor: isMe ? "#dcf8c6" : "#ffffff",
                boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
              }}
            >
              {/* TEXT */}
              {m.type === "text" && <div>{m.text}</div>}

              {/* IMAGE */}
              {m.type === "image" && (
                <img
                  src={m.url}
                  alt="media"
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    marginBottom: "4px",
                  }}
                />
              )}

              {/* VIDEO */}
              {m.type === "video" && (
                <video
                  src={m.url}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    marginBottom: "4px",
                  }}
                />
              )}

              {/* FILE */}
              {m.type === "file" && (
                <div
                  className="d-flex align-items-center"
                  style={{
                    background: "#f1f1f1",
                    padding: "8px",
                    borderRadius: "10px",
                  }}
                >
                  <span style={{ fontSize: "22px", marginRight: "8px" }}>📄</span>
                  <div>
                    <div style={{ fontWeight: "500" }}>{m.fileName}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {m.fileSize}
                    </div>
                  </div>
                </div>
              )}

              {/* TIME */}
              <div
                style={{
                  fontSize: "11px",
                  textAlign: "right",
                  marginTop: "4px",
                  color: "#666",
                }}
              >
                {m.time}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChatMessages;
