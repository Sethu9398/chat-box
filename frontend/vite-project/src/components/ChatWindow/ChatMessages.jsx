// import {
//   useEffect,
//   useState,
//   useMemo,
//   useRef,
//   useLayoutEffect,
// } from "react";
// import { useSelector } from "react-redux";
// import socket from "../../socketClient";
// import { useGetMessagesQuery } from "../../features/messages/messageApi";

// function ChatMessages({ chatId }) {
//   const { data = [], isLoading } = useGetMessagesQuery(chatId, {
//     skip: !chatId,
//     refetchOnMountOrArgChange: true,
//   });

//   const me = useSelector((state) => state.auth.user);
//   const [socketMessages, setSocketMessages] = useState([]);
//   const lastMessageRef = useRef(null);

//   /* RESET WHEN CHAT CHANGES */
//   useEffect(() => {
//     setSocketMessages([]);
//   }, [chatId]);

//   /* SOCKET RECEIVE */
//   useEffect(() => {
//     if (!chatId) return;

//     const handler = (msg) => {
//       if (msg.chatId.toString() === chatId) {
//         setSocketMessages((prev) => [...prev, msg]);
//       }
//     };

//     socket.on("new-message", handler);
//     return () => socket.off("new-message", handler);
//   }, [chatId]);

//   /* COMBINE + DEDUPE */
//   const messages = useMemo(() => {
//     const all = [...data, ...socketMessages];
//     const unique = all.filter(
//       (m, i, arr) => arr.findIndex((x) => x._id === m._id) === i
//     );
//     return unique.sort(
//       (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
//     );
//   }, [data, socketMessages]);

//   /* AUTO SCROLL */
//   useLayoutEffect(() => {
//     if (lastMessageRef.current) {
//       lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [messages]);

//   if (isLoading) {
//     return (
//       <div className="text-center mt-3 text-muted">
//         Loading messages...
//       </div>
//     );
//   }

//   /* MEDIA STYLE (UNCHANGED) */
//   const mediaStyle = {
//     maxWidth: "260px",
//     maxHeight: "260px",
//     borderRadius: "8px",
//     objectFit: "cover",
//     cursor: "pointer",
//   };

//   /* ✅ DATE FORMATTER (WHATSAPP STYLE) */
//   const formatDateLabel = (date) => {
//     const msgDate = new Date(date);
//     const today = new Date();
//     const yesterday = new Date();
//     yesterday.setDate(today.getDate() - 1);

//     const isSameDay = (a, b) =>
//       a.getDate() === b.getDate() &&
//       a.getMonth() === b.getMonth() &&
//       a.getFullYear() === b.getFullYear();

//     if (isSameDay(msgDate, today)) return "Today";
//     if (isSameDay(msgDate, yesterday)) return "Yesterday";

//     const diffDays = Math.floor(
//       (today - msgDate) / (1000 * 60 * 60 * 24)
//     );

//     if (diffDays < 7) {
//       return msgDate.toLocaleDateString("en-US", {
//         weekday: "long",
//       });
//     }

//     return msgDate.toLocaleDateString("en-US", {
//       month: "short",
//       day: "numeric",
//       year:
//         msgDate.getFullYear() !== today.getFullYear()
//           ? "numeric"
//           : undefined,
//     });
//   };

//   let lastRenderedDate = null;

//   return (
//     <div
//       className="flex-grow-1 overflow-auto"
//       style={{ padding: "16px", backgroundColor: "#e5ddd5" }}
//     >
//       {messages.map((m, index) => {
//         const isMe = m.sender?._id === me?._id;
//         const messageDate = new Date(m.createdAt).toDateString();
//         const showDate =
//           lastRenderedDate !== messageDate;

//         if (showDate) {
//           lastRenderedDate = messageDate;
//         }

//         return (
//           <div key={m._id}>
//             {/* ✅ DATE SEPARATOR */}
//             {showDate && (
//               <div className="text-center my-2">
//                 <span
//                   style={{
//                     background: "#e1f3fb",
//                     padding: "4px 12px",
//                     borderRadius: "12px",
//                     fontSize: "12px",
//                     color: "#555",
//                     boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
//                   }}
//                 >
//                   {formatDateLabel(m.createdAt)}
//                 </span>
//               </div>
//             )}

//             <div
//               ref={index === messages.length - 1 ? lastMessageRef : null}
//               className={`mb-2 d-flex ${
//                 isMe
//                   ? "justify-content-end"
//                   : "justify-content-start"
//               }`}
//             >
//               <div
//                 style={{
//                   maxWidth: "75%",
//                   padding: "8px",
//                   borderRadius: isMe
//                     ? "18px 18px 4px 18px"
//                     : "18px 18px 18px 4px",
//                   backgroundColor: isMe
//                     ? "#dcf8c6"
//                     : "#ffffff",
//                   boxShadow:
//                     "0 1px 1px rgba(0,0,0,0.15)",
//                 }}
//               >
//                 {/* TEXT */}
//                 {m.type === "text" && <div>{m.text}</div>}

//                 {/* IMAGE */}
//                 {m.type === "image" && m.mediaUrl && (
//                   <img
//                     src={m.mediaUrl}
//                     alt={m.fileName}
//                     style={mediaStyle}
//                     onClick={() =>
//                       window.open(m.mediaUrl, "_blank")
//                     }
//                   />
//                 )}

//                 {/* VIDEO */}
//                 {m.type === "video" && m.mediaUrl && (
//                   <video
//                     src={m.mediaUrl}
//                     controls
//                     style={mediaStyle}
//                   />
//                 )}

//                 {/* FILE */}
//                 {m.type === "file" && m.mediaUrl && (
//                   <a
//                     href={m.mediaUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     style={{
//                       color: "#007bff",
//                       textDecoration: "none",
//                     }}
//                   >
//                     📄 {m.fileName} ({m.fileSize})
//                   </a>
//                 )}

//                 {/* TIME */}
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     textAlign: "right",
//                     marginTop: "4px",
//                     color: "#666",
//                   }}
//                 >
//                   {new Date(m.createdAt).toLocaleTimeString(
//                     [],
//                     {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     }
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// export default ChatMessages;




import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { useSelector } from "react-redux";
import { FaPlay } from "react-icons/fa"; // ✅ PLAY ICON
import socket from "../../socketClient";
import { useGetMessagesQuery } from "../../features/messages/messageApi";

function ChatMessages({ chatId }) {
  const { data = [], isLoading } = useGetMessagesQuery(chatId, {
    skip: !chatId,
    refetchOnMountOrArgChange: true,
  });

  const me = useSelector((state) => state.auth.user);
  const [socketMessages, setSocketMessages] = useState([]);
  const [preview, setPreview] = useState(null);
  const lastMessageRef = useRef(null);

  /* RESET WHEN CHAT CHANGES */
  useEffect(() => {
    setSocketMessages([]);
  }, [chatId]);

  /* SOCKET RECEIVE */
  useEffect(() => {
    if (!chatId) return;

    const handler = (msg) => {
      if (msg?.chatId?.toString() === chatId) {
        setSocketMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [chatId]);

  /* COMBINE + DEDUPE */
  const messages = useMemo(() => {
    const all = [...data, ...socketMessages];
    const unique = all.filter(
      (m, i, arr) => arr.findIndex((x) => x._id === m._id) === i
    );
    return unique.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [data, socketMessages]);

  /* AUTO SCROLL */
  useLayoutEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="text-center mt-3 text-muted">
        Loading messages...
      </div>
    );
  }

  /* MEDIA STYLE (UNCHANGED) */
  const mediaStyle = {
    maxWidth: "260px",
    maxHeight: "260px",
    borderRadius: "8px",
    objectFit: "cover",
    cursor: "pointer",
  };

  /* DATE FORMATTER */
  const formatDateLabel = (date) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (sameDay(msgDate, today)) return "Today";
    if (sameDay(msgDate, yesterday)) return "Yesterday";

    return msgDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        msgDate.getFullYear() !== today.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  let lastRenderedDate = null;

  return (
    <>
      {/* CHAT BODY */}
      <div
        className="flex-grow-1 overflow-auto"
        style={{ padding: "16px", backgroundColor: "#e5ddd5" }}
      >
        {messages.map((m, index) => {
          const isMe = m.sender?._id === me?._id;
          const dateKey = new Date(m.createdAt).toDateString();
          const showDate = lastRenderedDate !== dateKey;
          if (showDate) lastRenderedDate = dateKey;

          return (
            <div key={m._id}>
              {/* DATE SEPARATOR */}
              {showDate && (
                <div className="text-center my-2">
                  <span
                    style={{
                      background: "#e1f3fb",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#555",
                    }}
                  >
                    {formatDateLabel(m.createdAt)}
                  </span>
                </div>
              )}

              <div
                ref={index === messages.length - 1 ? lastMessageRef : null}
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
                  {m.type === "image" && m.mediaUrl && (
                    <img
                      src={m.mediaUrl}
                      alt={m.fileName || "image"}
                      style={mediaStyle}
                      onClick={() => setPreview(m)}
                    />
                  )}

                  {/* VIDEO (WITH REACT-ICON PLAY BUTTON) */}
                  {m.type === "video" && m.mediaUrl && (
                    <div
                      style={{
                        position: "relative",
                        display: "inline-block",
                      }}
                      onClick={() => setPreview(m)}
                    >
                      <video
                        src={m.mediaUrl}
                        style={mediaStyle}
                      />

                      {/* ▶ PLAY ICON */}
                      <FaPlay
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "42px",
                          color: "rgba(255,255,255,0.9)",
                          pointerEvents: "none",
                          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                        }}
                      />
                    </div>
                  )}

                  {/* FILE */}
                  {m.type === "file" && m.mediaUrl && (
                    <div
                      style={{ cursor: "pointer", color: "#007bff" }}
                      onClick={() => setPreview(m)}
                    >
                      📄 {m.fileName}
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
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PREVIEW MODAL */}
      {preview && preview.mediaUrl && (
        <>
          <div
            className="modal-backdrop fade show"
            onClick={() => setPreview(null)}
          />

          <div className="modal fade show d-block">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content bg-dark text-white">
                <div className="modal-header border-secondary">
                  <h6 className="modal-title">
                    {preview.fileName || "Preview"}
                  </h6>
                  <button
                    className="btn-close btn-close-white"
                    onClick={() => setPreview(null)}
                  />
                </div>

                <div className="modal-body text-center">
                  {preview.type === "image" && (
                    <img
                      src={preview.mediaUrl}
                      alt={preview.fileName || "image"}
                      style={{ maxWidth: "100%" }}
                    />
                  )}

                  {preview.type === "video" && (
                    <video
                      src={preview.mediaUrl}
                      controls
                      autoPlay
                      style={{ maxWidth: "100%" }}
                    />
                  )}

                  {preview.type === "file" && (
                    <>
                      <p>{preview.fileName}</p>
                      <p>{preview.fileSize}</p>
                      <a
                        href={preview.mediaUrl}
                        download
                        className="btn btn-success"
                      >
                        Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default ChatMessages;
