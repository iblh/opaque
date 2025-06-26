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
    <div id="tune">
      {!showSettings && (
        <button onClick={openSettings}>settings</button>
      )}
      {showSettings && (
        <>
          <button onClick={handleLogout}>logout</button>
          <button onClick={cancelSettings}>reset</button>
          <button onClick={saveSettings}>save</button>
        </>
      )}
    </div>
  )
}

export default Tune 