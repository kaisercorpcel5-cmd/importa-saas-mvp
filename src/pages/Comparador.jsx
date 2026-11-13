import { useState, useEffect } from 'react';
import { obtenerCotizacionesPorExpediente } from '../services/cotizacionesFleteService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, ZAxis } from 'recharts';
import { CheckCircle2, FileDown, AlertTriangle, EyeOff, ArrowRightLeft, Eye, XCircle, Award, Calculator, MessageSquare, Copy, Check, Clock, MapPin, FileSpreadsheet, ChevronDown, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Comparador({ expediente }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarCostoReal, setMostrarCostoReal] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [menuExportarAbierto, setMenuExportarAbierto] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const data = await obtenerCotizacionesPorExpediente(expediente.id);
      setCotizaciones(data);
      setCargando(false);
    };
    cargarDatos();
  }, [expediente.id]);

  // 🔥 FUNCIÓN EXPORTAR A PDF (IMPRESIÓN NATIVA)
  const exportarPDF = () => {
    setMenuExportarAbierto(false);
    window.print();
  };

  // 🔥 FUNCIÓN EXPORTAR A EXCEL
  const exportarExcel = () => {
    setMenuExportarAbierto(false);
    const dataExcel = [];

    const cabecera = ['Concepto', 'U/M'];
    cotizacionesProcesadas.forEach(cot => cabecera.push(cot.agenteNombre));
    dataExcel.push(cabecera);

    conceptosUnicos.forEach(concepto => {
      const fila = [concepto.nombre, concepto.unidadMedida];
      cotizacionesProcesadas.forEach(cot => {
        const monto = getMonto(cot, concepto.key, concepto.tipo);
        fila.push(monto !== null ? monto : '-');
      });
      dataExcel.push(fila);
    });

    const filaTotal = ['TOTAL GENERAL', ''];
    cotizacionesProcesadas.forEach(cot => filaTotal.push(cot.totalGeneral?.toFixed(2)));
    dataExcel.push(filaTotal);

    const filaCostoReal = ['COSTO REAL AJUSTADO', ''];
    cotizacionesProcesadas.forEach(cot => filaCostoReal.push(cot.costoRealAjustado?.toFixed(2)));
    dataExcel.push(filaCostoReal);

    const filaPago = ['Condición de Pago', ''];
    cotizacionesProcesadas.forEach(cot => filaPago.push(cot.condicionPago || 'CONTADO'));
    dataExcel.push(filaPago);

    const filaDias = ['Días Sobrestadía / Almacenaje', ''];
    cotizacionesProcesadas.forEach(cot => filaDias.push(`${cot.diasSobrestadia || 'N/A'} / ${cot.diasAlmacenaje || 'N/A'}`));
    dataExcel.push(filaDias);

    const ws = XLSX.utils.aoa_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparador');
    XLSX.writeFile(wb, `Comparador_${expediente.codigo}.xlsx`);
  };

  if (cargando) return <p className="text-center text-slate-500 mt-10">Cargando comparador...</p>;
  if (cotizaciones.length === 0) return <p className="text-center text-slate-500 mt-10">No hay cotizaciones para comparar.</p>;

  const paisOrigenGlobal = cotizaciones.find(c => c.paisOrigen)?.paisOrigen || 'PE';

  // --- Lógica de tabla ---
  const conceptosUnicos = [];
  const agregarConceptoUnico = (tipo, item) => {
    const nombreLimpio = item.conceptoId === 'manual' 
      ? (item.nombreCustom || 'SIN NOMBRE').toUpperCase().trim() 
      : item.conceptoId.replace(/_/g, ' ').toUpperCase().trim();
    
    const key = `${tipo}-${nombreLimpio}`; 
    if (!conceptosUnicos.find(c => c.key === key)) {
      conceptosUnicos.push({ key, tipo, nombre: nombreLimpio, unidadMedida: item.unidadMedida });
    }
  };

  cotizaciones.forEach(cot => {
    (cot.conceptosOrigen || []).forEach(i => agregarConceptoUnico('origen', i));
    (cot.conceptosFlete || []).forEach(i => agregarConceptoUnico('flete', i));
    (cot.conceptosDestino || []).forEach(i => agregarConceptoUnico('destino', i));
  });

  const getMonto = (cot, conceptoKey, tipo) => {
    let lista = tipo === 'origen' ? cot.conceptosOrigen : tipo === 'flete' ? cot.conceptosFlete : cot.conceptosDestino;
    const item = (lista || []).find(i => {
      const nombreLimpio = i.conceptoId === 'manual' 
        ? (i.nombreCustom || 'SIN NOMBRE').toUpperCase().trim() 
        : i.conceptoId.replace(/_/g, ' ').toUpperCase().trim();
      return `${tipo}-${nombreLimpio}` === conceptoKey;
    });
    return item ? (item.cantidad * item.tarifa) : null;
  };

  const getMinValue = (conceptoKey, tipo) => {
    const valores = cotizaciones.map(cot => getMonto(cot, conceptoKey, tipo)).filter(v => v !== null && v > 0);
    return valores.length > 0 ? Math.min(...valores) : 0;
  };

  // 🔥 DETECCIÓN DE ALERTAS
  let alertasCostosOcultos = [];
  let alertasConceptoDesplazado = [];

  const nombresConceptosBase = [...new Set(cotizaciones.flatMap(cot => [
    ...(cot.conceptosOrigen || []).map(c => c.conceptoId === 'manual' ? (c.nombreCustom || '').toUpperCase().trim() : c.conceptoId.replace(/_/g, ' ').toUpperCase().trim()),
    ...(cot.conceptosFlete || []).map(c => c.conceptoId === 'manual' ? (c.nombreCustom || '').toUpperCase().trim() : c.conceptoId.replace(/_/g, ' ').toUpperCase().trim()),
    ...(cot.conceptosDestino || []).map(c => c.conceptoId === 'manual' ? (c.nombreCustom || '').toUpperCase().trim() : c.conceptoId.replace(/_/g, ' ').toUpperCase().trim())
  ]))].filter(nombre => nombre && nombre !== '');

  nombresConceptosBase.forEach(nombreConcepto => {
    const esSeguro = nombreConcepto.includes('SEGURO');

    const ubicaciones = cotizaciones.map(cot => {
      const buscarConcepto = (lista) => (lista || []).find(c => {
        const nombreLimpio = c.conceptoId === 'manual' ? (c.nombreCustom || '').toUpperCase().trim() : c.conceptoId.replace(/_/g, ' ').toUpperCase().trim();
        return nombreLimpio === nombreConcepto;
      });

      const enOrigen = buscarConcepto(cot.conceptosOrigen);
      const enFlete = buscarConcepto(cot.conceptosFlete);
      const enDestino = buscarConcepto(cot.conceptosDestino);
      
      if (enOrigen) return { agente: cot.agenteNombre, bloque: 'origen', monto: enOrigen.cantidad * enOrigen.tarifa };
      if (enFlete) return { agente: cot.agenteNombre, bloque: 'flete', monto: enFlete.cantidad * enFlete.tarifa };
      if (enDestino) return { agente: cot.agenteNombre, bloque: 'destino', monto: enDestino.cantidad * enDestino.tarifa };
      return { agente: cot.agenteNombre, bloque: null, monto: 0 };
    });

    const agentesQueLoTienen = ubicaciones.filter(u => u.bloque !== null);
    
    if (!esSeguro && agentesQueLoTienen.length > 0 && agentesQueLoTienen.length < cotizaciones.length) {
      ubicaciones.forEach(u => {
        if (u.bloque === null) {
          const promedio = agentesQueLoTienen.reduce((sum, a) => sum + a.monto, 0) / agentesQueLoTienen.length;
          alertasCostosOcultos.push({ agente: u.agente, concepto: nombreConcepto, montoEstimado: promedio });
        }
      });
    }

    if (esSeguro) {
      agentesQueLoTienen.forEach(u => {
        if (u.bloque === 'destino') {
          alertasConceptoDesplazado.push({ agente: u.agente, concepto: nombreConcepto, bloque: 'destino' });
        }
      });
    }
  });

  alertasCostosOcultos = alertasCostosOcultos.filter((a, i, self) => i === self.findIndex((x) => x.agente === a.agente && x.concepto === a.concepto));
  alertasConceptoDesplazado = alertasConceptoDesplazado.filter((a, i, self) => i === self.findIndex((x) => x.agente === a.agente && x.concepto === a.concepto));

  // 🔥 CALCULAR COSTO REAL Y VALIDAR
  const cotizacionesProcesadas = cotizaciones.map(cot => {
    const alertasDeEsteAgente = alertasCostosOcultos.filter(a => a.agente === cot.agenteNombre);
    const totalOcultos = alertasDeEsteAgente.reduce((sum, a) => sum + a.montoEstimado, 0);
    
    return {
      ...cot,
      costoRealAjustado: cot.totalGeneral + totalOcultos,
      cantidadCostosOcultos: alertasDeEsteAgente.length,
      esValida: alertasDeEsteAgente.length <= 3, 
      alertasDeEsteAgente
    };
  }).sort((a, b) => {
    if (a.esValida && !b.esValida) return -1;
    if (!a.esValida && b.esValida) return 1;
    return a.costoRealAjustado - b.costoRealAjustado;
  });

  const agentesValidos = cotizacionesProcesadas.filter(c => c.esValida);
  const mejorPrecioReal = agentesValidos.length > 0 ? agentesValidos[0] : cotizacionesProcesadas[0];

  // --- ANÁLISIS DEL SISTEMA ---
  let mensajeAnalisis = "";
  if (agentesValidos.length > 0) {
    const menorFlete = Math.min(...agentesValidos.map(c => c.totalFlete));
    const fletePromedio = agentesValidos.reduce((sum, c) => sum + c.totalFlete, 0) / agentesValidos.length;
    const ahorroFlete = fletePromedio - mejorPrecioReal.totalFlete;
    
    mensajeAnalisis = `La mejor opción es ${mejorPrecioReal.agenteNombre}. `;
    
    if (mejorPrecioReal.totalFlete === menorFlete && ahorroFlete > 0) {
      mensajeAnalisis += `Ofrece la tarifa de flete más baja ($${menorFlete.toFixed(2)}), ahorrando $${ahorroFlete.toFixed(2)} vs el promedio. `;
    }

    if (mejorPrecioReal.cantidadCostosOcultos > 0) {
      const conceptosFaltantes = mejorPrecioReal.alertasDeEsteAgente.map(a => `${a.concepto} ($${a.montoEstimado.toFixed(2)})`).join(', ');
      mensajeAnalisis += `Ojo: le faltan conceptos (${conceptosFaltantes}), pero su costo ajustado sigue siendo el mejor. `;
    } else {
      mensajeAnalisis += `Cumple con todos los conceptos requeridos. `;
    }

    if (mejorPrecioReal.condicionPago && mejorPrecioReal.condicionPago !== 'CONTADO') {
      mensajeAnalisis += `Ofrece ${mejorPrecioReal.condicionPago} para tu flujo de caja.`;
    }
  } else {
    mensajeAnalisis = `Ningún agente cumple con los conceptos mínimos.`;
  }

  // --- Datos para Gráfico de Barras ---
  const datosBarras = agentesValidos.map(cot => ({
    name: cot.agenteNombre.split(' ')[0], 
    Flete: cot.totalFlete,
    Destino: cot.totalDestino, 
    Origen: cot.totalOrigen
  }));

  // --- Datos para Gráfico de Dispersión ---
  const datosDispersion = agentesValidos.map(cot => {
    let color = '#10b981'; 
    if ((cot.diasSobrestadia || 0) < 15) color = '#ef4444'; 
    else if ((cot.diasSobrestadia || 0) < 21) color = '#f59e0b'; 

    return {
      x: cot.diasSobrestadia || 0,
      y: cot.costoRealAjustado,
      z: 100, 
      name: cot.agenteNombre,
      fill: color
    };
  });

  // 🔥 LÓGICA DE AGRUPACIÓN DE ALERTAS
  const agentesDescalificados = cotizacionesProcesadas.filter(c => !c.esValida);
  
  const alertasBloque1 = [];
  
  cotizacionesProcesadas.forEach(cot => {
    if (!cot.esValida) return; 

    const costos = alertasCostosOcultos.filter(a => a.agente === cot.agenteNombre);
    
    const esVacio = (valor) => {
      if (valor === undefined || valor === null) return true;
      const stringVal = String(valor).trim().toLowerCase();
      return stringVal === '' || stringVal === 'undefined' || stringVal === 'null';
    };

    const datosFaltantes = [];
    if (esVacio(cot.naviera)) datosFaltantes.push('Naviera');
    if (esVacio(cot.transitTime) || cot.transitTime === 0) datosFaltantes.push('TT');
    if (esVacio(cot.fechaVigencia)) datosFaltantes.push('Vigencia');
    if (esVacio(cot.almacenDestino)) datosFaltantes.push('Almacén');
    if (cot.diasSobrestadia === undefined || cot.diasSobrestadia === null) datosFaltantes.push('Sobrestadía');
    if (cot.diasAlmacenaje === undefined || cot.diasAlmacenaje === null) datosFaltantes.push('Almacenaje');

    if (costos.length > 0 || datosFaltantes.length > 0) {
      alertasBloque1.push({
        agenteNombre: cot.agenteNombre,
        costos,
        datosFaltantes
      });
    }
  });

  // 🔥 GENERADOR DE MENSAJE DE FEEDBACK
  const generarFeedback = (agenteNombre) => {
    const info = alertasBloque1.find(a => a.agenteNombre === agenteNombre);
    if (!info) return;

    let mensaje = `Estimado equipo de ${agenteNombre},\n\nRevisando su cotización para el expediente ${expediente.codigo}, hemos notado los siguientes puntos a completar:\n\n`;

    if (info.costos.length > 0) {
      mensaje += `COSTOS FALTANTES:\n`;
      info.costos.forEach(a => {
        mensaje += `- ${a.concepto} (aprox. $${a.montoEstimado.toFixed(2)})\n`;
      });
      mensaje += `\n`;
    }

    if (info.datosFaltantes.length > 0) {
      mensaje += `DATOS FALTANTES EN LA COTIZACIÓN:\n`;
      info.datosFaltantes.forEach(d => {
        mensaje += `- ${d}\n`;
      });
      mensaje += `\n`;
    }

    mensaje += `¿Podrían confirmarnos si estos costos están incluidos en su tarifa o se facturarán por separado? Agradecemos completar los datos faltantes para poder evaluar su propuesta.\n\nQuedamos a la espera.\n\nSaludos cordiales,\nChristian Romero`;
    
    setMensajeFeedback(mensaje);
  };

  return (
    <div className="space-y-6">
      {/* PANEL DE ALERTAS COMPACTO (NO SE IMPRIME) */}
      <div className="no-print">
        {(alertasBloque1.length > 0 || agentesDescalificados.length > 0 || alertasConceptoDesplazado.length > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 text-orange-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Alertas de Auditoría</h3>
            </div>
            
            <div className="space-y-1">
              {agentesDescalificados.map(ad => (
                 <div key={ad.id} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200 flex justify-between items-center">
                    <span><strong>{ad.agenteNombre}</strong> DESCALIFICADO: No incluyó {ad.cantidadCostosOcultos} conceptos básicos.</span>
                 </div>
              ))}

              {alertasBloque1.map(info => (
                <div key={info.agenteNombre} className="text-xs bg-white px-2 py-1 rounded border border-orange-200 flex justify-between items-center shadow-sm">
                  <div className="truncate">
                    <strong className="text-slate-800">{info.agenteNombre}</strong>
                    {info.costos.length > 0 && (
                      <span className="text-orange-700"> | Costos: {info.costos.map(c => `${c.concepto} ($${c.montoEstimado.toFixed(2)})`).join(', ')}</span>
                    )}
                    {info.datosFaltantes.length > 0 && (
                      <span className="text-blue-600"> | Faltan: {info.datosFaltantes.join(', ')}</span>
                    )}
                  </div>
                  <button onClick={() => generarFeedback(info.agenteNombre)} className="text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-medium shrink-0 ml-2">
                    <MessageSquare className="w-3 h-3" /> Feedback
                  </button>
                </div>
              ))}
            </div>

            {alertasConceptoDesplazado.length > 0 && (
              <div className="mt-2 pt-2 border-t border-orange-200 text-xs text-orange-700">
                <strong>Desplazados:</strong> {alertasConceptoDesplazado.map(a => `${a.agente} puso ${a.concepto} en ${a.bloque}`).join(' | ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE FEEDBACK (NO SE IMPRIME) */}
      {mensajeFeedback && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Mensaje para el Agente</h3>
            <p className="text-sm text-slate-500 mb-4">Copia y envía este mensaje por correo o WhatsApp.</p>
            <textarea 
              className="w-full h-80 p-3 border border-slate-300 rounded-lg text-sm font-sans"
              value={mensajeFeedback}
              readOnly
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setMensajeFeedback('')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cerrar</button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(mensajeFeedback);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                {copiado ? <><Check className="w-4 h-4"/> Copiado</> : <><Copy className="w-4 h-4"/> Copiar Texto</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTONES DE ACCIÓN (NO SE IMPRIMEN) */}
      <div className="flex justify-between items-center no-print">
        <button 
          onClick={() => setMostrarCostoReal(!mostrarCostoReal)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
        >
          <Eye className="w-4 h-4" /> {mostrarCostoReal ? 'Ocultar Costos Reales' : 'Ver Costos Reales'}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setMenuExportarAbierto(!menuExportarAbierto)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
          >
            <FileDown className="w-4 h-4" /> Exportar <ChevronDown className="w-4 h-4" />
          </button>
          
          {menuExportarAbierto && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
              <button 
                onClick={exportarPDF}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-blue-500" /> Imprimir / Guardar PDF
              </button>
              <button 
                onClick={exportarExcel}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors border-t border-slate-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Exportar a Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 ÁREA DE IMPRESIÓN (SOLO ESTO SE VE EN EL PDF) */}
      <div className="print-area bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-visible print:overflow-visible">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded text-sm border border-slate-300">
                {paisOrigenGlobal}
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Comparador de Cotizaciones</h2>
            </div>
            <p className="text-slate-500">Expediente: {expediente.codigo}</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <Award className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Ganador: {mejorPrecioReal.agenteNombre}</span>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 graficos-print">
          
          {/* 🔥 GRÁFICO DE BARRAS (SE ESTIRA EN EL PDF) */}
          <div className="h-72 w-full border border-slate-200 rounded-lg p-3 col-span-1 lg:col-span-2 print:col-span-2">
            <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Desglose de Costos por Agente</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosBarras} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11}} />
                <YAxis tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="Flete" stackId="a" fill="#3b82f6" name="Flete" />
                <Bar dataKey="Destino" stackId="a" fill="#f59e0b" name="Gastos Destino" />
                <Bar dataKey="Origen" stackId="a" fill="#10b981" name="Gastos Origen" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 🔥 GRÁFICO DE DISPERSIÓN (SOLO WEB) */}
          <div className="h-72 w-full border border-slate-200 rounded-lg p-3 print:hidden">
            <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Costo Real vs. Días Sobrestadía</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Días Sobrestadía" unit=" días" tick={{fontSize: 11}} domain={['dataMin - 2', 'dataMax + 2']} />
                <YAxis type="number" dataKey="y" name="Costo Real" unit=" USD" tick={{fontSize: 11}} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
                          <p className="font-bold text-slate-800">{data.name}</p>
                          <p className="text-slate-600">Costo Real: <span className="font-bold">${Number(data.y).toFixed(2)}</span></p>
                          <p className="text-slate-600">Días Sobrestadía: <span className="font-bold">{data.x}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Agentes" data={datosDispersion}>
                  {datosDispersion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🔥 TABLA (Empieza en hoja nueva) */}
        <div className="tabla-print">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-4 py-3 rounded-tl-lg">Concepto</th>
                <th className="px-4 py-3 text-center">U/M</th>
                {cotizacionesProcesadas.map(cot => {
                  let diasVigencia = null;
                  let claseBadge = 'bg-slate-700 text-slate-300';
                  let textoVigencia = 'Sin Fecha';

                  if (cot.fechaVigencia) {
                    const hoy = new Date();
                    const vencimiento = new Date(cot.fechaVigencia);
                    const diffTime = vencimiento - hoy;
                    diasVigencia = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diasVigencia < 0) {
                      claseBadge = 'bg-red-900 text-red-100 border border-red-500';
                      textoVigencia = `VENCIDA`;
                    } else if (diasVigencia <= 3) {
                      claseBadge = 'bg-red-600 text-white animate-pulse';
                      textoVigencia = `Vence en ${diasVigencia} d.`;
                    } else if (diasVigencia <= 7) {
                      claseBadge = 'bg-yellow-500 text-yellow-900';
                      textoVigencia = `Vence en ${diasVigencia} d.`;
                    } else {
                      claseBadge = 'bg-green-600 text-white';
                      textoVigencia = `${cot.fechaVigencia}`;
                    }
                  }

                  return (
                    <th key={cot.id} className={`px-4 py-3 text-center border-l border-slate-700 ${!cot.esValida ? 'bg-slate-600/50 text-slate-400' : ''}`}>
                      <div className="font-bold text-base mb-1 flex items-center justify-center gap-2">
                        {cot.agenteNombre}
                        {!cot.esValida && <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="text-xs font-normal mb-1">{cot.naviera || 'Sin Naviera'} | {cot.tipoContenedor}</div>
                      <div className="text-[11px] text-slate-300 bg-slate-700/50 rounded px-2 py-0.5 inline-flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" /> {cot.puertoOrigen || 'Sin POL'} → {cot.puertoDestino || 'Sin POD'}
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-[11px] text-slate-300 bg-slate-700/50 rounded px-2 py-0.5 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> TT: {cot.transitTime || 'N/A'} días
                        </div>
                        
                        <div className={`text-xs font-bold px-2 py-1 rounded-md w-full ${claseBadge}`}>
                          {textoVigencia}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              
              {conceptosUnicos.filter(c => c.tipo === 'flete').length > 0 && (
                <tr className="bg-slate-100">
                  <td colSpan={2 + cotizaciones.length} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Flete Internacional</div>
                  </td>
                </tr>
              )}
              {conceptosUnicos.filter(c => c.tipo === 'flete').map(concepto => {
                const minVal = getMinValue(concepto.key, 'flete');
                return (
                  <tr key={concepto.key} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 capitalize">{concepto.nombre}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{concepto.unidadMedida}</td>
                    {cotizacionesProcesadas.map(cot => {
                      const monto = getMonto(cot, concepto.key, 'flete');
                      const esMinimo = monto === minVal && monto !== null;
                      return (
                        <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${!cot.esValida ? 'bg-slate-100 text-slate-400' : (esMinimo ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600')}`}>
                          {monto !== null ? `$${monto.toFixed(2)}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {conceptosUnicos.filter(c => c.tipo === 'destino').length > 0 && (
                <tr className="bg-slate-100">
                  <td colSpan={2 + cotizaciones.length} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Gastos en Destino (Locales)</div>
                  </td>
                </tr>
              )}
              {conceptosUnicos.filter(c => c.tipo === 'destino').map(concepto => {
                const minVal = getMinValue(concepto.key, 'destino');
                return (
                  <tr key={concepto.key} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 capitalize">{concepto.nombre}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{concepto.unidadMedida}</td>
                    {cotizacionesProcesadas.map(cot => {
                      const monto = getMonto(cot, concepto.key, 'destino');
                      const esMinimo = monto === minVal && monto !== null;
                      return (
                        <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${!cot.esValida ? 'bg-slate-100 text-slate-400' : (esMinimo ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600')}`}>
                          {monto !== null ? `$${monto.toFixed(2)}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              <tr className="bg-slate-200 text-slate-900 border-t-2 border-slate-300">
                <td colSpan={2} className="px-4 py-4 font-bold text-right">TOTAL GENERAL:</td>
                {cotizacionesProcesadas.map(cot => (
                  <td key={cot.id} className={`px-4 py-4 text-center font-bold text-base border-l border-slate-300 ${!cot.esValida ? 'text-slate-500' : ''}`}>
                    ${cot.totalGeneral?.toFixed(2)}
                  </td>
                ))}
              </tr>
              {mostrarCostoReal && (
                <tr className="bg-blue-100 text-blue-900">
                  <td colSpan={2} className="px-4 py-4 font-bold text-right">COSTO REAL AJUSTADO:</td>
                  {cotizacionesProcesadas.map((cot) => (
                    <td key={cot.id} className={`px-4 py-4 text-center font-bold text-lg border-l border-blue-200 ${!cot.esValida ? 'text-slate-500' : (cot.agenteNombre === mejorPrecioReal.agenteNombre ? 'text-green-700' : '')}`}>
                      ${cot.costoRealAjustado?.toFixed(2)}
                    </td>
                  ))}
                </tr>
              )}
              <tr>
                <td colSpan={2} className="px-4 py-3 font-medium text-slate-600 text-right">Condición de Pago:</td>
                {cotizacionesProcesadas.map(cot => (
                  <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${!cot.esValida ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    {cot.condicionPago || 'CONTADO'}
                  </td>
                ))}
              </tr>
              <tr>
                <td colSpan={2} className="px-4 py-3 font-medium text-slate-600 text-right">Días Sobrestadía / Almacenaje:</td>
                {cotizacionesProcesadas.map(cot => {
                  let colorClass = 'text-slate-600';
                  if (!cot.esValida) colorClass = 'text-slate-400';
                  else if ((cot.diasSobrestadia || 0) < 15) colorClass = 'text-red-600 font-bold';
                  else if ((cot.diasSobrestadia || 0) < 21) colorClass = 'text-yellow-600 font-bold';
                  else colorClass = 'text-green-600 font-bold';

                  return (
                    <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${colorClass}`}>
                      {cot.diasSobrestadia !== undefined ? cot.diasSobrestadia : 'N/A'} / {cot.diasAlmacenaje !== undefined ? cot.diasAlmacenaje : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-5 rounded-lg flex gap-4 text-sm bg-blue-50 border border-blue-200 text-blue-900">
          <Calculator className="w-8 h-8 flex-shrink-0 text-blue-600" />
          <div>
            <h4 className="font-bold text-lg mb-1">Análisis y Justificación del Sistema</h4>
            <p className="leading-relaxed">{mensajeAnalisis}</p>
          </div>
        </div>
      </div>
    </div>
  );
}