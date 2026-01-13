import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetUsersQuery, useGetOrCreateChatMutation } from "../../features/chat/chatApi";
import { useSendMessageMutation } from "../../features/messages/messageApi";

function ForwardModal({ message, onClose }) {
  const { data: users = [] } = useGetUsersQuery();
  const [getOrCreateChat] = useGetOrCreateChatMutation();
  const [sendMessage] = useSendMessageMutation();
  const me = useSelector((state) => state.auth.user);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleForward = async () => {
    if (!selectedUsers.length) return;

    try {
      for (const userId of selectedUsers) {
        const chat = await getOrCreateChat(userId).unwrap();
        await sendMessage({
          chatId: chat._id,
          text: message.text,
          type: message.type,
          mediaUrl: message.mediaUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          replyTo: null,
          isForwarded: true,
        }).unwrap();
      }
      onClose();
    } catch (error) {
      console.error("Forward failed:", error);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <>
      {/* BACKDROP */}
      <div className="modal-backdrop fade show" onClick={onClose} />

      {/* MODAL */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Forward Message</h5>
              <button className="btn-close" onClick={onClose} />
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <strong>Message:</strong> {message.text || "Media"}
              </div>

              <div className="mb-3">
                <strong>Select chats to forward to:</strong>
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {users
                  .filter((user) => user._id !== me._id)
                  .map((user) => (
                    <div
                      key={user._id}
                      className={`p-2 border rounded mb-2 cursor-pointer ${
                        selectedUsers.includes(user._id) ? "bg-primary text-white" : ""
                      }`}
                      onClick={() => toggleUser(user._id)}
                    >
                      {user.name}
                    </div>
                  ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleForward}
                disabled={!selectedUsers.length}
              >
                Forward ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ForwardModal;
