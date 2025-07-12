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
    <div id="tune" className="fixed bottom-8 right-8 z-30">
      {!showSettings && (
        <button 
          onClick={openSettings}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated border border-border-light shadow-elevated hover:shadow-floating transition-all duration-200"
          aria-label="Settings"
        >
          <svg className="h-4 w-4 text-text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
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