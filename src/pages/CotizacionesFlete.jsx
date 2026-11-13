import { useState, useEffect } from 'react';
import { obtenerCotizacionesPorExpediente, crearCotizacionFlete, actualizarCotizacionFlete } from '../services/cotizacionesFleteService';
import { obtenerAgentes } from '../services/agentesService';
import { obtenerProformaPorExpediente } from '../services/proformasService';
import { obtenerProveedores } from '../services/proveedoresService';
import { Plus, Ship, Calendar, Trash2, DollarSign, Clock, MapPin } from 'lucide-react';
import { CATALOGO_CONCEPTOS } from '../logic/catalogoConceptos';
import { db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';

export default function CotizacionesFlete({ expediente }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cotizacionEditandoId, setCotizacionEditandoId] = useState(null);
  
  const [paisOrigenProforma, setPaisOrigenProforma] = useState('CN');

  // CABECERA
  const [agenteId, setAgenteId] = useState('');
  const [modalidad, setModalidad] = useState('MARITIMO');
  const [naviera, setNaviera] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [tipoContenedor, setTipoContenedor] = useState('40HC');
  const [cantidadContenedores, setCantidadContenedores] = useState(1);
  
  // CAMPOS EXTRA
  const [frecuencia, setFrecuencia] = useState('SEMANAL');
  const [condicionPago, setCondicionPago] = useState('CONTADO');
  const [fechaVigencia, setFechaVigencia] = useState('');
  const [diasSobrestadia, setDiasSobrestadia] = useState(0);
  const [diasAlmacenaje, setDiasAlmacenaje] = useState(0);
  const [almacenDestino, setAlmacenDestino] = useState('');
  const [transitTime, setTransitTime] = useState(0); // 🔥 NUEVO CAMPO

  const [puertoOrigen, setPuertoOrigen] = useState('');
  const [puertoDestino, setPuertoDestino] = useState('Callao (PECLL)');

  // CONCEPTOS DINÁMICOS
  const [conceptosOrigen, setConceptosOrigen] = useState([]);
  const [conceptosFlete, setConceptosFlete] = useState([]);
  const [conceptosDestino, setConceptosDestino] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      
      const dataCot = await obtenerCotizacionesPorExpediente(expediente.id);
      setCotizaciones(dataCot);
      const dataAgentes = await obtenerAgentes();
      setAgentes(dataAgentes);
      
      const proforma = await obtenerProformaPorExpediente(expediente.id);
      
      if (proforma) {
        if (proforma.paisOrigen) {
          setPaisOrigenProforma(proforma.paisOrigen);
        } else {
          const proveedores = await obtenerProveedores();
          const prov = proveedores.find(p => p.nombre === proforma.proveedor);
          if (prov && prov.pais) {
            setPaisOrigenProforma(prov.pais);
          }
        }
      }
      setCargando(false);
    };
    cargarDatos();
  }, [expediente.id]);

  const abrirModal = (cotizacion = null) => {
    if (cotizacion) {
      setCotizacionEditandoId(cotizacion.id);
      setAgenteId(cotizacion.agenteId || '');
      setModalidad(cotizacion.modalidad || 'MARITIMO');
      setNaviera(cotizacion.naviera || '');
      setIncoterm(cotizacion.incoterm || 'FOB');
      setTipoContenedor(cotizacion.tipoContenedor || '40HC');
      setCantidadContenedores(cotizacion.cantidadContenedores || 1);
      
      setFrecuencia(cotizacion.frecuencia || 'SEMANAL');
      setCondicionPago(cotizacion.condicionPago || 'CONTADO');
      setFechaVigencia(cotizacion.fechaVigencia || '');
      setDiasSobrestadia(cotizacion.diasSobrestadia || 0);
      setDiasAlmacenaje(cotizacion.diasAlmacenaje || 0);
      setAlmacenDestino(cotizacion.almacenDestino || '');
      setTransitTime(cotizacion.transitTime || 0); // 🔥 Cargar TT

      setPuertoOrigen(cotizacion.puertoOrigen || '');
      setPuertoDestino(cotizacion.puertoDestino || 'Callao (PECLL)');

      setConceptosOrigen(cotizacion.conceptosOrigen || []);
      setConceptosFlete(cotizacion.conceptosFlete || []);
      setConceptosDestino(cotizacion.conceptosDestino || []);
    } else {
      setCotizacionEditandoId(null);
      setAgenteId('');
      setModalidad('MARITIMO');
      setNaviera('');
      setIncoterm('FOB');
      setTipoContenedor('40HC');
      setCantidadContenedores(1);
      
      setFrecuencia('SEMANAL');
      setCondicionPago('CONTADO');
      setFechaVigencia('');
      setDiasSobrestadia(0);
      setDiasAlmacenaje(0);
      setAlmacenDestino('');
      setTransitTime(0); // 🔥 Resetear TT

      setPuertoOrigen('');
      setPuertoDestino('Callao (PECLL)');

      setConceptosOrigen([]);
      setConceptosFlete([]);
      setConceptosDestino([]);
    }
    setMostrarModal(true);
  };

  const actualizarConcepto = (bloque, index, campo, valor) => {
    const setBloque = bloque === 'origen' ? setConceptosOrigen : bloque === 'flete' ? setConceptosFlete : setConceptosDestino;
    const listaActual = bloque === 'origen' ? conceptosOrigen : bloque === 'flete' ? conceptosFlete : conceptosDestino;
    
    const nuevos = [...listaActual];
    nuevos[index][campo] = valor;

    if (campo === 'conceptoId') {
      const cat = CATALOGO_CONCEPTOS.find(c => c.id === valor);
      if (cat) {
        nuevos[index].incluyeIGV = cat.afectoIGV;
        nuevos[index].unidadMedida = cat.unidadMedida;
        if (cat.unidadMedida === 'BL') nuevos[index].cantidad = 1;
        if (cat.unidadMedida === 'CONT') nuevos[index].cantidad = Number(cantidadContenedores);
      }
    }
    setBloque(nuevos);
  };

  const agregarConcepto = (bloque, tipoCat) => {
    const nuevoItem = { conceptoId: 'manual', nombreCustom: '', cantidad: 1, tarifa: 0, incluyeIGV: tipoCat === 'destino', unidadMedida: 'FIJO' };
    if (bloque === 'origen') setConceptosOrigen([...conceptosOrigen, nuevoItem]);
    if (bloque === 'flete') setConceptosFlete([...conceptosFlete, nuevoItem]);
    if (bloque === 'destino') setConceptosDestino([...conceptosDestino, nuevoItem]);
  };

  const eliminarConcepto = (bloque, index) => {
    if (bloque === 'origen') setConceptosOrigen(conceptosOrigen.filter((_, i) => i !== index));
    if (bloque === 'flete') setConceptosFlete(conceptosFlete.filter((_, i) => i !== index));
    if (bloque === 'destino') setConceptosDestino(conceptosDestino.filter((_, i) => i !== index));
  };

  const calcSubtotal = (lista) => lista.reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.tarifa)), 0);
  const calcIGV = (lista) => lista.reduce((sum, item) => item.incluyeIGV ? sum + ((Number(item.cantidad) * Number(item.tarifa)) * 0.18) : sum, 0);

  const totalOrigen = calcSubtotal(conceptosOrigen);
  const totalFlete = calcSubtotal(conceptosFlete);
  const subtotalDestino = calcSubtotal(conceptosDestino);
  const igvDestino = calcIGV(conceptosDestino);
  const totalDestino = subtotalDestino + igvDestino;
  const totalGeneral = totalOrigen + totalFlete + totalDestino;

  const handleGuardar = async (e) => {
    e.preventDefault();
    
    if (!agenteId) {
      alert("Por favor, selecciona un agente de carga.");
      return;
    }

    const agenteSeleccionado = agentes.find(a => a.id === agenteId);
    const procesarLista = (lista) => lista.map(c => ({ ...c, montoTotal: Number(c.cantidad) * Number(c.tarifa) }));

    const datos = {
      expedienteId: expediente.id,
      agenteId,
      agenteNombre: agenteSeleccionado?.nombre || 'Desconocido',
      modalidad, naviera, incoterm, tipoContenedor,
      cantidadContenedores: Number(cantidadContenedores),
      
      frecuencia, condicionPago, fechaVigencia, 
      diasSobrestadia: Number(diasSobrestadia), 
      diasAlmacenaje: Number(diasAlmacenaje), 
      almacenDestino,
      transitTime: Number(transitTime), // 🔥 Guardar TT

      paisOrigen: paisOrigenProforma,
      puertoOrigen, puertoDestino,

      conceptosOrigen: procesarLista(conceptosOrigen),
      conceptosFlete: procesarLista(conceptosFlete),
      conceptosDestino: procesarLista(conceptosDestino),
      
      totalOrigen, 
      totalFlete, 
      subtotalDestino,
      igvDestino, 
      totalDestino, 
      totalGeneral
    };

    try {
      if (cotizacionEditandoId) {
        await actualizarCotizacionFlete(cotizacionEditandoId, datos);
        alert("Cotización actualizada con éxito.");
      } else {
        await crearCotizacionFlete(datos);
        alert("Cotización guardada con éxito.");
      }
      
      const dataCot = await obtenerCotizacionesPorExpediente(expediente.id);
      setCotizaciones(dataCot);
      setMostrarModal(false);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar.");
    }
  };

  const handleEliminar = async () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta cotización?")) {
      try {
        await deleteDoc(doc(db, 'cotizacionesFlete', cotizacionEditandoId));
        const dataCot = await obtenerCotizacionesPorExpediente(expediente.id);
        setCotizaciones(dataCot);
        setMostrarModal(false);
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cotizaciones de Flete</h2>
          <p className="text-slate-500">Registra tarifas unitarias con lógica automática de U/M y cálculo de IGV.</p>
        </div>
        <button onClick={() => abrirModal(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" /> Nueva Cotización
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 mt-10">Cargando cotizaciones...</p>
      ) : cotizaciones.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-xl border border-slate-200">
          <Ship className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No hay cotizaciones registradas</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cotizaciones.map((cot) => (
            <div 
              key={cot.id} 
              onClick={() => abrirModal(cot)}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 text-lg">{cot.agenteNombre}</h3>
                <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-sm">USD {cot.totalGeneral?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Ship className="w-4 h-4"/> {cot.modalidad} / {cot.naviera} / {cot.tipoContenedor}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> TT: {cot.transitTime || 'N/A'} días | Pago: {cot.condicionPago}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Sobrestadía: {cot.diasSobrestadia} días / Almacenaje: {cot.diasAlmacenaje} días</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {cotizacionEditandoId ? 'Editar Cotización' : 'Registrar Cotización Detallada'}
              </h3>
              {cotizacionEditandoId && (
                <button 
                  type="button" 
                  onClick={handleEliminar}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 font-medium px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar Cotización
                </button>
              )}
            </div>
            
            <form onSubmit={handleGuardar} className="space-y-6">
              
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Agente</label>
                  <select required value={agenteId} onChange={(e) => setAgenteId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="">Selecciona...</option>
                    {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Modalidad</label>
                  <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="MARITIMO">Marítimo (FCL)</option>
                    <option value="LCL">Marítimo (LCL)</option>
                    <option value="AEREO">Aéreo</option>
                    <option value="TERRESTRE">Terrestre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Incoterm</label>
                  <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="EXW">EXW</option>
                    <option value="FCA">FCA</option>
                    <option value="FOB">FOB</option>
                    <option value="CFR">CFR</option>
                    <option value="CIF">CIF</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Naviera/Aerolínea</label>
                  <input type="text" value={naviera} onChange={(e) => setNaviera(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="Ej. ONE, Maersk" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Condición de Pago</label>
                  <select value={condicionPago} onChange={(e) => setCondicionPago(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO 15">Crédito 15 días</option>
                    <option value="CREDITO 30">Crédito 30 días</option>
                    <option value="CREDITO 45">Crédito 45 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frecuencia</label>
                  <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINCENAL">Quincenal</option>
                    <option value="MENSUAL">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vigencia (Fecha)</label>
                  <input type="date" value={fechaVigencia} onChange={(e) => setFechaVigencia(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>

                {/* 🔥 NUEVO CAMPO: TRANSIT TIME */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transit Time (Días)</label>
                  <input type="number" value={transitTime} onChange={(e) => setTransitTime(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="Ej. 30" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Almacén Destino</label>
                  <input type="text" value={almacenDestino} onChange={(e) => setAlmacenDestino(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="Ej. UNIMAR" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Días Sobrestadía</label>
                  <input type="number" value={diasSobrestadia} onChange={(e) => setDiasSobrestadia(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Días Almacenaje</label>
                  <input type="number" value={diasAlmacenaje} onChange={(e) => setDiasAlmacenaje(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cant. Contenedores</label>
                  <input type="number" min="1" value={cantidadContenedores} onChange={(e) => setCantidadContenedores(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={tipoContenedor} onChange={(e) => setTipoContenedor(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="20GP">20GP</option>
                    <option value="40HC">40HC</option>
                    <option value="40RQ">40RQ</option>
                    <option value="LCL">Carga Suelta</option>
                    <option value="AEREO">Aéreo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">POL (Puerto Origen)</label>
                  <input type="text" value={puertoOrigen} onChange={(e) => setPuertoOrigen(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="Ej. Manzanillo" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">POD (Puerto Destino)</label>
                  <input type="text" value={puertoDestino} onChange={(e) => setPuertoDestino(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" placeholder="Ej. Callao o Jorge Chávez" />
                </div>
              </div>

              {/* BLOQUES DE CONCEPTOS */}
              {[
                { key: 'origen', titulo: 'Gastos en Origen (EXW/FCA)', tipoCat: 'origen', lista: conceptosOrigen, subtotal: totalOrigen, igv: 0, total: totalOrigen },
                { key: 'flete', titulo: 'Flete Internacional', tipoCat: 'flete', lista: conceptosFlete, subtotal: totalFlete, igv: 0, total: totalFlete },
                { key: 'destino', titulo: 'Gastos en Destino (Locales)', tipoCat: 'destino', lista: conceptosDestino, subtotal: subtotalDestino, igv: igvDestino, total: totalDestino }
              ].map((bloque) => (
                <div key={bloque.key}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-700">{bloque.titulo}</h4>
                    <button type="button" onClick={() => agregarConcepto(bloque.key, bloque.tipoCat)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                      <Plus className="w-4 h-4" /> Agregar Concepto
                    </button>
                  </div>
                  {bloque.lista.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mb-4">Sin gastos en este bloque.</p>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 mb-4">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="pb-2">Concepto</th>
                            <th className="pb-2 w-16 text-center">U/M</th>
                            <th className="pb-2 w-20 text-center">Cant.</th>
                            <th className="pb-2 w-24">Tarifa USD</th>
                            <th className="pb-2 w-16 text-center">IGV</th>
                            <th className="pb-2 w-28 text-right">Total</th>
                            <th className="pb-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bloque.lista.map((item, index) => (
                            <tr key={index}>
                              <td className="pr-2 pb-2">
                                <div className="flex flex-col gap-1">
                                  <select value={item.conceptoId} onChange={(e) => actualizarConcepto(bloque.key, index, 'conceptoId', e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded">
                                    {CATALOGO_CONCEPTOS.filter(c => c.tipo === bloque.tipoCat || c.id === 'manual').map(c => (
                                      <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                  </select>
                                  {item.conceptoId === 'manual' && (
                                    <input type="text" placeholder="Nombre del concepto..." value={item.nombreCustom} onChange={(e) => actualizarConcepto(bloque.key, index, 'nombreCustom', e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                                  )}
                                </div>
                              </td>
                              <td className="pr-2 pb-2 text-center text-xs font-medium text-slate-600">
                                {item.conceptoId === 'manual' ? (
                                  <select value={item.unidadMedida} onChange={(e) => actualizarConcepto(bloque.key, index, 'unidadMedida', e.target.value)} className="w-full px-1 py-1 border border-slate-300 rounded">
                                    <option value="FIJO">Fijo</option>
                                    <option value="BL">BL</option>
                                    <option value="CONT">CONT</option>
                                  </select>
                                ) : (
                                  item.unidadMedida
                                )}
                              </td>
                              <td className="pr-2 pb-2">
                                <input 
                                  type="number" 
                                  value={item.cantidad} 
                                  onChange={(e) => actualizarConcepto(bloque.key, index, 'cantidad', e.target.value)} 
                                  disabled={item.unidadMedida === 'BL'}
                                  className={`w-full px-2 py-1.5 border border-slate-300 rounded ${item.unidadMedida === 'BL' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}`} 
                                />
                              </td>
                              <td className="pr-2 pb-2">
                                <input type="number" value={item.tarifa} onChange={(e) => actualizarConcepto(bloque.key, index, 'tarifa', e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded" />
                              </td>
                              <td className="pr-2 pb-2 text-center">
                                <input type="checkbox" checked={item.incluyeIGV} onChange={(e) => actualizarConcepto(bloque.key, index, 'incluyeIGV', e.target.checked)} />
                              </td>
                              <td className="pb-2 text-right font-medium text-slate-700">
                                USD {(Number(item.cantidad) * Number(item.tarifa)).toFixed(2)}
                              </td>
                              <td className="pb-2 text-center">
                                <button type="button" onClick={() => eliminarConcepto(bloque.key, index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bloque.key === 'destino' && (
                        <div className="flex justify-end gap-6 mt-2 pt-2 border-t border-slate-200 text-sm">
                          <div className="flex gap-2"><span className="text-slate-500">Subtotal:</span> <span className="font-medium">${bloque.subtotal.toFixed(2)}</span></div>
                          <div className="flex gap-2"><span className="text-slate-500">IGV (18%):</span> <span className="font-medium">${bloque.igv.toFixed(2)}</span></div>
                          <div className="flex gap-2 font-bold text-slate-800"><span>Total Destino:</span> <span>${bloque.total.toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                <div className="text-sm text-blue-800">
                  Origen: USD {totalOrigen.toFixed(2)} | Flete: USD {totalFlete.toFixed(2)} | Destino (con IGV): USD {totalDestino.toFixed(2)}
                </div>
                <div className="text-xl font-bold text-blue-900">
                  Total General: USD {totalGeneral.toFixed(2)}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  {cotizacionEditandoId ? 'Actualizar Cotización' : 'Guardar Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}