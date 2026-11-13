import { useState, useEffect } from 'react';
import { obtenerProformaPorExpediente } from '../services/proformasService';
import { obtenerCotizacionesPorExpediente } from '../services/cotizacionesFleteService';
import { calcularAduanas } from '../logic/calculosAduanas';
import { Calculator, CheckCircle2, DollarSign, Percent } from 'lucide-react';

export default function Costeo({ expediente }) {
  const [proforma, setProforma] = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [agenteElegidoId, setAgenteElegidoId] = useState('');
  
  const [tipoCambio, setTipoCambio] = useState(3.75); 
  const [percepcionPct, setPercepcionPct] = useState(3.5); 
  const [tributosExtraPEN, setTributosExtraPEN] = useState(0); // 🔥 ISC / Antidumping

  const [calculos, setCalculos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      const dataProf = await obtenerProformaPorExpediente(expediente.id);
      const dataCot = await obtenerCotizacionesPorExpediente(expediente.id);
      setProforma(dataProf);
      setCotizaciones(dataCot);
      
      if (dataCot.length > 0) {
        setAgenteElegidoId(dataCot[0].id);
      }
      setCargando(false);
    };
    cargarDatos();
  }, [expediente.id]);

  useEffect(() => {
    if (!proforma || !agenteElegidoId) return;

    const agente = cotizaciones.find(c => c.id === agenteElegidoId);
    if (!agente) return;

    // 1. Calcular FOB Total de toda la Proforma
    let fobTotalGeneral = 0;
    proforma.series.forEach(serie => {
      serie.items.forEach(item => {
        fobTotalGeneral += (item.cantidad * item.precioUnitarioFOB);
      });
    });

    // 2. Obtener Flete y Seguro del Agente
    const fleteUSD = agente.totalFlete;
    const seguroUSD = agente.conceptosFlete?.find(c => c.conceptoId === 'seguro')?.montoTotal || 0;

    // 3. Calcular Ad Valorem por Serie (Prorrateando Flete y Seguro por FOB)
    let totalAdValoremPEN = 0;
    
    // Si la proforma TIENE certificado, el Ad Valorem es 0 para todo.
    if (!proforma.tieneCertificado) {
      proforma.series.forEach(serie => {
        let fobSerie = 0;
        serie.items.forEach(item => {
          fobSerie += (item.cantidad * item.precioUnitarioFOB);
        });

        const proporcion = fobTotalGeneral > 0 ? (fobSerie / fobTotalGeneral) : 0;
        const fleteSerie = fleteUSD * proporcion;
        const seguroSerie = seguroUSD * proporcion;

        const cifSerieUSD = fobSerie + fleteSerie + seguroSerie;
        const cifSeriePEN = cifSerieUSD * tipoCambio;

        const adValoremSeriePct = (serie.adValoremPct || 0) / 100;
        totalAdValoremPEN += (cifSeriePEN * adValoremSeriePct);
      });
    }

    // 4. Calcular el resto de tributos
    const cifUSD = fobTotalGeneral + fleteUSD + seguroUSD;
    const cifPEN = cifUSD * tipoCambio;
    const ipmPEN = cifPEN * 0.02;
    const igvPEN = (cifPEN + totalAdValoremPEN + ipmPEN) * 0.18;
    const basePercepcion = cifPEN + totalAdValoremPEN + igvPEN + ipmPEN;
    const percepcionPEN = basePercepcion * (percepcionPct / 100);

    // 🔥 Sumamos los tributos extra (ISC / Antidumping)
    const totalDerechosPEN = totalAdValoremPEN + ipmPEN + igvPEN + percepcionPEN + tributosExtraPEN;
    const totalDerechosUSD = totalDerechosPEN / tipoCambio;

    // 5. Landed Cost Total
    const gastosLocalesUSD = agente.totalDestino; 
    const landedCostTotalUSD = fobTotalGeneral + fleteUSD + seguroUSD + gastosLocalesUSD + totalDerechosUSD;

    setCalculos({
      fobTotal: fobTotalGeneral,
      fleteUSD,
      seguroUSD,
      gastosLocalesUSD,
      cifUSD,
      cifPEN,
      adValoremPEN: totalAdValoremPEN,
      ipmPEN,
      igvPEN,
      percepcionPEN,
      totalDerechosPEN,
      totalDerechosUSD,
      landedCostTotalUSD,
      agenteNombre: agente.agenteNombre
    });

  }, [agenteElegidoId, tipoCambio, percepcionPct, tributosExtraPEN, proforma, cotizaciones]);

  if (cargando) return <p className="text-center text-slate-500 mt-10">Cargando datos...</p>;
  if (!proforma) return <p className="text-center text-slate-500 mt-10">Primero debes cargar una Proforma.</p>;
  if (cotizaciones.length === 0) return <p className="text-center text-slate-500 mt-10">Primero debes registrar cotizaciones.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Costeo Final (Landed Cost)</h2>
        <p className="text-slate-500 mb-6">Selecciona el agente y ajusta los tributos. El Ad Valorem se calcula por cada serie de la proforma.</p>

        <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Agente de Carga Ganador</label>
            <select 
              value={agenteElegidoId} 
              onChange={(e) => setAgenteElegidoId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            >
              {cotizaciones.map(c => (
                <option key={c.id} value={c.id}>{c.agenteNombre} - Total: ${c.totalGeneral?.toFixed(2)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Tipo de Cambio</label>
            <input 
              type="number" step="0.01" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1"><Percent className="w-3 h-3"/> Percepción SUNAT (%)</label>
            <input 
              type="number" step="0.1" value={percepcionPct} onChange={(e) => setPercepcionPct(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" 
            />
          </div>

          {/* 🔥 TRIBUTOS EXTRA */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">Tributos Extra / ISC / Antidumping (PEN)</label>
            <input 
              type="number" step="0.01" value={tributosExtraPEN} onChange={(e) => setTributosExtraPEN(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm" 
            />
          </div>
        </div>

        {calculos && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-800 text-white px-4 py-3 font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5" /> Derechos de Aduana (SUNAT)
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>CIF Total (USD)</span> <span className="font-medium">${calculos.cifUSD.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>CIF Total (PEN)</span> <span className="font-medium">S/ {calculos.cifPEN.toFixed(2)}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-100"><span>Ad Valorem</span> <span className="font-medium">S/ {calculos.adValoremPEN.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IGV (18%)</span> <span className="font-medium">S/ {calculos.igvPEN.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IPM (2%)</span> <span className="font-medium">S/ {calculos.ipmPEN.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Percepción ({percepcionPct}%)</span> <span className="font-medium">S/ {calculos.percepcionPEN.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Tributos Extra</span> <span className="font-medium">S/ {tributosExtraPEN.toFixed(2)}</span></div>
                <div className="flex justify-between pt-2 border-t-2 border-slate-200 font-bold text-base text-blue-800">
                  <span>TOTAL DERECHOS (PEN)</span> 
                  <span>S/ {calculos.totalDerechosPEN.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-blue-600 text-white px-4 py-3 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Resumen Landed Cost (USD)
              </div>
              <div className="p-4 space-y-2 text-sm text-blue-900">
                <div className="flex justify-between"><span>Mercadería (FOB)</span> <span className="font-medium">${calculos.fobTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Flete Marítimo</span> <span className="font-medium">${calculos.fleteUSD.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Seguro</span> <span className="font-medium">${calculos.seguroUSD.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Gastos Locales (Agente)</span> <span className="font-medium">${calculos.gastosLocalesUSD.toFixed(2)}</span></div>
                <div className="flex justify-between text-blue-700"><span>Derechos Aduana (en USD)</span> <span className="font-medium">${calculos.totalDerechosUSD.toFixed(2)}</span></div>
                <div className="flex justify-between pt-3 border-t-2 border-blue-200 font-bold text-lg">
                  <span>COSTO TOTAL LANDED</span> 
                  <span>${calculos.landedCostTotalUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}