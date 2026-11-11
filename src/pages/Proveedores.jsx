import { useState, useEffect } from 'react';
import { obtenerProveedores, crearProveedor } from '../services/proveedoresService';
import { Plus, Building2, Globe, DollarSign } from 'lucide-react';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el formulario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('CN');
  const [moneda, setMoneda] = useState('USD');

  // Cargar datos al abrir la pantalla
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const data = await obtenerProveedores();
    setProveedores(data);
    setCargando(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    await crearProveedor({ nombre, pais, moneda });
    // Limpiar formulario y recargar lista
    setNombre('');
    setMostrarModal(false);
    cargarDatos();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Proveedores</h2>
          <p className="text-slate-500">Gestiona tus fábricas y proveedores internacionales.</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 mt-10">Cargando proveedores...</p>
      ) : proveedores.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-xl border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No hay proveedores aún</h3>
          <p className="text-slate-500">Haz clic en "Nuevo Proveedor" para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proveedores.map((prov) => (
            <div key={prov.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-2">{prov.nombre}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
  <img 
    src={`https://flagcdn.com/w40/${prov.pais.toLowerCase()}.png`} 
    alt={prov.pais} 
    className="w-6 h-4 object-cover rounded-sm shadow-sm"
    onError={(e) => { e.target.style.display = 'none'; }} // Si falla, oculta la imagen
  />
  <span className="font-semibold text-slate-700">{prov.pais}</span>
</div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <DollarSign className="w-4 h-4" /> Moneda: {prov.moneda}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear Proveedor */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Registrar Nuevo Proveedor</h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
                <input 
                  type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. ABC Plastics Co."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">País de Origen</label>
                                    <select 
                    value={pais} onChange={(e) => setPais(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CN">🇨🇳 China</option>
                    <option value="MX">🇲🇽 México</option>
                    <option value="ES">🇪🇸 España</option>
                    <option value="CO">🇨🇴 Colombia</option>
                    <option value="CL">🇨🇱 Chile</option>
                    <option value="IT">🇮🇹 Italia</option>
                    <option value="IL">🇮🇱 Israel</option>
                    <option value="EC">🇪🇨 Ecuador</option>
                    <option value="US">🇺🇸 Estados Unidos</option>
                    <option value="BR">🇧🇷 Brasil</option>
                    <option value="AR">🇦🇷 Argentina</option>
                    <option value="IN">🇮🇳 India</option>
                    <option value="TR">🇹🇷 Turquía</option>
                    <option value="VN">🇻🇳 Vietnam</option>
                    <option value="KR">🇰🇷 Corea del Sur</option>
                    <option value="JP">🇯🇵 Japón</option>
                    <option value="DE">🇩🇪 Alemania</option>
                    <option value="FR">🇫🇷 Francia</option>
                    <option value="GB">🇬🇧 Reino Unido</option>
                    <option value="PT">🇵🇹 Portugal</option>
                    <option value="CA">🇨🇦 Canadá</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                  <select 
                    value={moneda} onChange={(e) => setMoneda(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="PEN">PEN (S/)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" onClick={() => setMostrarModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}