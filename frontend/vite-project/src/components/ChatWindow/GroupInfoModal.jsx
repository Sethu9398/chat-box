import { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearSelectedGroup } from "../../features/chat/chatSlice";
import default_profile from "../../../../../Asset/userDB.avif";
import { useGetMessagesQuery } from "../../features/messages/messageApi";
import { useGetUsersQuery } from "../../features/chat/chatApi";
import {
  useLeaveGroupMutation,
  useDeleteGroupMutation,
  useUpdateGroupMutation,
  useAddMembersMutation,
  useRemoveMemberMutation,
} from "../../features/chat/chatApi";

function GroupInfoModal({ group, onClose }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  /* ================= MUTATIONS ================= */
  const [leaveGroupMutation, { isLoading: isLeavingGroup }] = useLeaveGroupMutation();
  const [deleteGroupMutation, { isLoading: isDeletingGroup }] = useDeleteGroupMutation();
  const [updateGroupMutation, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation();
  const [addMembersMutation, { isLoading: isAddingMembers }] = useAddMembersMutation();
  const [removeMemberMutation, { isLoading: isRemovingMember }] = useRemoveMemberMutation();

  /* ================= CURRENT USER ROLE ================= */
  const isAdmin = group?.admins?.some((admin) => {
    const adminId = admin._id ? admin._id.toString() : admin.toString();
    const userId = currentUser?._id ? currentUser._id.toString() : currentUser._id;
    return adminId === userId;
  });
  const isMember = group?.members?.some((member) => {
    const memberId = member._id ? member._id.toString() : member.toString();
    const userId = currentUser?._id ? currentUser._id.toString() : currentUser._id;
    return memberId === userId;
  });

  /* ================= CHAT MESSAGES ================= */
  const { data: messageResponse } = useGetMessagesQuery(group?._id, {
    skip: !group?._id,
  });

  const messages = Array.isArray(messageResponse)
    ? messageResponse
    : Array.isArray(messageResponse?.messages)
      ? messageResponse.messages
      : [];

  /* ================= MEDIA EXTRACTION ================= */
  const {
    allMedia,
    previewMedia,
    documents,
  } = useMemo(() => {
    if (!messages.length) {
      return { allMedia: [], previewMedia: [], documents: [] };
    }

    const sorted = [...messages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const media = sorted.filter(
      (m) =>
        (m.type === "image" || m.type === "video") &&
        typeof m.mediaUrl === "string" &&
        m.mediaUrl.trim()
    );

    return {
      allMedia: media,
      previewMedia: media.slice(0, 3),
      documents: sorted.filter(
        (m) => m.type === "file" && m.mediaUrl
      ),
    };
  }, [messages]);

  const hasMedia = allMedia.length || documents.length;

  /* ================= UI STATE ================= */
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMediaView, setIsMediaView] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const [preview, setPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);

  /* ================= EDIT FORM STATE ================= */
  const [editName, setEditName] = useState(group?.name || "");
  const [editAvatar, setEditAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(
    typeof group?.avatar === "string" && group.avatar.trim()
      ? group.avatar
      : default_profile
  );

  /* ================= GET ALL USERS FOR MEMBER SELECTION ================= */
  const { data: allUsers } = useGetUsersQuery();

  /* ================= AVAILABLE USERS TO ADD ================= */
  const availableUsers = useMemo(() => {
    if (!Array.isArray(allUsers)) return [];
    return allUsers.filter(
      user => !group?.members?.some(m => m._id === user._id)
    );
  }, [allUsers, group?.members]);

  const [selectedNewMembers, setSelectedNewMembers] = useState([]);

  /* ================= HANDLERS ================= */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatar(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewAvatar(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await updateGroupMutation({
        groupId: group._id,
        name: editName,
        avatar: editAvatar,
      }).unwrap();
      setIsEditMode(false);
      setEditAvatar(null);
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;
    try {
      await addMembersMutation({
        groupId: group._id,
        memberIds: selectedNewMembers,
      }).unwrap();
      setShowAddMembers(false);
      setSelectedNewMembers([]);
    } catch (error) {
      console.error("Error adding members:", error);
      alert("Failed to add members");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMemberMutation({
        groupId: group._id,
        memberId,
      }).unwrap();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroupMutation(group._id).unwrap();
      dispatch(clearSelectedGroup());
      onClose();
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupMutation(group._id).unwrap();
      dispatch(clearSelectedGroup());
      onClose();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ background: "rgba(0,0,0,0.4)", zIndex: 1050 }}
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className="position-fixed top-50 start-50 translate-middle bg-white rounded shadow-lg"
        style={{ width: "90%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", zIndex: 1060 }}
      >
        {/* HEADER */}
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <strong>
            {isMediaView ? "Media and docs" : isEditMode ? "Edit group" : "Group info"}
          </strong>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              if (isMediaView) {
                setIsMediaView(false);
              } else if (isEditMode) {
                setIsEditMode(false);
                setEditAvatar(null);
              } else {
                onClose();
              }
            }}
          >
            {isMediaView || isEditMode ? "←" : "✕"}
          </button>
        </div>

        {/* ================= EDIT MODE ================= */}
        {isEditMode && !isMediaView && (
          <>
            {/* AVATAR EDIT */}
            <div className="p-4 text-center border-bottom">
              <div className="position-relative d-inline-block mb-3">
                <img
                  src={previewAvatar}
                  width="120"
                  height="120"
                  className="rounded-circle"
                  alt="Group"
                  onError={(e) => (e.currentTarget.src = default_profile)}
                />
                <label
                  className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2"
                  style={{ cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* NAME EDIT */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control form-control-lg text-center"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Group name"
                />
              </div>

              <small className="text-muted d-block">
                {group?.members?.length || 0} members
              </small>
            </div>

            {/* SAVE BUTTON */}
            <div className="p-3 border-top">
              <button
                className="btn btn-primary w-100"
                disabled={isUpdatingGroup || !editName.trim()}
                onClick={handleSaveChanges}
              >
                {isUpdatingGroup ? "Saving..." : "Save changes"}
              </button>
            </div>
          </>
        )}

        {/* ================= GROUP INFO VIEW ================= */}
        {!isEditMode && !isMediaView && (
          <>
            {/* GROUP AVATAR & NAME */}
            <div className="p-4 text-center border-bottom">
              <img
                src={previewAvatar}
                width="120"
                height="120"
                className="rounded-circle mb-3"
                alt="Group"
                onError={(e) => (e.currentTarget.src = default_profile)}
              />
              <h5 className="mb-2">{group?.name || "Group"}</h5>
              <p className="text-muted small mb-0">
                {group?.members?.length || 0} members
              </p>

              {/* EDIT BUTTON (ADMIN ONLY) */}
              {isAdmin && (
                <button
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={() => setIsEditMode(true)}
                >
                  Edit group
                </button>
              )}
            </div>

            {/* MEMBERS LIST */}
            <div className="px-3 py-2">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <small className="text-muted">
                  <strong>Members</strong>
                </small>
                {isAdmin && (
                  <button
                    className="btn btn-sm btn-link p-0 text-primary"
                    onClick={() => setShowAddMembers(true)}
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="list-group list-group-flush">
                {group?.members?.map((member) => {
                  const memberAvatar =
                    typeof member.avatar === "string" && member.avatar.trim()
                      ? member.avatar
                      : default_profile;
                  const memberIsAdmin = group?.admins?.some((admin) => {
                    const adminId = admin._id ? admin._id.toString() : admin.toString();
                    const memId = member._id ? member._id.toString() : member.toString();
                    return adminId === memId;
                  });

                  return (
                    <div
                      key={member._id}
                      className="list-group-item px-0 py-2 d-flex align-items-center justify-content-between"
                    >
                      <div className="d-flex align-items-center">
                        <img
                          src={memberAvatar}
                          width="40"
                          height="40"
                          className="rounded-circle me-2"
                          alt={member.name}
                          onError={(e) => (e.currentTarget.src = default_profile)}
                        />
                        <div>
                          <small className="d-block">
                            <strong>{member.name}</strong>
                          </small>
                          {memberIsAdmin && (
                            <small className="text-muted">Admin</small>
                          )}
                        </div>
                      </div>
                      {isAdmin && member._id !== currentUser?._id && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={isRemovingMember}
                          onClick={() => handleRemoveMember(member._id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MEDIA SECTION */}
            {hasMedia && (
              <>
                <hr className="my-2" />
                <div
                  className="px-3 text-muted small mb-2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setIsMediaView(true)}
                >
                  Media, links and docs
                </div>

                {/* PREVIEW ROW */}
                <div className="px-3 d-flex gap-2 mb-3">
                  {previewMedia.map((m) =>
                    m.type === "image" ? (
                      <img
                        key={m._id}
                        src={m.mediaUrl}
                        className="rounded"
                        style={{
                          width: 70,
                          height: 70,
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setIsMediaView(true);
                          setPreview(m);
                        }}
                      />
                    ) : (
                      <div
                        key={m._id}
                        className="position-relative"
                        style={{ width: 70, height: 70, cursor: "pointer" }}
                        onClick={() => {
                          setIsMediaView(true);
                          setPreview(m);
                        }}
                      >
                        <video
                          src={m.mediaUrl}
                          muted
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                        <div className="position-absolute top-50 start-50 translate-middle text-white">
                          ▶
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}

            {/* ACTION BUTTONS */}
            <div className="border-top p-3 d-flex flex-column gap-2">
              {isAdmin && (
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  disabled={isDeletingGroup}
                  onClick={() => setShowConfirm("delete")}
                >
                  {isDeletingGroup ? "Deleting..." : "Delete group"}
                </button>
              )}
              {!isAdmin && isMember && (
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  disabled={isLeavingGroup}
                  onClick={() => setShowConfirm("leave")}
                >
                  {isLeavingGroup ? "Leaving..." : "Leave group"}
                </button>
              )}
            </div>
          </>
        )}

        {/* ================= MEDIA VIEW ================= */}
        {isMediaView && (
          <>
            {/* TABS */}
            <div className="d-flex border-bottom">
              {["media", "docs"].map((t) => (
                <button
                  key={t}
                  className={`flex-fill py-2 border-0 bg-transparent ${
                    activeTab === t
                      ? "border-bottom border-primary border-2"
                      : ""
                  }`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "media" ? "Media" : "Docs"}
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* ALL MEDIA */}
              {activeTab === "media" && (
                <div className="d-flex flex-wrap gap-2">
                  {allMedia.length ? (
                    allMedia.map((m) =>
                      m.type === "image" ? (
                        <img
                          key={m._id}
                          src={m.mediaUrl}
                          className="rounded"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreview(m)}
                        />
                      ) : (
                        <div
                          key={m._id}
                          className="position-relative"
                          style={{ width: 80, height: 80 }}
                          onClick={() => setPreview(m)}
                        >
                          <video
                            src={m.mediaUrl}
                            muted
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                          <div className="position-absolute top-50 start-50 translate-middle text-white">
                            ▶
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-muted text-center w-100">
                      No media available
                    </p>
                  )}
                </div>
              )}

              {/* ALL DOCS */}
              {activeTab === "docs" && (
                <>
                  {documents.length ? (
                    documents.map((m) => (
                      <div
                        key={m._id}
                        className="d-flex align-items-center mb-2"
                      >
                        <div
                          className="flex-grow-1 me-2 text-truncate"
                          style={{ minWidth: 0 }}
                          title={m.fileName}
                        >
                          {m.fileName}
                        </div>

                        <a
                          href={m.mediaUrl}
                          download
                          className="btn btn-sm btn-outline-primary flex-shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-center">No documents</p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ================= PREVIEW ================= */}
      {preview && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 1070 }}
          onClick={() => setPreview(null)}
        >
          {preview.type === "image" ? (
            <img
              src={preview.mediaUrl}
              alt=""
              style={{ maxWidth: "90%", maxHeight: "90%" }}
            />
          ) : (
            <video
              src={preview.mediaUrl}
              controls
              style={{ maxWidth: "90%", maxHeight: "90%" }}
            />
          )}
        </div>
      )}

      {/* ================= ADD MEMBERS MODAL ================= */}
      {showAddMembers && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ background: "rgba(0,0,0,0.4)", zIndex: 1075 }}
            onClick={() => setShowAddMembers(false)}
          />
          <div
            className="position-fixed top-50 start-50 translate-middle bg-white rounded shadow-lg"
            style={{ width: "90%", maxWidth: 400, maxHeight: "80vh", overflowY: "auto", zIndex: 1085 }}
          >
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
              <strong>Add members</strong>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedNewMembers([]);
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-3">
              {availableUsers.length > 0 ? (
                <>
                  <div className="list-group list-group-flush mb-3">
                    {availableUsers.map((user) => {
                      const userAvatar =
                        typeof user.avatar === "string" && user.avatar.trim()
                          ? user.avatar
                          : default_profile;
                      const isSelected = selectedNewMembers.includes(user._id);

                      return (
                        <div
                          key={user._id}
                          className="list-group-item px-0 py-2 d-flex align-items-center"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setSelectedNewMembers(prev =>
                              prev.includes(user._id)
                                ? prev.filter(id => id !== user._id)
                                : [...prev, user._id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={isSelected}
                            readOnly
                          />
                          <img
                            src={userAvatar}
                            width="36"
                            height="36"
                            className="rounded-circle me-2"
                            alt={user.name}
                            onError={(e) => (e.currentTarget.src = default_profile)}
                          />
                          <div>
                            <small className="d-block">{user.name}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="btn btn-primary w-100 btn-sm"
                    disabled={selectedNewMembers.length === 0 || isAddingMembers}
                    onClick={handleAddMembers}
                  >
                    {isAddingMembers
                      ? "Adding..."
                      : `Add ${selectedNewMembers.length} member${selectedNewMembers.length !== 1 ? "s" : ""}`}
                  </button>
                </>
              ) : (
                <p className="text-muted text-center">No users available to add</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================= CONFIRMATION DIALOG ================= */}
      {showConfirm && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ background: "rgba(0,0,0,0.4)", zIndex: 1080 }}
            onClick={() => setShowConfirm(null)}
          />
          <div
            className="position-fixed top-50 start-50 translate-middle bg-white rounded shadow-lg p-4"
            style={{ width: "90%", maxWidth: 300, zIndex: 1090 }}
          >
            <h6 className="mb-3">
              {showConfirm === "leave"
                ? "Leave this group?"
                : "Delete this group?"}
            </h6>
            <p className="text-muted small mb-4">
              {showConfirm === "leave"
                ? "You will no longer see messages from this group."
                : "This action cannot be undone. All messages will be deleted."}
            </p>
            <div className="d-flex gap-2">
              <button
                className="btn btn-secondary btn-sm flex-grow-1"
                onClick={() => setShowConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm flex-grow-1"
                disabled={isLeavingGroup || isDeletingGroup}
                onClick={() => {
                  if (showConfirm === "leave") {
                    handleLeaveGroup();
                  } else {
                    handleDeleteGroup();
                  }
                }}
              >
                {showConfirm === "leave" ? "Leave" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default GroupInfoModal;
