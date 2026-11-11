import { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Map, FileText, Settings, Building2, Users, FolderOpen } from 'lucide-react';
import Proveedores from './Proveedores';
import Agentes from './Agentes';
import Expedientes from './Expedientes';

export default function Dashboard() {
  const [vistaActual, setVistaActual] = useState('inicio');

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Menú Lateral (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Map className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold">Importa SaaS</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setVistaActual('inicio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${vistaActual === 'inicio' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <FileText className="w-5 h-5" /> Inicio
          </button>
          
          <button 
            onClick={() => setVistaActual('expedientes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${vistaActual === 'expedientes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <FolderOpen className="w-5 h-5" /> Expedientes
          </button>

          <button 
            onClick={() => setVistaActual('proveedores')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${vistaActual === 'proveedores' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Building2 className="w-5 h-5" /> Proveedores
          </button>

          <button 
            onClick={() => setVistaActual('agentes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${vistaActual === 'agentes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Users className="w-5 h-5" /> Agentes de Carga
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => signOut(auth).then(() => window.location.reload())}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">{vistaActual}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Conectado a Firebase
          </div>
        </header>

        <div className="p-8 flex-1 overflow-auto">
          {vistaActual === 'inicio' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Bienvenido a tu centro de operaciones!</h2>
              <p className="text-slate-500 mb-8">Selecciona una opción del menú lateral para comenzar a trabajar.</p>
            </div>
          )}

          {vistaActual === 'expedientes' && <Expedientes />}
          {vistaActual === 'proveedores' && <Proveedores />}
          {vistaActual === 'agentes' && <Agentes />}
        </div>
      </main>
    </div>
  );
}