export const CATALOGO_CONCEPTOS = [
  // ==========================================
  // FLETE INTERNACIONAL (No afecto a IGV en Perú)
  // ==========================================
  { id: 'ocean_freight', nombre: 'Ocean Freight (Flete Marítimo)', tipo: 'flete', afectoIGV: false, unidadMedida: 'CONT' },
  { id: 'baf_fsc', nombre: 'BAF / FSC (Recargo Combustible)', tipo: 'flete', afectoIGV: false, unidadMedida: 'CONT' },
  { id: 'seguro', nombre: 'Seguro de Carga Internacional', tipo: 'flete', afectoIGV: false, unidadMedida: 'BL' },

  // ==========================================
  // GASTOS EN ORIGEN (EXW / FCA) - No afecto a IGV
  // ==========================================
  { id: 'pick_up', nombre: 'Pick Up / Transporte Terrestre Origen', tipo: 'origen', afectoIGV: false, unidadMedida: 'CONT' },
  { id: 'thc_origen', nombre: 'THC Origen (OHC)', tipo: 'origen', afectoIGV: false, unidadMedida: 'CONT' },
  { id: 'doc_origen', nombre: 'Documentation Fee Origen', tipo: 'origen', afectoIGV: false, unidadMedida: 'BL' },
  { id: 'gate_in_origen', nombre: 'Gate In Origen', tipo: 'origen', afectoIGV: false, unidadMedida: 'CONT' },

  // ==========================================
  // GASTOS EN DESTINO (Locales) - Afecto a IGV
  // ==========================================
  { id: 'handling', nombre: 'Handling / Manipuleo', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },
  { id: 'gate_in', nombre: 'Gate In / Gate Out', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'gastos_operativos', nombre: 'Gastos Operativos / Comisión', tipo: 'destino', afectoIGV: true, unidadMedida: 'FIJO' },
  
  // 🔥 SEGURO EN DESTINO (Para cuando el agente lo cobra con IGV)
  { id: 'seguro_destino', nombre: 'Seguro de Carga (Cobrado en Destino + IGV)', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },
  
  { id: 'thc_destino', nombre: 'THC Destino (DHC)', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'doc_destino', nombre: 'Documentation Fee Destino (DO / DDF)', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },
  { id: 'bl_fee', nombre: 'BL Fee / Telex Release', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },
  { id: 'visto_bueno', nombre: 'Visto Bueno (V°B°)', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'almacenaje', nombre: 'Almacenaje Temporal', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'agenciamiento', nombre: 'Agenciamiento de Aduanas', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },
  { id: 'gate_out', nombre: 'Gate Out / Devolución Contenedor', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'transporte_local', nombre: 'Transporte Local (Puerto a Almacén)', tipo: 'destino', afectoIGV: true, unidadMedida: 'CONT' },
  { id: 'despacho_import', nombre: 'Desaduanamiento Importación', tipo: 'destino', afectoIGV: true, unidadMedida: 'BL' },

  // ==========================================
  // OPCIÓN MANUAL
  // ==========================================
  { id: 'manual', nombre: '-- Otro concepto (Manual) --', tipo: 'manual', afectoIGV: false, unidadMedida: 'FIJO' }
];