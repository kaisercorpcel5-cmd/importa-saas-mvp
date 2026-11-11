import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

const coleccionCotizaciones = collection(db, 'cotizacionesFlete');

export const obtenerCotizacionesPorExpediente = async (expedienteId) => {
  const q = query(coleccionCotizaciones, where("expedienteId", "==", expedienteId));
  const querySnapshot = await getDocs(q);
  const cotizaciones = [];
  querySnapshot.forEach((doc) => {
    cotizaciones.push({ id: doc.id, ...doc.data() });
  });
  return cotizaciones;
};

export const crearCotizacionFlete = async (datos) => {
  const docRef = await addDoc(coleccionCotizaciones, {
    ...datos,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// 🔥 NUEVA FUNCIÓN
export const actualizarCotizacionFlete = async (id, datos) => {
  const docRef = doc(db, 'cotizacionesFlete', id);
  await updateDoc(docRef, {
    ...datos,
    updatedAt: new Date().toISOString()
  });
};