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
    <div id="tune" className="fixed bottom-16 right-6 z-30">
      {!showSettings && (
        <button 
          onClick={openSettings}
          className="flex items-center justify-center transition-all duration-200 text-md"
          aria-label="Settings"
        >
          settings
        </button>
      )}
      {showSettings && (
        <div className="linear-card flex flex-col border-l-4 border-accent-green space-between pl-6">
          <button 
            onClick={handleLogout}
            className="text-md flex items-center text-end hover:underline"
          >
            <svg className="mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            logout
          </button>
          <button 
            onClick={cancelSettings}
            className="text-md text-end mt-2 hover:underline"
          >
            reset
          </button>
          <button 
            onClick={saveSettings}
            className="text-md text-end mt-2 hover:underline"
          >
            save
          </button>
        </div>
      )}
    </div>
  )
}

export default Tune 