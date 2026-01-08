import { useState } from 'react'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './Pages/Home.jsx'
import Login from './Pages/Login.jsx'
import Signup from './Pages/Signup.jsx'
import ProtectedRoute from './Routes/ProctectedRoute.jsx'
import PublicRoute from './Routes/PublicRoute.jsx'


function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <BrowserRouter>

        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
          </Route>

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
        </Routes>

      </BrowserRouter>

    </div>
  )
}

export default App
