import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

interface Dashboard {
  forest: any[];
  username: string;
}

interface TuneProps {
  dashboard: Dashboard;
  setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
}

const Tune: React.FC<TuneProps> = ({ dashboard, setDashboard }) => {
  const [showSettings, setShowSettings] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    Cookies.remove('jwt_token')
    router.push('/login')
  }

  const openSettings = () => {
    setShowSettings(true)
  }

  const saveSettings = () => {
    console.log(dashboard)
    setShowSettings(false)
  }

  const cancelSettings = () => {
    setShowSettings(false)
  }

  return (
    <div id="tune" className="fixed bottom-14 right-6 z-30">
      {!showSettings && (
        <button 
          onClick={openSettings}
          className="flex items-center justify-center transition-all duration-200 text-sm"
          aria-label="Settings"
        >
          Settings
        </button>
      )}
      {showSettings && (
        <div className="linear-card flex items-center space-x-2 p-2">
          <button 
            onClick={handleLogout}
            className="linear-button-secondary text-xs flex items-center px-3 py-1.5"
          >
            <svg className="mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
          <button 
            onClick={cancelSettings}
            className="linear-button-secondary text-xs px-3 py-1.5"
          >
            Reset
          </button>
          <button 
            onClick={saveSettings}
            className="linear-button-primary text-xs px-3 py-1.5"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

export default Tune 