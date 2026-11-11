import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  // Estado para saber si el usuario está logueado
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Esta función se la pasaremos al Login
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // Si está logueado, muestra el Dashboard; si no, muestra el Login
  return (
    <div>
      {isLoggedIn ? <Dashboard /> : <Login onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default App;