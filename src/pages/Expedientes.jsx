import { useState, useEffect } from 'react';
import { obtenerExpedientes, crearExpediente } from '../services/expedientesService';
import { obtenerProveedores } from '../services/proveedoresService';
import { db } from '../firebase'; 
import { doc, updateDoc } from 'firebase/firestore'; // 🔥 Importamos para actualizar
import { Plus, FolderOpen, Ship, Calendar, Package, Trash2, PauseCircle, PlayCircle, Archive } from 'lucide-react';
import Proforma from './Proforma';
import CotizacionesFlete from './CotizacionesFlete';
import Comparador from './Comparador';

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [pestañaActiva, setPestañaActiva] = useState('proforma');
  
  // 🔥 NUEVO ESTADO: Para filtrar activos o archivados
  const [filtroVista, setFiltroVista] = useState('activos'); 

  // Estados del formulario
  const [codigo, setCodigo] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [contenedores, setContenedores] = useState('1x40HC');
  const [metodoImputacion, setMetodoImputacion] = useState('FOB');

  useEffect(() => { 
    cargarDatos(); 
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const dataExp = await obtenerExpedientes();
    setExpedientes(dataExp);
    const dataProv = await obtenerProveedores();
    setProveedores(dataProv);
    setCargando(false);
  };

  useEffect(() => {
    if (proveedorId) {
      const prov = proveedores.find(p => p.id === proveedorId);
      const nombreCorto = prov ? prov.nombre.split(' ')[0].toUpperCase().substring(0, 10) : 'IMP';
      const año = new Date().getFullYear().toString().slice(-2);
      const correlativo = (expedientes.length + 1).toString().padStart(3, '0');
      setCodigo(`${año}-${correlativo} ${nombreCorto} ${contenedores}`);
    }
  }, [proveedorId, contenedores, proveedores, expedientes]);

  const handleGuardar = async (e) => {
    e.preventDefault();
    const prov = proveedores.find(p => p.id === proveedorId);
    
    await crearExpediente({ 
      codigo, 
      proveedorId,
      proveedorNombre: prov ? prov.nombre : '',
      contenedores,
      metodoImputacion,
      activo: true // 🔥 Nace activo
    });
    
    setCodigo('');
    setProveedorId('');
    setContenedores('1x40HC');
    setMostrarModal(false);
    cargarDatos();
  };

  // 🔥 FUNCIÓN PARA ARCHIVAR/ELIMINAR
  const handleArchivar = async (e, id) => {
    e.stopPropagation(); // Evita que se abra el expediente al hacer clic
    if (window.confirm("¿Seguro que deseas archivar este expediente? Podrás recuperarlo luego.")) {
      const expRef = doc(db, 'expedientes', id);
      await updateDoc(expRef, { activo: false });
      cargarDatos();
    }
  };

  // 🔥 FUNCIÓN PARA SUSPENDER/REACTIVAR
  const handleToggleEstado = async () => {
    const nuevoEstado = expedienteSeleccionado.etapa === 'suspendido' ? 'cotizacion' : 'suspendido';
    const expRef = doc(db, 'expedientes', expedienteSeleccionado.id);
    await updateDoc(expRef, { etapa: nuevoEstado });
    
    // Actualizamos el estado local para que se refleje al instante
    setExpedienteSeleccionado({ ...expedienteSeleccionado, etapa: nuevoEstado });
    cargarDatos();
  };

  // VISTA DE DETALLE
  if (expedienteSeleccionado) {
    return (
      <div>
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{expedienteSeleccionado.codigo}</h2>
              {expedienteSeleccionado.etapa === 'suspendido' && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">APLAZADO</span>
              )}
            </div>
            <p className="text-slate-500 capitalize">Proveedor: {expedienteSeleccionado.proveedorNombre} | Método: {expedienteSeleccionado.metodoImputacion}</p>
          </div>
          <div className="flex gap-3">
            {/* 🔥 BOTÓN DE SUSPENDER */}
            <button 
              onClick={handleToggleEstado}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 border transition-colors ${
                expedienteSeleccionado.etapa === 'suspendido' 
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
              }`}
            >
              {expedienteSeleccionado.etapa === 'suspendido' ? <PlayCircle className="w-4 h-4"/> : <PauseCircle className="w-4 h-4"/>}
              {expedienteSeleccionado.etapa === 'suspendido' ? 'Reactivar' : 'Aplazar / Suspender'}
            </button>
            <button 
              onClick={() => {
                setExpedienteSeleccionado(null);
                setPestañaActiva('proforma'); 
                cargarDatos(); 
              }} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 font-medium"
            >
              Volver a la lista
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-6">
          <button onClick={() => setPestañaActiva('proforma')} className={`px-6 py-3 font-medium text-sm transition-colors ${pestañaActiva === 'proforma' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            1. Proforma / Productos
          </button>
          <button onClick={() => setPestañaActiva('cotizaciones')} className={`px-6 py-3 font-medium text-sm transition-colors ${pestañaActiva === 'cotizaciones' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            2. Cotizaciones de Flete
          </button>
          <button onClick={() => setPestañaActiva('comparador')} className={`px-6 py-3 font-medium text-sm transition-colors ${pestañaActiva === 'comparador' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            3. Comparador
          </button>
        </div>

        {pestañaActiva === 'proforma' && <Proforma expediente={expedienteSeleccionado} onVolver={() => { }} />}
        {pestañaActiva === 'cotizaciones' && <CotizacionesFlete expediente={expedienteSeleccionado} />}
        {pestañaActiva === 'comparador' && <Comparador expediente={expedienteSeleccionado} />}
      </div>
    );
  }

  // VISTA DE LISTA
  const expedientesFiltrados = expedientes.filter(e => filtroVista === 'activos' ? e.activo !== false : e.activo === false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expedientes de Importación</h2>
          <p className="text-slate-500">Gestiona el ciclo de vida de tus importaciones.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" /> Nuevo Expediente
        </button>
      </div>

      {/* 🔥 FILTROS */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setFiltroVista('activos')} 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroVista === 'activos' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Expedientes Activos
        </button>
        <button 
          onClick={() => setFiltroVista('archivados')} 
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filtroVista === 'archivados' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <Archive className="w-4 h-4" /> Archivados
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 mt-10">Cargando expedientes...</p>
      ) : expedientesFiltrados.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-xl border border-slate-200">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No hay expedientes en esta vista</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expedientesFiltrados.map((exp) => (
            <div 
              key={exp.id} 
              onClick={() => setExpedienteSeleccionado(exp)}
              className={`relative bg-white p-5 rounded-xl border shadow-sm cursor-pointer transition-all ${
                exp.etapa === 'suspendido' ? 'border-yellow-300 hover:border-yellow-500' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
              }`}
            >
              {/* 🔥 BOTÓN DE ARCHIVAR (BORRAR) */}
              <button 
                onClick={(e) => handleArchivar(e, exp.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                title="Archivar Expediente"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex justify-between items-start mb-3 pr-8">
                <h3 className="font-bold text-slate-800 text-lg">{exp.codigo}</h3>
                <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                  exp.etapa === 'suspendido' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'
                }`}>
                  {exp.etapa === 'suspendido' ? 'Aplazado' : exp.etapa}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Package className="w-4 h-4"/> Proveedor: {exp.proveedorNombre || 'No definido'}</div>
                <div className="flex items-center gap-2"><Ship className="w-4 h-4"/> Contenedores: {exp.contenedores || 'Por definir'}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Método: {exp.metodoImputacion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR (Igual que antes) */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Crear Nuevo Expediente</h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
                  <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="">Selecciona...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contenedores</label>
                  <input type="text" required value={contenedores} onChange={(e) => setContenedores(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ej. 3x40HC" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código Interno</label>
                <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-blue-50 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Imputación (Landed Cost)</label>
                <select value={metodoImputacion} onChange={(e) => setMetodoImputacion(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="FOB">Por Valor FOB (Recomendado)</option>
                  <option value="CBM">Por Volumen (CBM)</option>
                  <option value="PESO">Por Peso (Kg)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Crear Expediente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}