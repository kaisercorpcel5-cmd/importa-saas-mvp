import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, AlertTriangle, Box, Weight, Calculator } from 'lucide-react';
import { crearProforma, obtenerProformaPorExpediente, actualizarProforma } from '../services/proformasService';
import { obtenerProveedores } from '../services/proveedoresService';

export default function Proforma({ expediente, onVolver }) {
  const [proveedor, setProveedor] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [moneda, setMoneda] = useState('USD');
  const [tieneCertificado, setTieneCertificado] = useState(true); 
  
  const [series, setSeries] = useState([
    { 
      id: Date.now(), 
      referencia: '', // 🔥 NUEVO CAMPO
      hsCode: '', 
      adValoremPct: 0, 
      items: [{ id: Date.now() + 1, sku: '', descripcion: '', unidad: 'U', cantidad: 1, precioUnitarioFOB: 0, pesoNeto: 0, cbm: 0 }] 
    }
  ]);

  const [listaProveedores, setListaProveedores] = useState([]);
  const [proformaExistenteId, setProformaExistenteId] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const dataProv = await obtenerProveedores();
      setListaProveedores(dataProv);

      const proformaGuardada = await obtenerProformaPorExpediente(expediente.id);
      if (proformaGuardada) {
        setProveedor(proformaGuardada.proveedor || '');
        setIncoterm(proformaGuardada.incoterm || 'FOB');
        setMoneda(proformaGuardada.moneda || 'USD');
        setTieneCertificado(proformaGuardada.tieneCertificado ?? true);
        setSeries(proformaGuardada.series || []);
        setProformaExistenteId(proformaGuardada.id);
      }
    };
    cargarDatos();
  }, [expediente.id]);

  const agregarSerie = () => {
    setSeries([...series, { 
      id: Date.now(), 
      referencia: '', // 🔥 NUEVO CAMPO
      hsCode: '', 
      adValoremPct: 0, 
      items: [{ id: Date.now() + 1, sku: '', descripcion: '', unidad: 'U', cantidad: 1, precioUnitarioFOB: 0, pesoNeto: 0, cbm: 0 }] 
    }]);
  };

  const agregarItem = (serieId) => {
    const nuevasSeries = series.map(s => {
      if (s.id === serieId) {
        return { ...s, items: [...s.items, { id: Date.now(), sku: '', descripcion: '', unidad: 'U', cantidad: 1, precioUnitarioFOB: 0, pesoNeto: 0, cbm: 0 }] };
      }
      return s;
    });
    setSeries(nuevasSeries);
  };

  const actualizarSerie = (serieId, campo, valor) => {
    const nuevasSeries = series.map(s => s.id === serieId ? { ...s, [campo]: valor } : s);
    setSeries(nuevasSeries);
  };

  const actualizarItem = (serieId, itemId, campo, valor) => {
    const nuevasSeries = series.map(s => {
      if (s.id === serieId) {
        return {
          ...s,
          items: s.items.map(i => i.id === itemId ? { ...i, [campo]: valor } : i)
        };
      }
      return s;
    });
    setSeries(nuevasSeries);
  };

  const autoCalcular = (serieId, tipo, valorTotal) => {
    const totalValor = Number(valorTotal);
    if (totalValor <= 0) return;

    const nuevasSeries = series.map(s => {
      if (s.id === serieId) {
        let cantidadTotal = 0;
        s.items.forEach(i => cantidadTotal += Number(i.cantidad));

        if (cantidadTotal === 0) return s;

        const valorUnitario = totalValor / cantidadTotal;

        return {
          ...s,
          items: s.items.map(i => ({
            ...i,
            [tipo]: valorUnitario
          }))
        };
      }
      return s;
    });
    setSeries(nuevasSeries);
  };

  let pesoTotal = 0;
  let cbmTotal = 0;
  let fobTotal = 0;

  series.forEach(s => {
    s.items.forEach(i => {
      const cant = Number(i.cantidad) || 0;
      pesoTotal += (cant * (Number(i.pesoNeto) || 0));
      cbmTotal += (cant * (Number(i.cbm) || 0));
      fobTotal += (cant * (Number(i.precioUnitarioFOB) || 0));
    });
  });

  const excedePeso = pesoTotal > 26000;
  const excedeCBM = cbmTotal > 68;

  const guardarProforma = async () => {
    if (!proveedor || series.some(s => !s.hsCode)) {
      alert("Por favor, selecciona el proveedor y completa el HS Code de todas las series.");
      return;
    }
    
    if (excedePeso || excedeCBM) {
      const confirmar = window.confirm("⚠️ La carga excede la capacidad de un contenedor 40HC. ¿Estás seguro de guardar?");
      if (!confirmar) return;
    }

    const provSeleccionado = listaProveedores.find(p => p.nombre === proveedor);

    const datos = {
      expedienteId: expediente.id,
      proveedor,
      paisOrigen: provSeleccionado ? provSeleccionado.pais : 'CN',
      incoterm,
      moneda,
      tieneCertificado,
      pesoTotal,
      cbmTotal,
      series: series.map(s => ({
        ...s,
        adValoremPct: tieneCertificado ? 0 : s.adValoremPct, 
        items: s.items.map(i => ({
          ...i,
          cantidad: Number(i.cantidad),
          precioUnitarioFOB: Number(i.precioUnitarioFOB),
          pesoNeto: Number(i.pesoNeto),
          cbm: Number(i.cbm)
        }))
      }))
    };

    if (proformaExistenteId) {
      await actualizarProforma(proformaExistenteId, datos);
      alert("¡Proforma actualizada con éxito!");
    } else {
      const nuevoId = await crearProforma(datos);
      setProformaExistenteId(nuevoId);
      alert("¡Proforma guardada con éxito!");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onVolver} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cargar Proforma</h2>
          <p className="text-slate-500">Expediente: {expediente.codigo}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
          <select 
            value={proveedor} 
            onChange={(e) => setProveedor(e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            required
          >
            <option value="">Selecciona un proveedor...</option>
            {listaProveedores.map((prov) => (
              <option key={prov.id} value={prov.nombre}>
                {prov.nombre} ({prov.pais})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Incoterm</label>
          <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="EXW">EXW</option>
            <option value="FCA">FCA</option>
            <option value="FOB">FOB</option>
            <option value="CFR">CFR</option>
            <option value="CIF">CIF</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
          <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={tieneCertificado} 
              onChange={(e) => setTieneCertificado(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-slate-700">¿Certificado de Origen? (0% AV)</span>
          </label>
        </div>
      </div>

      <div className="space-y-6">
        {series.map((serie, index) => (
          <div key={serie.id} className="border border-slate-300 rounded-lg p-4 bg-white shadow-sm relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-blue-800">Serie {index + 1}</h3>
                {/* 🔥 NUEVO CAMPO DE REFERENCIA */}
                <input 
                  type="text" 
                  placeholder="Ej. Contenedor 1 / Proforma A" 
                  value={serie.referencia || ''} 
                  onChange={(e) => actualizarSerie(serie.id, 'referencia', e.target.value)} 
                  className="px-2 py-1 border border-slate-300 rounded text-sm text-slate-600 w-64"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-600">HS Code:</label>
                  <input type="text" value={serie.hsCode} onChange={(e) => actualizarSerie(serie.id, 'hsCode', e.target.value)} className="px-2 py-1 border border-slate-300 rounded w-32" placeholder="3920.10.00.00" />
                </div>
                {!tieneCertificado && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Ad Valorem (%):</label>
                    <input type="number" step="0.1" value={serie.adValoremPct || 0} onChange={(e) => actualizarSerie(serie.id, 'adValoremPct', Number(e.target.value))} className="px-2 py-1 border border-slate-300 rounded w-20 bg-yellow-50" />
                  </div>
                )}
              </div>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Descripción</th>
                  <th className="px-2 py-2 w-16">U/M</th>
                  <th className="px-2 py-2 w-20">Cant.</th>
                  <th className="px-2 py-2 w-24">P. FOB</th>
                  <th className="px-2 py-2 w-24">Peso (kg)</th>
                  <th className="px-2 py-2 w-24">CBM</th>
                  <th className="px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {serie.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="p-1"><input type="text" value={item.sku} onChange={(e) => actualizarItem(serie.id, item.id, 'sku', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="R50-TR" /></td>
                    <td className="p-1"><input type="text" value={item.descripcion} onChange={(e) => actualizarItem(serie.id, item.id, 'descripcion', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="Rollo plástico" /></td>
                    <td className="p-1">
                      <select value={item.unidad} onChange={(e) => actualizarItem(serie.id, item.id, 'unidad', e.target.value)} className="w-full px-1 py-1 border border-slate-200 rounded">
                        <option value="U">U</option>
                        <option value="KG">KG</option>
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                        <option value="ROLLO">ROLLO</option>
                      </select>
                    </td>
                    <td className="p-1"><input type="number" value={item.cantidad} onChange={(e) => actualizarItem(serie.id, item.id, 'cantidad', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" /></td>
                    <td className="p-1"><input type="number" step="0.01" value={item.precioUnitarioFOB} onChange={(e) => actualizarItem(serie.id, item.id, 'precioUnitarioFOB', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" /></td>
                    <td className="p-1"><input type="number" step="0.01" value={item.pesoNeto} onChange={(e) => actualizarItem(serie.id, item.id, 'pesoNeto', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded bg-blue-50" /></td>
                    <td className="p-1"><input type="number" step="0.001" value={item.cbm} onChange={(e) => actualizarItem(serie.id, item.id, 'cbm', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded bg-blue-50" /></td>
                    <td className="p-1 text-center">
                      {serie.items.length > 1 && (
                        <button onClick={() => {
                          const nuevosItems = serie.items.filter(i => i.id !== item.id);
                          setSeries(series.map(s => s.id === serie.id ? { ...s, items: nuevosItems } : s));
                        }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button onClick={() => agregarItem(serie.id)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
              <Plus className="w-4 h-4" /> Agregar SKU a esta serie
            </button>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 bg-slate-50 p-3 rounded-lg">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calculator className="w-4 h-4"/> Auto-Calcular:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Peso Total (kg):</span>
                <input type="number" placeholder="Ej. 6820" onChange={(e) => autoCalcular(serie.id, 'pesoNeto', e.target.value)} className="w-24 px-2 py-1 border border-slate-300 rounded text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">CBM Total:</span>
                <input type="number" placeholder="Ej. 65.10" onChange={(e) => autoCalcular(serie.id, 'cbm', e.target.value)} className="w-24 px-2 py-1 border border-slate-300 rounded text-sm" />
              </div>
            </div>

          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Box className="w-3 h-3"/> Total CBM</span>
            <span className={`text-lg font-bold ${excedeCBM ? 'text-red-600' : 'text-slate-800'}`}>{cbmTotal.toFixed(2)} m³</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Weight className="w-3 h-3"/> Peso Total</span>
            <span className={`text-lg font-bold ${excedePeso ? 'text-red-600' : 'text-slate-800'}`}>{pesoTotal.toFixed(2)} kg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">Total {incoterm}</span>
            <span className="text-lg font-bold text-blue-800">USD {fobTotal.toFixed(2)}</span>
          </div>
        </div>

        {(excedePeso || excedeCBM) && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">¡Alerta! Excede capacidad de 1 contenedor 40HC.</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
        <button onClick={agregarSerie} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2">
          <Plus className="w-5 h-5" /> Agregar Otra Serie (Partida)
        </button>
        <button onClick={guardarProforma} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm">
          <Save className="w-5 h-5" /> Guardar Proforma Completa
        </button>
      </div>
    </div>
  );
}