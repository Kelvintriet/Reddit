import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './layout/Header'
import Sidebar from './layout/Sidebar'

const Layout: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <Outlet />
      </main>
        </div>
    </div>
  )
}

export default Layout 