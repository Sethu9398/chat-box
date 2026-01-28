import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useUploadMessageMutation } from "../../features/messages/messageApi";
import { chatApi } from "../../features/chat/chatApi";
import socket from "../../socketClient";

function AttachmentComposer({ chatId, isGroup, replyTo, onClose }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const me = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [uploadMessage, { isLoading }] = useUploadMessageMutation();

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);

    if (
      selected.type.startsWith("image") ||
      selected.type.startsWith("video")
    ) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }

    // Emit start-typing when selecting file
    socket.emit("start-typing", { chatId, userId: me._id });
  };

  const sendFile = async () => {
    if (!file || !chatId) return;

    const type = file.type.startsWith("image")
      ? "image"
      : file.type.startsWith("video")
      ? "video"
      : "file";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);
    formData.append("type", type);
    if (replyTo) formData.append("replyTo", replyTo._id);

    try {
      await uploadMessage(formData).unwrap();
      // Stop typing when sending file
      socket.emit("stop-typing", { chatId, userId: me._id });

      // Update sidebar cache for group chats
      if (isGroup) {
        const mediaText = type === "image" ? "📷 Photo" : type === "video" ? "🎥 Video" : "📎 File";
        dispatch(chatApi.util.updateQueryData('getMyGroups', undefined, (draft) => {
          const group = draft.find(g => g._id === chatId);
          if (group) {
            group.lastMessage = `You: ${mediaText}`;
            group.lastMessageCreatedAt = new Date().toISOString();
          }
        }));
      }

      // Clear inputs after successful send
      setFile(null);
      setPreview(null);
      if (preview) URL.revokeObjectURL(preview);
      fileInputRef.current.value = '';
      onClose(); // ✅ close modal safely
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    }
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        className="modal-backdrop fade show"
        onClick={() => {
          socket.emit("stop-typing", { chatId, userId: me._id });
          onClose();
        }}
      />

      {/* MODAL */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content bg-dark text-white">

            {/* HEADER */}
            <div className="modal-header border-secondary">
              <h5 className="modal-title">Send attachment</h5>
              <button
                className="btn-close btn-close-white"
                onClick={onClose}
              />
            </div>

            {/* BODY */}
            <div className="modal-body d-flex align-items-center justify-content-center">
              {!file && (
                <button
                  className="btn btn-outline-light"
                  onClick={() => fileInputRef.current.click()}
                >
                  Choose file
                </button>
              )}

              {preview && file?.type.startsWith("image") && (
                <img
                  src={preview}
                  alt="preview"
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              )}

              {preview && file?.type.startsWith("video") && (
                <video
                  src={preview}
                  controls
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              )}

              {file && !preview && (
                <div className="text-center">
                  <h5>📄 {file.name}</h5>
                  <small>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>
              )}
            </div>

            {/* FOOTER */}
            {file && (
              <div className="modal-footer border-secondary">
                <button
                  className="btn btn-success w-100"
                  disabled={isLoading}
                  onClick={sendFile}
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FILE INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          className="d-none"
          accept="*/*"
          onChange={handleFileSelect}
        />
      </div>
    </>
  );
}

export default AttachmentComposer;
