import { useState, useEffect } from 'react';
import { obtenerAgentes, crearAgente } from '../services/agentesService';
import { Plus, Users, Anchor, CalendarClock, Star } from 'lucide-react';

export default function Agentes() {
  const [agentes, setAgentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [naviera, setNaviera] = useState('MSC');
  const [hitoPago, setHitoPago] = useState('LEVANTE_SUNAT');
  const [diasCredito, setDiasCredito] = useState(15);
  const [atencion, setAtencion] = useState(4);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const data = await obtenerAgentes();
    setAgentes(data);
    setCargando(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    await crearAgente({ 
      nombre, naviera, 
      configPago: { hitoInicioPago: hitoPago, diasCredito },
      evaluacion: { atencion, seguimiento: 4, tiempoRespuesta: 4 }
    });
    setNombre('');
    setMostrarModal(false);
    cargarDatos();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agentes de Carga</h2>
          <p className="text-slate-500">Gestiona tus operadores logísticos y sus condiciones de pago.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" /> Nuevo Agente
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 mt-10">Cargando agentes...</p>
      ) : agentes.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No hay agentes registrados</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentes.map((ag) => (
            <div key={ag.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-3">{ag.nombre}</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Anchor className="w-4 h-4"/> Naviera: {ag.naviera}</div>
                <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4"/> Pago: {ag.configPago.hitoInicioPago} + {ag.configPago.diasCredito} días</div>
                <div className="flex items-center gap-2 text-yellow-500"><Star className="w-4 h-4"/> Atención: {ag.evaluacion.atencion}/5</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Registrar Agente</h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Agente</label>
                <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ej. MSC Logistics" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Naviera Preferida</label>
                  <select value={naviera} onChange={(e) => setNaviera(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="MSC">MSC</option>
                    <option value="Maersk">Maersk</option>
                    <option value="Cosco">Cosco</option>
                    <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                    <option value="CMA CGM">CMA CGM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Atención (1-5)</label>
                  <input type="number" min="1" max="5" value={atencion} onChange={(e) => setAtencion(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inicio de Pago</label>
                  <select value={hitoPago} onChange={(e) => setHitoPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="OC">OC</option>
                    <option value="ETD">ETD</option>
                    <option value="ETA">ETA</option>
                    <option value="DAM">DAM</option>
                    <option value="LEVANTE_SUNAT">Levante SUNAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Días Crédito</label>
                  <input type="number" value={diasCredito} onChange={(e) => setDiasCredito(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Guardar Agente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}