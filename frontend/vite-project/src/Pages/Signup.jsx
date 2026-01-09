import { useSignupMutation } from "../features/auth/authApi";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Signup = () => {
  const [signup, { isLoading }] = useSignupMutation();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
      await signup(formData).unwrap()
      navigate("/login");
    } catch (err) {
      alert(err?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card p-4 shadow" style={{ width: "22rem" }}>
        <h4 className="text-center mb-3">Signup</h4>

        <form onSubmit={handleSubmit}>
          {/* Avatar */}
          <div className="mb-3 text-center">
            <label>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "8px",
                  border: "2px dashed #aaa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  color: "#777",
                  margin: "0 auto",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  "+"
                )}
              </div>
              <input
                type="file"
                name="avatar"
                hidden
                accept="image/*"
                onChange={(e) =>
                  setPreview(URL.createObjectURL(e.target.files[0]))
                }
              />
            </label>
            <div className="text-muted mt-1">Upload Avatar</div>
          </div>

          <input name="name" className="form-control mb-3" placeholder="Name" required />
          <input name="email" type="email" className="form-control mb-3" placeholder="Email" required />
          <input name="password" type="password" className="form-control mb-3" placeholder="Password" required />

          <button className="btn btn-success w-100" disabled={isLoading}>
            {isLoading ? "Signing up..." : "Signup"}
          </button>
        </form>

        <p className="text-center mt-3 mb-0">
          Already have an account?{" "}
          <span className="text-primary" style={{ cursor: "pointer" }} onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
