import React, { useState, useRef } from 'react';
import { useGetUsersQuery, useCreateGroupMutation } from '../features/chat/chatApi';
import { useDispatch } from 'react-redux';
import { setSelectedGroup } from '../features/chat/chatSlice';
import defaultprofile from "../../../../Asset/userDB.avif";

const GroupCreationModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { data: users = [], isLoading } = useGetUsersQuery();
  const [createGroup] = useCreateGroupMutation();
  const dispatch = useDispatch();

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleUser = (user) => {
    setSelectedUsers(prev =>
      prev.includes(user._id)
        ? prev.filter(id => id !== user._id)
        : [...prev, user._id]
    );
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setAvatar(selected);
    setAvatarPreview(URL.createObjectURL(selected));
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      alert('Group name is required and at least 2 users must be selected.');
      return;
    }
    try {
      const newGroup = await createGroup({
        name: groupName,
        members: selectedUsers,
        avatar: avatar
      }).unwrap();
      dispatch(setSelectedGroup(newGroup));
      onClose();
      setGroupName('');
      setSelectedUsers([]);
      setAvatar(null);
      setAvatarPreview(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Group</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="d-flex flex-column align-items-center mb-3">
              <img
                src={avatarPreview || defaultprofile}
                alt="Group Avatar"
                className="rounded-circle mb-2"
                style={{ width: '80px', height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={handleImageClick}
              />
            </div>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isLoading ? (
              <p>Loading users...</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredUsers.map(user => (
                  <div
                    key={user._id}
                    className="d-flex align-items-center p-2 border-bottom"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleUser(user)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleToggleUser(user)}
                      className="me-2"
                    />
                    <img
                      src={user.avatar || defaultprofile}
                      width="40"
                      height="40"
                      className="rounded-circle me-2"
                      alt=""
                    />
                    <div>
                      <strong>{user.name}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateGroup}>
              Create Group
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="d-none"
        accept="image/*"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default GroupCreationModal;
