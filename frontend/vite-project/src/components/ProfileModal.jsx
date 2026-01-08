


import { useState, useRef, useEffect } from "react";

function ProfileModal({ user, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const fileInputRef = useRef(null);

  // Placeholder avatar
  const PLACEHOLDER_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect fill='%23e9ecef' width='120' height='120'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%23adb5bd'/%3E%3Cpath d='M20 100 Q20 70 60 70 Q100 70 100 100' fill='%23adb5bd'/%3E%3C/svg%3E";

  // Sync user data on open
  useEffect(() => {
    if (!user) return;

    const userData = user.user || user;

    setName(userData.name || "");
    setEmail(userData.email || "");
    setAbout(userData.about || "Hey there! I am using Chat");
    setAvatarPreview(userData.avatar || null);
  }, [user]);

  /* =========================
     IMAGE HANDLERS (DUMMY)
     ========================= */
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* =========================
     SAVE (DUMMY)
     ========================= */
  const handleSave = () => {
    if (!name.trim()) {
      alert("Name cannot be empty");
      return;
    }

    const currentUser =
      JSON.parse(localStorage.getItem("currentUser")) || {};

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      email,
      about: about.trim(),
      avatar: avatarPreview || currentUser.avatar,
    };

    localStorage.setItem("currentUser", JSON.stringify(updatedUser));

    alert("✅ Profile updated successfully (dummy)");

    if (onSuccess) onSuccess(updatedUser);

    window.location.reload();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal fade show"
        style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content rounded-4">

            {/* Header */}
            <div className="modal-header border-0">
              <h5 className="modal-title">Profile</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body text-center">

              {/* Profile Image */}
              <img
                src={avatarPreview || PLACEHOLDER_AVATAR}
                className="rounded-circle mb-3"
                width="120"
                height="120"
                alt="Profile"
                style={{
                  cursor: "pointer",
                  objectFit: "cover",
                  backgroundColor: "#f0f0f0",
                }}
                onClick={handleImageClick}
                onError={(e) => (e.target.src = PLACEHOLDER_AVATAR)}
              />

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handleImageChange}
              />

              <small className="text-muted d-block mb-4">
                Click photo to change
              </small>

              {/* EMAIL */}
              <div className="text-start mb-3">
                <label className="form-label text-muted">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  readOnly
                  disabled
                />
                <small className="text-muted">
                  Email cannot be changed
                </small>
              </div>

              {/* NAME */}
              <div className="text-start mb-3">
                <label className="form-label text-muted">
                  Your name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* ABOUT */}
              <div className="text-start">
                <label className="form-label text-muted">
                  About
                </label>
                <textarea
                  rows="2"
                  className="form-control"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell us about yourself"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-0">
              <button
                className="btn btn-success"
                onClick={handleSave}
              >
                Save
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default ProfileModal;
