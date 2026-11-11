import { useState, useEffect, useRef } from 'react';
import { obtenerCotizacionesPorExpediente } from '../services/cotizacionesFleteService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, LabelList } from 'recharts';
import { CheckCircle2, FileDown, AlertCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Comparador({ expediente }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const reporteRef = useRef();

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const data = await obtenerCotizacionesPorExpediente(expediente.id);
      const ordenadas = data.sort((a, b) => a.totalGeneral - b.totalGeneral);
      setCotizaciones(ordenadas);
      setCargando(false);
    };
    cargarDatos();
  }, [expediente.id]);

  const exportarPDF = async () => {
    const input = reporteRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Comparador_${expediente.codigo}.pdf`);
  };

  if (cargando) return <p className="text-center text-slate-500 mt-10">Cargando comparador...</p>;
  if (cotizaciones.length === 0) return <p className="text-center text-slate-500 mt-10">No hay cotizaciones para comparar.</p>;

  // --- Datos para Gráfico de Barras ---
  const datosBarras = cotizaciones.map(cot => ({
    name: cot.agenteNombre.split(' ')[0], 
    Flete: cot.totalFlete,
    Destino: cot.totalDestino,
    Origen: cot.totalOrigen
  }));

  // --- Datos para Gráfico de Dispersión ---
  const datosDispersion = cotizaciones.map(cot => {
    let color = '#10b981'; // Verde (Seguro >= 21 días)
    if (cot.diasLibresDestino < 15) color = '#ef4444'; // Rojo (Riesgo < 15 días)
    else if (cot.diasLibresDestino < 21) color = '#f59e0b'; // Amarillo (Alerta 15-20 días)

    return {
      x: cot.diasLibresDestino,
      y: cot.totalGeneral,
      name: cot.agenteNombre,
      fill: color
    };
  });

  // --- Lógica para la recomendación inteligente ---
  const mejorPrecio = cotizaciones[0];
  const mejorDiasLibres = [...cotizaciones].sort((a, b) => b.diasLibresDestino - a.diasLibresDestino)[0];
  
  let mensajeAnalisis = `La mejor opción en costo total es ${mejorPrecio.agenteNombre} ($${mejorPrecio.totalGeneral?.toFixed(2)}). `;
  let severidadAlerta = "info";

  if (mejorPrecio.diasLibresDestino < 15) {
    severidadAlerta = "danger";
    mensajeAnalisis += `¡CUIDADO! Tiene solo ${mejorPrecio.diasLibresDestino} días libres en destino, lo que representa un ALTO RIESGO de pago de demoras. `;
    if (mejorDiasLibres.agenteNombre !== mejorPrecio.agenteNombre) {
      mensajeAnalisis += `Te recomendamos evaluar pagar un poco más con ${mejorDiasLibres.agenteNombre} ($${mejorDiasLibres.totalGeneral?.toFixed(2)}) que te da ${mejorDiasLibres.diasLibresDestino} días libres.`;
    }
  } else if (mejorPrecio.diasLibresDestino >= 15 && mejorPrecio.diasLibresDestino < 21) {
    severidadAlerta = "warning";
    mensajeAnalisis += `Tiene ${mejorPrecio.diasLibresDestino} días libres, lo cual es un margen ajustado. Si hay congestión en el puerto, el costo por demoras podría comerse el ahorro. `;
    if (mejorDiasLibres.agenteNombre !== mejorPrecio.agenteNombre) {
      mensajeAnalisis += `El agente ${mejorDiasLibres.agenteNombre} te ofrece ${mejorDiasLibres.diasLibresDestino} días por una diferencia de $${(mejorDiasLibres.totalGeneral - mejorPrecio.totalGeneral).toFixed(2)}.`;
    }
  } else {
    severidadAlerta = "success";
    mensajeAnalisis += `Además, cuenta con un excelente margen de días libres (${mejorPrecio.diasLibresDestino}), lo que mitiga riesgos operativos.`;
  }

  // --- Lógica de tabla ---
  const conceptosUnicos = [];
  const agregarConceptoUnico = (tipo, item) => {
    const existe = conceptosUnicos.find(c => c.id === item.conceptoId && c.tipo === tipo);
    if (!existe) {
      conceptosUnicos.push({
        id: item.conceptoId,
        tipo: tipo,
        nombre: item.conceptoId === 'manual' ? item.nombreCustom : item.conceptoId.replace(/_/g, ' ').toUpperCase(),
        unidadMedida: item.unidadMedida
      });
    }
  };

  cotizaciones.forEach(cot => {
    (cot.conceptosOrigen || []).forEach(i => agregarConceptoUnico('origen', i));
    (cot.conceptosFlete || []).forEach(i => agregarConceptoUnico('flete', i));
    (cot.conceptosDestino || []).forEach(i => agregarConceptoUnico('destino', i));
  });

  const getMonto = (cot, conceptoId, tipo) => {
    let lista = tipo === 'origen' ? cot.conceptosOrigen : tipo === 'flete' ? cot.conceptosFlete : cot.conceptosDestino;
    const item = (lista || []).find(i => i.conceptoId === conceptoId);
    return item ? (item.cantidad * item.tarifa) : null;
  };

  const getMinValue = (conceptoId, tipo) => {
    const valores = cotizaciones.map(cot => getMonto(cot, conceptoId, tipo)).filter(v => v !== null && v > 0);
    return valores.length > 0 ? Math.min(...valores) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={exportarPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
        >
          <FileDown className="w-4 h-4" /> Exportar a PDF
        </button>
      </div>

      <div ref={reporteRef} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Comparador de Cotizaciones</h2>
            <p className="text-slate-500">Expediente: {expediente.codigo} | Análisis de tarifas por agente.</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Mejor Precio: {mejorPrecio.agenteNombre}
            </span>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          <div className="h-72 w-full">
            <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Desglose de Costos (USD)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosBarras} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11}} />
                <YAxis tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => `$${value}`} />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="Flete" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Destino" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Origen" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-72 w-full">
            <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Balance: Costo Total vs. Días Libres Destino</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Días Libres" unit=" días" tick={{fontSize: 11}} domain={[0, 'dataMax + 5']} />
                <YAxis type="number" dataKey="y" name="Costo Total" unit=" USD" tick={{fontSize: 11}} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name === 'Costo Total' ? `$${value}` : value} />
                <Scatter name="Agentes" data={datosDispersion}>
                  {datosDispersion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="name" position="top" style={{ fontSize: '10px', fill: '#64748b' }} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* TABLA COMPARATIVA */}
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-4 py-3 rounded-tl-lg">Concepto</th>
              <th className="px-4 py-3 text-center">U/M</th>
              {cotizaciones.map(cot => (
                <th key={cot.id} className="px-4 py-3 text-center border-l border-slate-700">
                  {/* 🔥 BANDERA Y RUTA */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img 
                      src={`https://flagcdn.com/w20/${(cot.paisOrigen || 'pe').toLowerCase()}.png`} 
                      alt={cot.paisOrigen} 
                      className="w-5 h-3.5 rounded-sm shadow-sm"
                      title={`Origen: ${cot.paisOrigen || 'No definido'}`}
                    />
                    <div className="font-bold text-base">{cot.agenteNombre}</div>
                  </div>
                  <div className="text-xs text-slate-300 font-normal">{cot.naviera} | {cot.tipoContenedor}</div>
                  <div className="text-[10px] text-blue-200 mt-1 bg-slate-700/50 rounded px-2 py-0.5 inline-block">
                    {cot.puertoOrigen || 'Sin POL'} → {cot.puertoDestino || 'Sin POD'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-200">
            
            {/* FLETE */}
            {conceptosUnicos.filter(c => c.tipo === 'flete').length > 0 && (
              <>
                <tr className="bg-slate-100">
                  <td colSpan={2 + cotizaciones.length} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase tracking-wider">Flete Internacional</td>
                </tr>
                {conceptosUnicos.filter(c => c.tipo === 'flete').map(concepto => {
                  const minVal = getMinValue(concepto.id, 'flete');
                  return (
                    <tr key={concepto.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">{concepto.nombre}</td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{concepto.unidadMedida}</td>
                      {cotizaciones.map(cot => {
                        const monto = getMonto(cot, concepto.id, 'flete');
                        const esMinimo = monto === minVal && monto !== null;
                        return (
                          <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${esMinimo ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600'}`}>
                            {monto !== null ? `$${monto.toFixed(2)}` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            )}

            {/* DESTINO */}
            {conceptosUnicos.filter(c => c.tipo === 'destino').length > 0 && (
              <>
                <tr className="bg-slate-100">
                  <td colSpan={2 + cotizaciones.length} className="px-4 py-2 font-bold text-slate-700 text-xs uppercase tracking-wider">Gastos en Destino (Locales)</td>
                </tr>
                {conceptosUnicos.filter(c => c.tipo === 'destino').map(concepto => {
                  const minVal = getMinValue(concepto.id, 'destino');
                  return (
                    <tr key={concepto.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">{concepto.nombre}</td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{concepto.unidadMedida}</td>
                      {cotizaciones.map(cot => {
                        const monto = getMonto(cot, concepto.id, 'destino');
                        const esMinimo = monto === minVal && monto !== null;
                        return (
                          <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${esMinimo ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600'}`}>
                            {monto !== null ? `$${monto.toFixed(2)}` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            )}

            {/* TOTALES */}
            <tr className="bg-blue-50 text-blue-900 border-t-2 border-blue-200">
              <td colSpan={2} className="px-4 py-4 font-bold text-right">TOTAL GENERAL:</td>
              {cotizaciones.map((cot, index) => (
                <td key={cot.id} className={`px-4 py-4 text-center font-bold text-lg border-l border-blue-200 ${index === 0 ? 'text-green-600' : ''}`}>
                  ${cot.totalGeneral?.toFixed(2)}
                </td>
              ))}
            </tr>
            
            {/* DÍAS LIBRES CON COLORES */}
            <tr>
              <td colSpan={2} className="px-4 py-3 font-medium text-slate-600 text-right">Días Libres (Origen / Destino):</td>
              {cotizaciones.map(cot => {
                let colorClass = 'text-slate-600';
                if (cot.diasLibresDestino < 15) colorClass = 'text-red-600 font-bold';
                else if (cot.diasLibresDestino < 21) colorClass = 'text-yellow-600 font-bold';
                else colorClass = 'text-green-600 font-bold';

                return (
                  <td key={cot.id} className={`px-4 py-3 text-center border-l border-slate-100 ${colorClass}`}>
                    {cot.diasLibresOrigen} / {cot.diasLibresDestino}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* ANÁLISIS INTELIGENTE DINÁMICO */}
        <div className={`mt-6 p-4 rounded-lg flex gap-3 text-sm border ${
          severidadAlerta === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 
          severidadAlerta === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 
          'bg-green-50 border-green-200 text-green-800'
        }`}>
          {severidadAlerta === 'danger' ? <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" /> : 
           severidadAlerta === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600" /> : 
           <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />}
          <p>
            <strong>Análisis del sistema:</strong> {mensajeAnalisis}
          </p>
        </div>
      </div>
    </div>
  );
}