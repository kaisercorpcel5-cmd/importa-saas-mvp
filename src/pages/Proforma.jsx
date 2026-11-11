import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { crearProforma, obtenerProformaPorExpediente, actualizarProforma } from '../services/proformasService';
import { obtenerProveedores } from '../services/proveedoresService';

export default function Proforma({ expediente, onVolver }) {
  const [proveedor, setProveedor] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [moneda, setMoneda] = useState('USD');
  const [series, setSeries] = useState([
    { id: Date.now(), hsCode: '', items: [{ id: Date.now() + 1, sku: '', descripcion: '', cantidad: 1, precioUnitarioFOB: 0 }] }
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
        setSeries(proformaGuardada.series || []);
        setProformaExistenteId(proformaGuardada.id);
      }
    };
    cargarDatos();
  }, [expediente.id]);

  const agregarSerie = () => {
    setSeries([...series, { id: Date.now(), hsCode: '', items: [{ id: Date.now() + 1, sku: '', descripcion: '', cantidad: 1, precioUnitarioFOB: 0 }] }]);
  };

  const agregarItem = (serieId) => {
    const nuevasSeries = series.map(s => {
      if (s.id === serieId) {
        return { ...s, items: [...s.items, { id: Date.now(), sku: '', descripcion: '', cantidad: 1, precioUnitarioFOB: 0 }] };
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

  const guardarProforma = async () => {
    if (!proveedor || series.some(s => !s.hsCode)) {
      alert("Por favor, selecciona el proveedor y completa el HS Code de todas las series.");
      return;
    }

    // 🔥 BUSCAMOS EL PROVEEDOR PARA EXTRAER SU PAÍS
    const provSeleccionado = listaProveedores.find(p => p.nombre === proveedor);

    const datos = {
      expedienteId: expediente.id,
      proveedor,
      paisOrigen: provSeleccionado ? provSeleccionado.pais : 'CN', // 🔥 NUEVO CAMPO GUARDADO
      incoterm,
      moneda,
      series: series.map(s => ({
        ...s,
        items: s.items.map(i => ({
          ...i,
          cantidad: Number(i.cantidad),
          precioUnitarioFOB: Number(i.precioUnitarioFOB)
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

      <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
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
            <option value="FOB">FOB</option>
            <option value="CIF">CIF</option>
            <option value="EXW">EXW</option>
            <option value="FCA">FCA</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
          <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {series.map((serie, index) => (
          <div key={serie.id} className="border border-slate-300 rounded-lg p-4 bg-white shadow-sm relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-blue-800">Serie {index + 1}</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">HS Code (Partida):</label>
                <input type="text" value={serie.hsCode} onChange={(e) => actualizarSerie(serie.id, 'hsCode', e.target.value)} className="px-2 py-1 border border-slate-300 rounded" placeholder="3920.10.00.00" />
              </div>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Descripción</th>
                  <th className="px-2 py-2 w-24">Cantidad</th>
                  <th className="px-2 py-2 w-32">P. Unit FOB</th>
                  <th className="px-2 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {serie.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="p-1"><input type="text" value={item.sku} onChange={(e) => actualizarItem(serie.id, item.id, 'sku', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="R50-TR" /></td>
                    <td className="p-1"><input type="text" value={item.descripcion} onChange={(e) => actualizarItem(serie.id, item.id, 'descripcion', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="Rollo plástico" /></td>
                    <td className="p-1"><input type="number" value={item.cantidad} onChange={(e) => actualizarItem(serie.id, item.id, 'cantidad', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" /></td>
                    <td className="p-1"><input type="number" step="0.01" value={item.precioUnitarioFOB} onChange={(e) => actualizarItem(serie.id, item.id, 'precioUnitarioFOB', e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded" /></td>
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
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
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