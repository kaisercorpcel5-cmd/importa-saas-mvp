export const calcularAduanas = (fobTotalUSD, fleteUSD, seguroUSD, tipoCambio, adValoremPct = 0, percepcionPct = 0.035) => {
  // 1. Calcular CIF en USD
  const cifUSD = fobTotalUSD + fleteUSD + seguroUSD;
  
  // 2. Convertir CIF a Soles (SUNAT trabaja en PEN)
  const cifPEN = cifUSD * tipoCambio;

  // 3. Calcular Tributos en PEN
  const adValoremPEN = cifPEN * adValoremPct; // Asumimos 0% por Certificado de Origen
  const ipmPEN = cifPEN * 0.02; // IPM es 2% fijo
  const igvPEN = (cifPEN + adValoremPEN + ipmPEN) * 0.18; // IGV es 18%
  
  // 4. Percepción (por defecto 3.5% sobre CIF + Tributos)
  const basePercepcion = cifPEN + adValoremPEN + igvPEN + ipmPEN;
  const percepcionPEN = basePercepcion * percepcionPct;

  // 5. Total Derechos Aduaneros en PEN
  const totalDerechosPEN = adValoremPEN + ipmPEN + igvPEN + percepcionPEN;

  return {
    cifUSD,
    cifPEN,
    adValoremPEN,
    ipmPEN,
    igvPEN,
    percepcionPEN,
    totalDerechosPEN,
    totalDerechosUSD: totalDerechosPEN / tipoCambio
  };
};