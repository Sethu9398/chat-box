import React, { useState } from 'react';
import { useGetUsersQuery, useGetOrCreateChatMutation } from '../features/chat/chatApi';
import { useDispatch } from 'react-redux';
import { setSelectedUser } from '../features/chat/chatSlice';
import defaultprofile from "../../../../Asset/userDB.avif";

const UserSelectionModal = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading } = useGetUsersQuery();
  const [getOrCreateChat] = useGetOrCreateChatMutation();
  const dispatch = useDispatch();

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = async (user) => {
    try {
      await getOrCreateChat(user._id).unwrap();
      dispatch(setSelectedUser(user));
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Start New Chat</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
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
                    onClick={() => handleSelectUser(user)}
                  >
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelectionModal;
