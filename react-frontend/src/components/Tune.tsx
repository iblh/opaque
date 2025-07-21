import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/lib/types';

interface TuneProps {
  dashboard: Dashboard | null;
  setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
}

const Tune: React.FC<TuneProps> = ({ dashboard, setDashboard }) => {
  const [showSettings, setShowSettings] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    router.push('/login');
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
      <div className="relative">
        {/* Settings button - always visible */}
        <button 
          onClick={openSettings}
          className={`flex items-center justify-center transition-all duration-300 text-sm ${
            showSettings ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Settings"
        >
          Settings
        </button>

        {/* Settings panel - expands from bottom */}
        <div className={`absolute bottom-0 right-0 transition-all duration-300 ease-out ${
          showSettings 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}>
          <div className="linear-card flex flex-col p-4 border-l-4 border-accent-green min-w-[120px]">
            <button 
              onClick={handleLogout}
              className="linear-button-secondary text-xs flex items-center px-3 py-1.5 mb-2"
            >
              <svg className="mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
            <button 
              onClick={cancelSettings}
              className="linear-button-secondary text-xs px-3 py-1.5 mb-2"
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
        </div>
      </div>
    </div>
  )
}

export default Tune 